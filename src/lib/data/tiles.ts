import "server-only"

import { sql } from "drizzle-orm"

import { crashFilterSql, roadUserCategorySql } from "@/lib/data/crash-sql"
import { getDb } from "@/lib/db"
import type { CrashFilters } from "@/lib/filters/crash-filters"
import {
  TILE_EXTENT,
  tilePixelMeters,
  tileWidthMeters,
  WEB_MERCATOR_WORLD_METERS,
  type Tile,
} from "@/lib/geo/tiles"
import {
  CRASH_CELLS_PER_TILE,
  CRASH_POINTS_MIN_ZOOM,
  COUNTIES_MIN_ZOOM,
  SOURCE_LAYERS,
} from "@/lib/layers/tile-config"

// Points within this many tile units of the edge are included in neighboring
// tiles too, so circles straddling a tile boundary aren't cut off.
const POINT_BUFFER = 64

const WEB_MERCATOR_HALF_WORLD = WEB_MERCATOR_WORLD_METERS / 2

// Safety valve: no tile ever carries more than this many crash points. The
// most severe crashes are kept so the cap degrades gracefully.
const MAX_POINTS_PER_TILE = 10_000

async function queryTile(query: ReturnType<typeof sql>): Promise<Uint8Array> {
  const [row] = await getDb().execute<{ mvt: Uint8Array | null }>(query)
  return row?.mvt ?? new Uint8Array()
}

/**
 * Crash tile. Below CRASH_POINTS_MIN_ZOOM crashes are aggregated into grid
 * cells so a tile's size is bounded by the grid, not by how many crashes fall
 * in it. At higher zooms individual crashes are sent.
 *
 * Each cell carries `density`: fatal crashes per 1,000 km² per year of the
 * selected range. Because it's a rate over true ground area, the same value
 * means the same thing at every zoom, latitude and year range, which raw
 * counts per cell (4× larger per zoom level out) would not.
 */
export function crashTile({ z, x, y }: Tile, filters: CrashFilters) {
  const where = crashFilterSql(filters)

  if (z < CRASH_POINTS_MIN_ZOOM) {
    const cell = tileWidthMeters(z) / CRASH_CELLS_PER_TILE
    const years = filters.to - filters.from + 1
    // Cell area in Web Mercator km²; scaled to true area by cos²(latitude).
    const cellKm2 = (cell / 1000) ** 2
    return queryTile(sql`
      WITH bounds AS (SELECT ST_TileEnvelope(${z}, ${x}, ${y}) AS env),
      cells AS (
        SELECT
          ST_Centroid(ST_Collect(c.geom_3857)) AS center,
          count(*)::int AS crashes,
          sum(c.fatalities)::int AS fatalities
        FROM crashes c, bounds b
        WHERE c.geom_3857 && b.env AND ${where}
        -- Cell index counted from the Web Mercator origin, so cell edges
        -- coincide with tile edges and no cell is split between tiles.
        GROUP BY
          floor((ST_X(c.geom_3857) + ${WEB_MERCATOR_HALF_WORLD}) / ${cell}),
          floor((ST_Y(c.geom_3857) + ${WEB_MERCATOR_HALF_WORLD}) / ${cell})
      ),
      features AS (
        SELECT ST_AsMVTGeom(cells.center, b.env, ${TILE_EXTENT}, 0, true) AS geom,
          cells.crashes,
          cells.fatalities,
          round((
            cells.crashes / ${years}::float8
            / (${cellKm2} * cos(radians(ST_Y(ST_Transform(cells.center, 4326)))) ^ 2)
            * 1000
          )::numeric, 2)::float8 AS density
        FROM cells, bounds b
      )
      SELECT ST_AsMVT(features, ${SOURCE_LAYERS.crashCells}, ${TILE_EXTENT}, 'geom') AS mvt
      FROM features WHERE geom IS NOT NULL
    `)
  }

  return queryTile(sql`
    WITH bounds AS (
      SELECT ST_TileEnvelope(${z}, ${x}, ${y}) AS env,
        ST_TileEnvelope(${z}, ${x}, ${y}, margin => ${POINT_BUFFER / TILE_EXTENT}) AS buffered
    ),
    features AS (
      SELECT
        ST_AsMVTGeom(c.geom_3857, b.env, ${TILE_EXTENT}, ${POINT_BUFFER}, true) AS geom,
        c.id,
        c.year,
        c.fatalities,
        ${roadUserCategorySql} AS road_user
      FROM crashes c, bounds b
      WHERE c.geom_3857 && b.buffered AND ${where}
      ORDER BY c.fatalities DESC, c.id
      LIMIT ${MAX_POINTS_PER_TILE}
    )
    SELECT ST_AsMVT(features, ${SOURCE_LAYERS.crashes}, ${TILE_EXTENT}, 'geom', 'id') AS mvt
    FROM features WHERE geom IS NOT NULL
  `)
}

/**
 * State and county outlines in one tile (two MVT layers). Geometry is clipped
 * to the tile first, then simplified to the tile's pixel size, so detail never
 * exceeds what can be drawn. Counties are omitted at national zooms.
 */
export function areasTile({ z, x, y }: Tile) {
  const tolerance = tilePixelMeters(z)
  const layer = (level: "state" | "county", name: string) => sql`
    SELECT coalesce(ST_AsMVT(f, ${name}, ${TILE_EXTENT}, 'geom'), ''::bytea) FROM (
      SELECT
        ST_AsMVTGeom(
          ST_SimplifyPreserveTopology(ST_ClipByBox2D(a.geom_3857, b.buffered), ${tolerance}),
          b.env, ${TILE_EXTENT}, ${POINT_BUFFER}, true
        ) AS geom,
        a.geoid, a.name, a.state_fips
      FROM areas a, bounds b
      WHERE a.level = ${level} AND a.geom_3857 && b.buffered
    ) f WHERE geom IS NOT NULL
  `
  return queryTile(sql`
    WITH bounds AS (
      SELECT ST_TileEnvelope(${z}, ${x}, ${y}) AS env,
        ST_TileEnvelope(${z}, ${x}, ${y}, margin => ${POINT_BUFFER / TILE_EXTENT}) AS buffered
    )
    SELECT (${layer("state", SOURCE_LAYERS.states)})
      || ${z >= COUNTIES_MIN_ZOOM ? sql`(${layer("county", SOURCE_LAYERS.counties)})` : sql`''::bytea`}
      AS mvt
  `)
}
