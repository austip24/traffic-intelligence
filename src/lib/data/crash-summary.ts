import "server-only"

import { sql } from "drizzle-orm"

import { crashFilterSql } from "@/lib/data/crash-sql"
import { getDb } from "@/lib/db"
import type { CrashFilters } from "@/lib/filters/crash-filters"
import type { CrashSummary } from "@/lib/api/schemas"

/**
 * National totals for the current filters, plus a per-year breakdown that
 * ignores the year range (it drives the time control's histogram).
 */
export async function getCrashSummary(filters: CrashFilters): Promise<CrashSummary> {
  const rows = await getDb().execute<{
    year: number
    crashes: number
    fatalities: number
    unlocated: number
  }>(sql`
    SELECT c.year,
      count(*)::int AS crashes,
      sum(c.fatalities)::int AS fatalities,
      count(*) FILTER (WHERE c.geom IS NULL)::int AS unlocated
    FROM crashes c
    WHERE ${crashFilterSql(filters, { includeYears: false })}
    GROUP BY c.year
    ORDER BY c.year
  `)

  const inRange = rows.filter((r) => r.year >= filters.from && r.year <= filters.to)
  const sum = (key: "crashes" | "fatalities" | "unlocated") =>
    inRange.reduce((total, r) => total + r[key], 0)

  return {
    crashes: sum("crashes"),
    fatalities: sum("fatalities"),
    unlocated: sum("unlocated"),
    byYear: rows.map(({ year, crashes, fatalities }) => ({ year, crashes, fatalities })),
  }
}
