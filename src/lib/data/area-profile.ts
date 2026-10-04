import "server-only"

import { sql } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"

import { getAreaTotals } from "@/lib/data/area-totals"
import {
  areaScopeSql,
  crashFilterSql,
  lightOptionSql,
  roadUserCategorySql,
} from "@/lib/data/crash-sql"
import { getDb } from "@/lib/db"
import type { AreaLevel } from "@/lib/domain/area"
import {
  CRASH_YEAR_MAX,
  CRASH_YEAR_MIN,
  type CrashFilters,
} from "@/lib/filters/crash-filters"
import {
  BREAKDOWN_DIMENSIONS,
  BREAKDOWN_KEYS,
  type AreaProfile,
  type BreakdownDimension,
} from "@/lib/api/schemas"
import { deathRate } from "@/lib/metrics/area-metrics"
import {
  nationalTotals,
  ratePercentile,
  scopeTotals,
} from "@/lib/metrics/build-area-metrics"

type ScopeStats = {
  trend: { year: number; crashes: number; deaths: number; population: number | null }[]
  breakdowns: { dimension: BreakdownDimension; key: string; crashes: number }[]
}

/**
 * Per-year trend (all years) and category breakdowns (selected years) for
 * one area, or the nation when `geoid` is null. Cached per scope and
 * filters: the national stats are shared by every area profile.
 */
async function getScopeStats(geoid: string | null, filters: CrashFilters): Promise<ScopeStats> {
  "use cache"
  cacheLife("days")
  cacheTag("datasets")

  const db = getDb()
  const scope = areaScopeSql(geoid)
  const population =
    geoid === null
      ? sql`SELECT p.year, sum(p.population)::float8 AS population
          FROM area_population p JOIN areas a ON a.geoid = p.geoid
          WHERE a.level = 'state' GROUP BY p.year`
      : sql`SELECT year, population::float8 AS population
          FROM area_population WHERE geoid = ${geoid}`

  const [trend, breakdowns] = await Promise.all([
    db.execute<{ year: number; crashes: number; deaths: number; population: number | null }>(sql`
      WITH counts AS (
        SELECT c.year, count(*)::int AS crashes, sum(c.fatalities)::int AS deaths
        FROM crashes c
        WHERE ${scope} AND ${crashFilterSql(filters, { includeYears: false })}
        GROUP BY c.year
      ),
      years AS (SELECT generate_series(${CRASH_YEAR_MIN}::int, ${CRASH_YEAR_MAX}::int) AS year),
      population AS (${population})
      SELECT y.year, coalesce(c.crashes, 0) AS crashes, coalesce(c.deaths, 0) AS deaths,
        p.population
      FROM years y
      LEFT JOIN counts c USING (year)
      LEFT JOIN population p USING (year)
      ORDER BY y.year
    `),
    db.execute<{ dimension: BreakdownDimension; key: string; crashes: number }>(sql`
      WITH matched AS (
        SELECT
          ${roadUserCategorySql} AS road_user,
          ${lightOptionSql()} AS light,
          c.functional_class AS road_class,
          c.rural_urban AS setting
        FROM crashes c
        WHERE ${scope} AND ${crashFilterSql(filters)}
      )
      SELECT
        CASE
          WHEN grouping(road_user) = 0 THEN 'road_user'
          WHEN grouping(light) = 0 THEN 'light'
          WHEN grouping(road_class) = 0 THEN 'road_class'
          ELSE 'setting'
        END AS dimension,
        coalesce(road_user, light, road_class, setting) AS key,
        count(*)::int AS crashes
      FROM matched
      GROUP BY GROUPING SETS ((road_user), (light), (road_class), (setting))
    `),
  ])

  return { trend: [...trend], breakdowns: [...breakdowns] }
}

const round2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100)

export async function getAreaProfile(
  geoid: string,
  filters: CrashFilters
): Promise<AreaProfile | null> {
  const [area] = await getDb().execute<{
    geoid: string
    level: AreaLevel
    name: string
    state_fips: string
  }>(sql`SELECT geoid, level, name, state_fips FROM areas WHERE geoid = ${geoid}`)
  if (!area) return null

  const [totals, own, nation] = await Promise.all([
    getAreaTotals(filters),
    getScopeStats(geoid, filters),
    getScopeStats(null, filters),
  ])

  const row = totals.find((r) => r.geoid === geoid)
  const stateRow = area.level === "county" ? totals.find((r) => r.geoid === area.state_fips) : null
  const peers = totals.filter((r) => r.level === area.level)
  const national = ratePercentile(geoid, peers)
  const inState =
    area.level === "county"
      ? ratePercentile(
          geoid,
          peers.filter((r) => r.stateFips === area.state_fips)
        )
      : null

  const nationalByYear = new Map(nation.trend.map((t) => [t.year, t]))
  const nationalCounts = new Map<string, number>()
  const nationalTotalsByDimension = new Map<BreakdownDimension, number>()
  for (const b of nation.breakdowns) {
    nationalCounts.set(`${b.dimension}:${b.key}`, b.crashes)
    nationalTotalsByDimension.set(
      b.dimension,
      (nationalTotalsByDimension.get(b.dimension) ?? 0) + b.crashes
    )
  }
  const ownCounts = new Map(own.breakdowns.map((b) => [`${b.dimension}:${b.key}`, b.crashes]))

  const latestPopulation = own.trend
    .filter((t) => t.year >= filters.from && t.year <= filters.to && t.population !== null)
    .at(-1)

  return {
    geoid: area.geoid,
    level: area.level,
    name: area.name,
    stateFips: area.state_fips,
    population: latestPopulation
      ? { year: latestPopulation.year, value: Math.round(latestPopulation.population as number) }
      : null,
    totals: row
      ? scopeTotals(row)
      : { crashes: 0, deaths: 0, rate: null, flag: 2 },
    state: stateRow ? scopeTotals(stateRow) : null,
    national: nationalTotals(totals),
    rank: national
      ? {
          peers: area.level === "county" ? "counties" : "states",
          national: national.percentile,
          nationalPeers: national.peers,
          inState: inState?.percentile ?? null,
          inStatePeers: inState?.peers ?? 0,
        }
      : null,
    trend: own.trend.map((t) => {
      const n = nationalByYear.get(t.year)
      return {
        year: t.year,
        crashes: t.crashes,
        deaths: t.deaths,
        rate: round2(t.population === null ? null : deathRate(t.deaths, t.population)),
        nationalRate: round2(
          n && n.population !== null ? deathRate(n.deaths, n.population) : null
        ),
      }
    }),
    breakdowns: BREAKDOWN_DIMENSIONS.map((dimension) => {
      const nationalTotal = nationalTotalsByDimension.get(dimension) ?? 0
      return {
        dimension,
        items: BREAKDOWN_KEYS[dimension].map((key) => ({
          key,
          crashes: ownCounts.get(`${dimension}:${key}`) ?? 0,
          nationalShare:
            nationalTotal > 0 ? (nationalCounts.get(`${dimension}:${key}`) ?? 0) / nationalTotal : 0,
        })),
      }
    }),
  }
}
