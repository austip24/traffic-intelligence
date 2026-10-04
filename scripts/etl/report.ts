/**
 * Prints a data-quality report for the loaded database and verifies the
 * Phase 2 acceptance checks. Exits non-zero if any check fails.
 *
 * Usage: pnpm etl:report
 */
import { sql } from "drizzle-orm"

import { datasets } from "@/lib/db/schema"

import { connect } from "./lib/db"

const MIN_LOCATED_SHARE = 0.98
const MAX_UNASSIGNED_SHARE = 0.0005

type YearQuality = {
  crashes: number
  fatalities: number
  located: number
  release: string
  countyMatch: { within: number; nearest: number; unassigned: number }
}

async function main() {
  const { db, close } = connect()
  const failures: string[] = []
  const check = (ok: boolean, message: string) => {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${message}`)
    if (!ok) failures.push(message)
  }

  try {
    console.log("\nDatasets")
    for (const d of await db.select().from(datasets).orderBy(datasets.id)) {
      console.log(`  ${d.id.padEnd(18)} ${d.version.padEnd(48)} ${d.rowCount} rows`)
    }

    const [farsMeta] = await db.select().from(datasets).where(sql`${datasets.id} = 'fars'`)
    const source = (farsMeta?.qualityReport ?? {}) as Record<string, YearQuality>

    const byYear = await db.execute<{
      year: number
      crashes: number
      fatalities: number
      located: number
      within: number
      nearest: number
      unassigned: number
    }>(sql`
      SELECT year,
        count(*)::int AS crashes,
        sum(fatalities)::int AS fatalities,
        count(geom)::int AS located,
        count(*) FILTER (WHERE county_match = 'within')::int AS within,
        count(*) FILTER (WHERE county_match = 'nearest')::int AS nearest,
        count(*) FILTER (WHERE geom IS NOT NULL AND county_geoid IS NULL)::int AS unassigned
      FROM crashes GROUP BY year ORDER BY year
    `)

    console.log("\nFARS by year (database vs. source files)")
    console.log("  year  crashes  fatalities  source fatalities  located  nearest  unassigned  release")
    for (const r of byYear) {
      const s = source[r.year]
      console.log(
        `  ${r.year}  ${String(r.crashes).padStart(7)}  ${String(r.fatalities).padStart(10)}  ` +
          `${String(s?.fatalities ?? "?").padStart(17)}  ${((r.located / r.crashes) * 100).toFixed(1).padStart(6)}%  ` +
          `${String(r.nearest).padStart(7)}  ${String(r.unassigned).padStart(10)}  ${s?.release ?? "?"}`
      )
    }

    const sizes = await db.execute<{ table: string; size: string; bytes: number }>(sql`
      SELECT relname AS table,
        pg_size_pretty(pg_total_relation_size(relid)) AS size,
        pg_total_relation_size(relid)::bigint AS bytes
      FROM pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC
    `)
    const total = sizes.reduce((sum, s) => sum + Number(s.bytes), 0)
    console.log("\nStorage (tables + indexes)")
    for (const s of sizes) console.log(`  ${s.table.padEnd(18)} ${s.size}`)
    console.log(`  ${"total".padEnd(18)} ${(total / 1_048_576).toFixed(0)} MB`)

    console.log("\nChecks")
    check(byYear.length === 15, `15 FARS years loaded (found ${byYear.length})`)
    for (const r of byYear) {
      const s = source[r.year]
      check(
        s !== undefined && r.fatalities === s.fatalities && r.crashes === s.crashes,
        `${r.year}: database totals match source file`
      )
    }
    const crashes = byYear.reduce((n, r) => n + r.crashes, 0)
    const located = byYear.reduce((n, r) => n + r.located, 0)
    const unassigned = byYear.reduce((n, r) => n + r.unassigned, 0)
    check(
      located / crashes >= MIN_LOCATED_SHARE,
      `≥ ${MIN_LOCATED_SHARE * 100}% of crashes located (${((located / crashes) * 100).toFixed(2)}%)`
    )
    // A few crashes per year have coordinates far outside their reported state
    // (offshore, or tens of km into a neighbor) and are deliberately left
    // without a county; they still appear on the map.
    check(
      unassigned / located <= MAX_UNASSIGNED_SHARE,
      `≥ ${(1 - MAX_UNASSIGNED_SHARE) * 100}% of located crashes assigned to a county ` +
        `(${unassigned} with inconsistent coordinates)`
    )

    const [pop] = await db.execute<{ states: number; counties: number }>(sql`
      SELECT
        count(DISTINCT p.geoid) FILTER (WHERE a.level = 'state')::int AS states,
        count(DISTINCT p.geoid) FILTER (WHERE a.level = 'county')::int AS counties
      FROM area_population p JOIN areas a USING (geoid)
    `)
    check(pop.states === 51, `population for all 51 states + DC (${pop.states})`)
  } finally {
    await close()
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed`)
    process.exit(1)
  }
  console.log("\nAll checks passed")
}

await main()
