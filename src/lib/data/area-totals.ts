import "server-only"

import { sql } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"

import { crashFilterSql } from "@/lib/data/crash-sql"
import { getDb } from "@/lib/db"
import type { AreaLevel } from "@/lib/domain/area"
import type { CrashFilters } from "@/lib/filters/crash-filters"
import type { AreaTotalsRow } from "@/lib/metrics/build-area-metrics"

/**
 * Crashes, deaths and person-years for every state and county under the
 * given filters, in one pass over the crashes table.
 *
 * Counties count crashes by their spatially assigned county; states count by
 * the FARS-reported state, so state totals include crashes without usable
 * coordinates. Cached because the metrics map, area profiles and rankings
 * all derive from it, and it only changes when the ETL runs.
 */
export async function getAreaTotals(filters: CrashFilters): Promise<AreaTotalsRow[]> {
  "use cache"
  cacheLife("days")
  cacheTag("datasets")

  const years = filters.to - filters.from + 1
  const rows = await getDb().execute<{
    geoid: string
    level: AreaLevel
    state_fips: string
    crashes: number
    deaths: number
    person_years: number | null
  }>(sql`
    WITH totals AS (
      SELECT
        CASE WHEN grouping(c.county_geoid) = 0 THEN c.county_geoid ELSE c.state_fips END AS geoid,
        count(*)::int AS crashes,
        sum(c.fatalities)::int AS deaths
      FROM crashes c
      WHERE ${crashFilterSql(filters)}
      GROUP BY GROUPING SETS ((c.state_fips), (c.county_geoid))
    ),
    population AS (
      SELECT geoid, sum(population)::float8 AS person_years, count(*)::int AS years
      FROM area_population
      WHERE year BETWEEN ${filters.from} AND ${filters.to}
      GROUP BY geoid
    )
    SELECT a.geoid, a.level, a.state_fips,
      coalesce(t.crashes, 0) AS crashes,
      coalesce(t.deaths, 0) AS deaths,
      -- A rate over a partial set of years would be biased; require all.
      CASE WHEN p.years = ${years} THEN p.person_years END AS person_years
    FROM areas a
    LEFT JOIN totals t ON t.geoid = a.geoid
    LEFT JOIN population p ON p.geoid = a.geoid
    ORDER BY a.geoid
  `)

  return rows.map((r) => ({
    geoid: r.geoid,
    level: r.level,
    stateFips: r.state_fips,
    crashes: r.crashes,
    deaths: r.deaths,
    personYears: r.person_years,
  }))
}
