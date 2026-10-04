/**
 * Loads Census Population Estimates (July 1) for states and counties, 2010–2024,
 * used to compute per-capita crash rates for the matching year.
 *
 * Usage: pnpm etl:population
 *
 * Gaps are expected and reported, not filled: e.g. Connecticut's 2010–2019
 * estimates use its former counties, which no longer exist in the 2024
 * boundaries (now planning regions), so CT county rates are unavailable then.
 */
import { readFile } from "node:fs/promises"
import { sql } from "drizzle-orm"

import { areaPopulation, areas } from "@/lib/db/schema"

import { readCsv } from "./lib/csv"
import { chunks, connect } from "./lib/db"
import { upsertDataset } from "./lib/datasets"
import { rawPath } from "./lib/download"
import { POPULATION_SOURCES } from "./sources"

type PopulationRow = typeof areaPopulation.$inferInsert

// Each vintage covers different years; 2020 comes from the newer vintage.
const VINTAGES = [
  { source: POPULATION_SOURCES.v2020, years: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019] },
  { source: POPULATION_SOURCES.v2024, years: [2020, 2021, 2022, 2023, 2024] },
]

const SUMLEV_STATE = "040"
const SUMLEV_COUNTY = "050"

async function readEstimates(): Promise<PopulationRow[]> {
  const rows: PopulationRow[] = []
  for (const { source, years } of VINTAGES) {
    const bytes = new Uint8Array(await readFile(rawPath(source)))
    const columns = ["SUMLEV", "STATE", "COUNTY", ...years.map((y) => `POPESTIMATE${y}`)]
    for await (const r of readCsv(bytes, columns)) {
      if (r.SUMLEV !== SUMLEV_STATE && r.SUMLEV !== SUMLEV_COUNTY) continue
      const geoid = r.SUMLEV === SUMLEV_STATE ? r.STATE : `${r.STATE}${r.COUNTY}`
      for (const year of years) {
        const population = Number(r[`POPESTIMATE${year}`])
        if (Number.isInteger(population) && population > 0) {
          rows.push({ geoid, year, population, source: source.id })
        }
      }
    }
  }
  return rows
}

async function main() {
  const estimates = await readEstimates()
  const { db, close } = connect()
  try {
    const known = new Set((await db.select({ geoid: areas.geoid }).from(areas)).map((a) => a.geoid))
    if (known.size === 0) throw new Error("No areas loaded. Run `pnpm etl:boundaries` first.")

    const rows = estimates.filter((r) => known.has(r.geoid))
    const skipped = estimates.filter((r) => !known.has(r.geoid))
    const skippedGeoids = [...new Set(skipped.map((r) => r.geoid))].sort()

    await db.transaction(async (tx) => {
      await tx.delete(areaPopulation)
      for (const batch of chunks(rows, 5000)) await tx.insert(areaPopulation).values(batch)
    })

    // Areas with any missing year will have gaps in their rate series.
    const gaps = await db.execute<{ geoid: string; missing: number }>(sql`
      SELECT a.geoid, 15 - count(p.year)::int AS missing
      FROM areas a LEFT JOIN area_population p ON p.geoid = a.geoid
      GROUP BY a.geoid HAVING count(p.year) < 15
      ORDER BY a.geoid
    `)

    console.log(`loaded ${rows.length} estimates for ${known.size} areas`)
    console.log(`skipped ${skipped.length} estimates for areas not in current boundaries: ${skippedGeoids.join(", ")}`)
    console.log(`${gaps.length} areas have missing years: ${gaps.map((g) => `${g.geoid}(-${g.missing})`).join(", ")}`)

    await upsertDataset(db, {
      id: "census-population",
      name: "Population Estimates Program (PEP), county totals",
      publisher: "U.S. Census Bureau",
      version: "Vintage 2020 (2010–2019) + Vintage 2024 (2020–2024)",
      sourceUrl: "https://www2.census.gov/programs-surveys/popest/datasets/",
      license: "Public domain (U.S. Government work)",
      attribution: "U.S. Census Bureau, Population Estimates Program",
      rowCount: rows.length,
      notes:
        "July 1 estimates. Areas whose boundaries changed (e.g. Connecticut planning regions, 2022) lack estimates for earlier years.",
      qualityReport: {
        skippedGeoids,
        areasWithGaps: gaps.map((g) => ({ geoid: g.geoid, missingYears: g.missing })),
      },
      retrievedAt: new Date(),
    })
  } finally {
    await close()
  }
}

await main()
