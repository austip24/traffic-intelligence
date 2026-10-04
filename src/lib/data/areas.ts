import "server-only"

import { sql } from "drizzle-orm"

import { bboxSql, toBBox } from "@/lib/data/area-sql"
import { getDb } from "@/lib/db"
import { STATES, type AreaLevel } from "@/lib/domain/area"
import type { AreaInfo, SearchResult } from "@/lib/api/schemas"

// Outline simplification: about 1/2000 of the area's extent, so every outline
// has similar detail on screen when the map is fit to it (≤110 KB, Alaska),
// with a floor so small counties stay accurate at street zooms.
const OUTLINE_DETAIL = 2000
const OUTLINE_MIN_TOLERANCE: Record<AreaLevel, number> = { county: 0.0001, state: 0.002 }

/** Name, extent and a simplified outline (for the selection highlight). */
export async function getAreaInfo(geoid: string): Promise<AreaInfo | null> {
  const [row] = await getDb().execute<{
    geoid: string
    level: AreaLevel
    name: string
    state_fips: string
    land_km2: number
    bbox: number[]
    outline: string
  }>(sql`
    WITH a AS (
      SELECT geoid, level, name, state_fips, land_area_m2, geom,
        ${bboxSql(sql`geom`)} AS bbox
      FROM areas WHERE geoid = ${geoid}
    )
    SELECT a.geoid, a.level, a.name, a.state_fips, a.bbox,
      a.land_area_m2 / 1e6::float8 AS land_km2,
      ST_AsGeoJSON(
        ST_Multi(ST_SimplifyPreserveTopology(
          a.geom,
          greatest(
            CASE a.level WHEN 'state' THEN ${OUTLINE_MIN_TOLERANCE.state}::float8
              ELSE ${OUTLINE_MIN_TOLERANCE.county}::float8 END,
            greatest(a.bbox[3] - a.bbox[1], a.bbox[4] - a.bbox[2]) / ${OUTLINE_DETAIL}
          )
        )),
        5
      ) AS outline
    FROM a
  `)
  if (!row) return null

  return {
    geoid: row.geoid,
    level: row.level,
    name: row.name,
    stateFips: row.state_fips,
    landAreaKm2: Math.round(row.land_km2),
    bbox: toBBox(row.bbox),
    outline: JSON.parse(row.outline),
  }
}

const MAX_RESULTS = 8

/** Escapes LIKE wildcards so user input only ever matches literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/**
 * A trailing state name or abbreviation narrows the search, so "cook il" and
 * "Cook, Illinois" both find Cook County, IL.
 */
export function splitStateQualifier(query: string): { text: string; stateFips: string | null } {
  const normalized = query.replace(/,/g, " ").replace(/\s+/g, " ").trim()
  const lower = normalized.toLowerCase()
  for (const [fips, state] of Object.entries(STATES)) {
    for (const suffix of [state.name.toLowerCase(), state.abbr.toLowerCase()]) {
      if (lower.endsWith(` ${suffix}`)) {
        return { text: normalized.slice(0, -suffix.length - 1).trim(), stateFips: fips }
      }
    }
  }
  return { text: normalized, stateFips: null }
}

/**
 * States and counties by name. Prefix matches rank first, then trigram
 * similarity (tolerates typos like "Los Angelos"), then states before
 * counties. Every value is a bound parameter.
 */
export async function searchAreas(query: string): Promise<SearchResult[]> {
  const { text, stateFips } = splitStateQualifier(query)
  if (text.length === 0) return []
  const prefix = `${escapeLike(text)}%`
  const word = `% ${escapeLike(text)}%`

  const rows = await getDb().execute<{
    geoid: string
    level: AreaLevel
    name: string
    state_fips: string
    bbox: number[]
  }>(sql`
    SELECT a.geoid, a.level, a.name, a.state_fips, ${bboxSql(sql`a.geom`)} AS bbox
    FROM areas a
    WHERE (a.name ILIKE ${prefix} OR a.name ILIKE ${word} OR a.name % ${text})
      ${stateFips ? sql`AND a.state_fips = ${stateFips}` : sql``}
    ORDER BY
      (a.name ILIKE ${prefix}) DESC,
      similarity(a.name, ${text}) DESC,
      (a.level = 'state') DESC,
      a.name
    LIMIT ${MAX_RESULTS}
  `)

  return rows.map((r) => ({
    geoid: r.geoid,
    level: r.level,
    name: r.name,
    stateFips: r.state_fips,
    bbox: toBBox(r.bbox),
  }))
}
