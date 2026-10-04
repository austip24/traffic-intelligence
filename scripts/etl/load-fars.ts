/**
 * Loads NHTSA FARS crashes and people into PostGIS, one year per transaction
 * and one child process per year. Re-running a year replaces it, so loads are
 * idempotent and a crashed worker can simply be retried.
 *
 * Usage: pnpm etl:fars [--years 2010-2024] [--dry-run | --assign-only]
 *   --dry-run      parse and validate only; prints the quality report, no DB needed
 *   --assign-only  re-run county assignment for already-loaded years
 */
import { count, eq, sql } from "drizzle-orm"

import { crashes, crashPeople, datasets } from "@/lib/db/schema"

import { extractYear, type FarsYear } from "./fars/extract"
import { hasFlag, parseYears } from "./lib/args"
import { chunks, connect, type Db } from "./lib/db"
import { getQualityReport, upsertDataset } from "./lib/datasets"
import { emitResult, runIsolated } from "./lib/isolate"
import { FARS_LATEST_FINAL_YEAR, FARS_YEARS } from "./sources"

// Crashes outside every county polygon of their state (bridges and causeways
// beyond the generalized 1:500k coastline, state-line roads) are matched to
// the state's nearest county within this distance. The Florida Keys' Overseas
// Highway runs up to ~5 km from generalized land.
const NEAREST_COUNTY_MAX_METERS = 10_000

const years = parseYears(process.argv, FARS_YEARS)
const dryRun = hasFlag(process.argv, "--dry-run")

function summarize({ year, quality: q }: FarsYear) {
  const pct = (n: number) => `${((n / q.crashes) * 100).toFixed(1)}%`
  const unmapped = Object.entries(q.unmappedCodes)
  const rejected = Object.entries(q.rejected)
  console.log(
    `${year}: ${q.crashes} crashes, ${q.fatalities} fatalities, ${q.people} people, ` +
      `located ${pct(q.located)}, unknown hour ${pct(q.unknownHour)}` +
      (rejected.length ? `, rejected ${JSON.stringify(q.rejected)}` : "") +
      (q.duplicatePeople ? `, duplicate people ${q.duplicatePeople}` : "") +
      (unmapped.length ? `\n      unmapped codes ${JSON.stringify(q.unmappedCodes)}` : "")
  )
}

async function loadYear(db: Db, data: FarsYear) {
  const { year } = data
  return db.transaction(async (tx) => {
    // Cascades to crash_people.
    await tx.delete(crashes).where(eq(crashes.year, year))

    for (const batch of chunks(data.crashes, 1000)) {
      await tx.insert(crashes).values(batch)
    }
    for (const batch of chunks(data.people, 4000)) {
      await tx.insert(crashPeople).values(batch)
    }
    // Statistics don't yet reflect the rows just inserted; without this the
    // planner assumes the year is empty and picks a pathological plan.
    await tx.execute(sql`ANALYZE crashes`)
    return assignCounties(tx, year)
  })
}

type CountyMatchSummary = { within: number; nearest: number; unassigned: number }

/**
 * Assigns counties spatially, never from FARS county codes, so every year
 * uses the same 2024 county definitions. Matches are restricted to the
 * FARS-reported state: the state code is administrative and reliable, while
 * coordinates on a state line routinely fall a few meters into the neighbor
 * at 1:500k generalization. This also keeps county totals summing to state
 * totals. Crashes left unassigned keep their point but have inconsistent
 * coordinates (e.g. offshore or deep inside another state) and are reported.
 */
async function assignCounties(
  tx: Pick<Db, "execute">,
  year: number
): Promise<CountyMatchSummary> {
  // One UPDATE that only touches rows whose assignment changes. Every UPDATE
  // leaves a dead row version behind, and the database has a hard size cap.
  await tx.execute(sql`
    WITH located AS (
      SELECT id, geom, state_fips FROM crashes
      WHERE year = ${year} AND geom IS NOT NULL
    ),
    -- LATERAL makes each point probe the GiST index on areas.geom; a plain
    -- join let the planner test every county in the state instead.
    -- LIMIT 1: a point exactly on a shared border touches two counties.
    within AS (
      SELECT l.id, w.geoid
      FROM located l
      CROSS JOIN LATERAL (
        SELECT a.geoid FROM areas a
        WHERE a.level = 'county' AND a.state_fips = l.state_fips
          AND ST_Intersects(a.geom, l.geom)
        ORDER BY a.geoid
        LIMIT 1
      ) w
    ),
    -- MATERIALIZED forces the anti-join to run first, so the expensive
    -- nearest-county lookup only runs for the few dozen unmatched crashes
    -- per year rather than for every located crash.
    unmatched AS MATERIALIZED (
      SELECT l.id, l.geom, l.state_fips
      FROM located l LEFT JOIN within w USING (id)
      WHERE w.id IS NULL
    ),
    nearest AS (
      SELECT u.id, n.geoid
      FROM unmatched u
      CROSS JOIN LATERAL (
        SELECT a.geoid, ST_Distance(a.geom::geography, u.geom::geography) AS meters
        FROM areas a
        WHERE a.level = 'county' AND a.state_fips = u.state_fips
        ORDER BY a.geom <-> u.geom
        LIMIT 1
      ) n
      WHERE n.meters <= ${NEAREST_COUNTY_MAX_METERS}
    ),
    target AS (
      SELECT c.id, m.geoid, m.match
      FROM crashes c
      LEFT JOIN (
        SELECT id, geoid, 'within' AS match FROM within
        UNION ALL
        SELECT id, geoid, 'nearest' AS match FROM nearest
      ) m USING (id)
      WHERE c.year = ${year}
    )
    UPDATE crashes c
    SET county_geoid = t.geoid, county_match = t.match
    FROM target t
    WHERE c.id = t.id
      AND (c.county_geoid IS DISTINCT FROM t.geoid OR c.county_match IS DISTINCT FROM t.match)
  `)

  const [summary] = await tx.execute<CountyMatchSummary>(sql`
    SELECT
      count(*) FILTER (WHERE county_match = 'within')::int AS within,
      count(*) FILTER (WHERE county_match = 'nearest')::int AS nearest,
      count(*) FILTER (WHERE geom IS NOT NULL AND county_geoid IS NULL)::int AS unassigned
    FROM crashes WHERE year = ${year}
  `)
  return summary
}

type YearResult = FarsYear["quality"] & { countyMatch?: CountyMatchSummary }

/** Worker mode: one year, in its own process (see lib/isolate.ts). */
async function runWorker(year: number) {
  const data = await extractYear(year)
  summarize(data)
  if (dryRun) return emitResult(data.quality satisfies YearResult)

  const { db, close } = connect()
  try {
    const countyMatch = await loadYear(db, data)
    await reclaimSpace(db)
    console.log(`      county match ${JSON.stringify(countyMatch)}`)
    emitResult({ ...data.quality, countyMatch } satisfies YearResult)
  } finally {
    await close()
  }
}

/**
 * Makes dead row versions from the replaced year and the county UPDATE
 * reusable before the next year is written. Vercel Postgres/Neon enforces a
 * hard project size limit, and autovacuum may not keep up with a bulk load.
 * Must run outside a transaction.
 */
async function reclaimSpace(db: Db) {
  await db.execute(sql`VACUUM (ANALYZE) crashes, crash_people`)
}

async function main() {
  if (hasFlag(process.argv, "--worker")) return runWorker(years[0])

  const workerArgs = (year: number) => [
    "--worker",
    "--years",
    String(year),
    ...(dryRun ? ["--dry-run"] : []),
  ]

  if (dryRun) {
    for (const year of years) {
      await runIsolated<YearResult>(workerArgs(year), { label: `FARS ${year}` })
    }
    return
  }

  const { db, close } = connect()
  try {
    const [{ areas }] = await db.execute<{ areas: number }>(
      sql`SELECT count(*)::int AS areas FROM areas WHERE level = 'county'`
    )
    if (!areas) throw new Error("No counties loaded. Run `pnpm etl:boundaries` first.")

    const report = await getQualityReport(db, "fars")

    // Re-run county assignment only (e.g. after reloading boundaries or
    // changing the matching rule) without re-parsing or re-inserting crashes.
    if (hasFlag(process.argv, "--assign-only")) {
      for (const year of years) {
        const countyMatch = await db.transaction((tx) => assignCounties(tx, year))
        await reclaimSpace(db)
        console.log(`${year}: county match ${JSON.stringify(countyMatch)}`)
        report[year] = { ...(report[year] as object), countyMatch }
      }
      await db
        .update(datasets)
        .set({ qualityReport: report })
        .where(eq(datasets.id, "fars"))
      return
    }

    for (const year of years) {
      const result = await runIsolated<YearResult>(workerArgs(year), {
        label: `FARS ${year}`,
      })
      report[year] = {
        ...result,
        release: year > FARS_LATEST_FINAL_YEAR ? "Annual Report File (preliminary)" : "Final",
      }
    }

    const [{ total }] = await db.select({ total: count() }).from(crashes)
    const loadedYears = Object.keys(report).map(Number).sort()
    await upsertDataset(db, {
      id: "fars",
      name: "Fatality Analysis Reporting System (FARS)",
      publisher: "National Highway Traffic Safety Administration (NHTSA)",
      version: `${loadedYears[0]}–${loadedYears.at(-1)}`,
      sourceUrl: "https://www.nhtsa.gov/file-downloads?p=nhtsa/downloads/FARS/",
      license: "Public domain (U.S. Government work)",
      attribution: "NHTSA Fatality Analysis Reporting System (FARS)",
      rowCount: total,
      notes:
        `Years after ${FARS_LATEST_FINAL_YEAR} are preliminary Annual Report Files and may be revised. ` +
        "Counties are assigned by spatial join to Census 2024 boundaries.",
      qualityReport: report,
      retrievedAt: new Date(),
    })
  } finally {
    await close()
  }
}

await main()
