import type { AreaFlagCode, AreaMetrics, LevelMetrics, ScopeTotals } from "@/lib/api/schemas"
import type { AreaLevel } from "@/lib/domain/area"
import { quantileBreaks } from "@/lib/geo/classify"
import {
  AREA_METRIC_INFO,
  deathRate,
  MIN_DEATHS_FOR_STABLE_RATE,
  type AreaMetric,
} from "@/lib/metrics/area-metrics"

/** Crash totals for one area over the selected years and filters. */
export type AreaTotalsRow = {
  geoid: string
  level: AreaLevel
  stateFips: string
  crashes: number
  deaths: number
  /** Sum of yearly population over the selected years; null if any year is missing. */
  personYears: number | null
}

/** Quantile classes on the map; five keeps classes distinguishable without color expertise. */
export const CHOROPLETH_CLASSES = 5

export function flagFor(deaths: number, personYears: number | null): AreaFlagCode {
  if (personYears === null) return 2
  if (deaths < MIN_DEATHS_FOR_STABLE_RATE) return 1
  return 0
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function scopeTotals(row: Omit<AreaTotalsRow, "geoid" | "level" | "stateFips">): ScopeTotals {
  const rate = row.personYears === null ? null : deathRate(row.deaths, row.personYears)
  return {
    crashes: row.crashes,
    deaths: row.deaths,
    rate: rate === null ? null : round2(rate),
    flag: flagFor(row.deaths, row.personYears),
  }
}

/** Nationwide totals: the sum over states (which include crashes without a county). */
export function nationalTotals(rows: readonly AreaTotalsRow[]): ScopeTotals {
  const states = rows.filter((r) => r.level === "state")
  const personYears = states.some((r) => r.personYears === null)
    ? null
    : states.reduce((sum, r) => sum + (r.personYears ?? 0), 0)
  return scopeTotals({
    crashes: states.reduce((sum, r) => sum + r.crashes, 0),
    deaths: states.reduce((sum, r) => sum + r.deaths, 0),
    personYears,
  })
}

function levelMetrics(rows: readonly AreaTotalsRow[], metric: AreaMetric): LevelMetrics {
  const areas: LevelMetrics["areas"] = rows.map((row) => {
    if (metric !== "rate") return [row.geoid, row[metric], 0]
    const totals = scopeTotals(row)
    return [row.geoid, totals.rate, totals.flag]
  })
  // Unstable rates are the noisiest values; letting them set the breaks would
  // stretch the scale around outliers.
  const forBreaks = areas.filter(([, value, flag]) => value !== null && flag === 0)
  return {
    breaks: quantileBreaks(
      forBreaks.map(([, value]) => value as number),
      CHOROPLETH_CLASSES,
      { integer: AREA_METRIC_INFO[metric].integer }
    ),
    areas,
  }
}

export function buildAreaMetrics(rows: readonly AreaTotalsRow[], metric: AreaMetric): AreaMetrics {
  return {
    metric,
    state: levelMetrics(rows.filter((r) => r.level === "state"), metric),
    county: levelMetrics(rows.filter((r) => r.level === "county"), metric),
  }
}

/**
 * Share of peers with a lower rate, 0–1, among peers with a stable rate.
 * Null when the area itself has no stable rate.
 */
export function ratePercentile(
  geoid: string,
  peers: readonly AreaTotalsRow[]
): { percentile: number; peers: number } | null {
  const rated = peers
    .map((row) => ({ geoid: row.geoid, ...scopeTotals(row) }))
    .filter((t) => t.flag === 0 && t.rate !== null)
  const self = rated.find((t) => t.geoid === geoid)
  if (!self || rated.length < 2) return null
  const lower = rated.filter((t) => (t.rate as number) < (self.rate as number)).length
  return { percentile: lower / (rated.length - 1), peers: rated.length }
}
