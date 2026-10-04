import "server-only"

import { sql } from "drizzle-orm"

import { crashFilterSql, roadUserCategorySql } from "@/lib/data/crash-sql"
import { getDb } from "@/lib/db"
import { ROAD_USER_CATEGORY, type RoadUserCategory } from "@/lib/domain/crash"
import type { CrashFilters } from "@/lib/filters/crash-filters"
import type { ViewportSummary } from "@/lib/api/schemas"
import type { BBox } from "@/types/geo"

const TOP_COUNTIES = 5

/**
 * Located crashes inside a bounding box (EPSG:4326). The box is transformed
 * once to Web Mercator so the GiST index on geom_3857 is used.
 */
export async function getViewportSummary(
  bbox: BBox,
  filters: CrashFilters
): Promise<ViewportSummary> {
  const [minLng, minLat, maxLng, maxLat] = bbox
  const [row] = await getDb().execute<{
    crashes: number
    deaths: number
    by_road_user: Record<RoadUserCategory, number> | null
    top_counties: ViewportSummary["topCounties"]
  }>(sql`
    WITH matched AS MATERIALIZED (
      SELECT c.county_geoid, c.fatalities, ${roadUserCategorySql} AS road_user
      FROM crashes c
      WHERE c.geom_3857 && ST_Transform(
          ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326), 3857)
        AND ${crashFilterSql(filters)}
    ),
    by_user AS (
      SELECT road_user, count(*)::int AS crashes FROM matched GROUP BY road_user
    ),
    top AS (
      SELECT county_geoid AS geoid, count(*)::int AS crashes, sum(fatalities)::int AS deaths
      FROM matched
      WHERE county_geoid IS NOT NULL
      GROUP BY county_geoid
      ORDER BY deaths DESC, crashes DESC, county_geoid
      LIMIT ${TOP_COUNTIES}
    )
    SELECT
      (SELECT count(*)::int FROM matched) AS crashes,
      (SELECT coalesce(sum(fatalities), 0)::int FROM matched) AS deaths,
      (SELECT json_object_agg(road_user, crashes) FROM by_user) AS by_road_user,
      coalesce((
        SELECT json_agg(json_build_object(
            'geoid', top.geoid, 'name', a.name, 'stateFips', a.state_fips,
            'crashes', top.crashes, 'deaths', top.deaths)
          ORDER BY top.deaths DESC, top.crashes DESC, top.geoid)
        FROM top JOIN areas a ON a.geoid = top.geoid
      ), '[]'::json) AS top_counties
  `)

  return {
    crashes: row.crashes,
    deaths: row.deaths,
    byRoadUser: ROAD_USER_CATEGORY.values.map((key) => ({
      key,
      crashes: row.by_road_user?.[key] ?? 0,
    })),
    topCounties: row.top_counties,
  }
}
