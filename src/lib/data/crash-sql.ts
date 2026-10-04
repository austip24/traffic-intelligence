import "server-only"

import { sql, type SQL } from "drizzle-orm"

import {
  LIGHT_OPTIONS,
  type CrashFilters,
  type RoadUser,
} from "@/lib/filters/crash-filters"

const ROAD_USER_COLUMN: Record<RoadUser, string> = {
  pedestrian: "involves_pedestrian",
  bicyclist: "involves_bicyclist",
  motorcyclist: "involves_motorcyclist",
}

function inList(column: SQL, values: readonly string[]): SQL {
  return sql`${column} IN (${sql.join(values.map((v) => sql`${v}`), sql`, `)})`
}

/**
 * WHERE clause for crash filters against `crashes` aliased as `c`. Every value
 * is a bound parameter; column names come from constants, never from input.
 * Pass `includeYears: false` for per-year breakdowns across the full range.
 */
export function crashFilterSql(
  filters: CrashFilters,
  { includeYears = true } = {}
): SQL {
  const conditions: SQL[] = []

  if (includeYears) {
    conditions.push(sql`c.year BETWEEN ${filters.from} AND ${filters.to}`)
  }
  if (filters.roadUsers.length > 0) {
    const any = filters.roadUsers.map((u) => sql.raw(`c.${ROAD_USER_COLUMN[u]}`))
    conditions.push(sql`(${sql.join(any, sql` OR `)})`)
  }
  if (filters.light.length > 0) {
    const conditionsForLight = filters.light.flatMap((o) => LIGHT_OPTIONS.conditions[o])
    conditions.push(inList(sql`c.light_condition`, conditionsForLight))
  }
  if (filters.settings.length > 0) {
    conditions.push(inList(sql`c.rural_urban`, filters.settings))
  }
  if (filters.roadClasses.length > 0) {
    conditions.push(inList(sql`c.functional_class`, filters.roadClasses))
  }

  return conditions.length > 0 ? sql.join(conditions, sql` AND `) : sql`TRUE`
}

/**
 * One road-user category per crash (alias `c`), vulnerable users first. Used
 * wherever crashes are colored or counted by road user, so the map, legend
 * and breakdowns always agree. Values match `RoadUserCategory`.
 */
export const roadUserCategorySql = sql`CASE
  WHEN c.involves_pedestrian THEN 'pedestrian'
  WHEN c.involves_bicyclist THEN 'bicyclist'
  WHEN c.involves_motorcyclist THEN 'motorcyclist'
  ELSE 'vehicle'
END`

/** The light filter option a crash falls under (alias `c`), or 'other'. */
export function lightOptionSql(): SQL {
  const branches = LIGHT_OPTIONS.values.map(
    (option) =>
      sql`WHEN c.light_condition IN (${sql.join(
        LIGHT_OPTIONS.conditions[option].map((v) => sql`${v}`),
        sql`, `
      )}) THEN ${option}`
  )
  return sql`CASE ${sql.join(branches, sql` `)} ELSE 'other' END`
}

/** Which crashes count toward an area: by assigned county, or by FARS state. */
export function areaScopeSql(geoid: string | null): SQL {
  if (geoid === null) return sql`TRUE`
  return geoid.length === 2 ? sql`c.state_fips = ${geoid}` : sql`c.county_geoid = ${geoid}`
}
