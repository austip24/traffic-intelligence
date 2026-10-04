/**
 * Catalog of public source files used by the ETL. Every file is a direct,
 * unauthenticated download so another developer can reproduce the database.
 */

export const FARS_YEARS = Array.from({ length: 15 }, (_, i) => 2010 + i) // 2010–2024

// FARS releases the most recent year as a preliminary Annual Report File
// (ARF); older years are final. Defined with the app's filters so the UI's
// "preliminary" labels and the ETL's dataset notes can't drift apart.
export { CRASH_FINAL_YEAR as FARS_LATEST_FINAL_YEAR } from "@/lib/filters/crash-filters"

// One TIGER vintage is used for every year so county joins are consistent.
// 2024 boundaries include Connecticut's planning regions (09110–09190).
export const TIGER_VINTAGE = 2024

export type SourceFile = {
  id: string
  url: string
  /** Path under .data/raw/ */
  fileName: string
}

export function farsSource(year: number): SourceFile {
  return {
    id: `fars-${year}`,
    url: `https://static.nhtsa.gov/nhtsa/downloads/FARS/${year}/National/FARS${year}NationalCSV.zip`,
    fileName: `FARS${year}NationalCSV.zip`,
  }
}

export function tigerSource(level: "state" | "county"): SourceFile {
  const name = `cb_${TIGER_VINTAGE}_us_${level}_500k`
  return {
    id: `tiger-${level}`,
    url: `https://www2.census.gov/geo/tiger/GENZ${TIGER_VINTAGE}/shp/${name}.zip`,
    fileName: `${name}.zip`,
  }
}

/**
 * Census Population Estimates Program (PEP). Two vintages cover 2010–2024:
 * - Vintage 2020: July 1 estimates for 2010–2020 (pre-2022 CT counties)
 * - Vintage 2024: July 1 estimates for 2020–2024 (CT planning regions)
 */
export const POPULATION_SOURCES = {
  v2020: {
    id: "pep-v2020",
    url: "https://www2.census.gov/programs-surveys/popest/datasets/2010-2020/counties/totals/co-est2020-alldata.csv",
    fileName: "co-est2020-alldata.csv",
  },
  v2024: {
    id: "pep-v2024",
    url: "https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/counties/totals/co-est2024-alldata.csv",
    fileName: "co-est2024-alldata.csv",
  },
} satisfies Record<string, SourceFile>

export function allSources(): SourceFile[] {
  return [
    tigerSource("state"),
    tigerSource("county"),
    POPULATION_SOURCES.v2020,
    POPULATION_SOURCES.v2024,
    ...FARS_YEARS.map(farsSource),
  ]
}
