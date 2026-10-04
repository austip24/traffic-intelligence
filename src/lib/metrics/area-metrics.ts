/**
 * Metrics an area (state or county) can be compared by. Shared by the
 * metrics API, the choropleth layer, its legend and the area profile.
 */
import { formatInteger } from "@/lib/format"

export const AREA_METRICS = ["rate", "deaths", "crashes"] as const
export type AreaMetric = (typeof AREA_METRICS)[number]

export const DEFAULT_AREA_METRIC: AreaMetric = "rate"

export const AREA_METRIC_INFO: Record<
  AreaMetric,
  { label: string; legendTitle: string; integer: boolean; format: (v: number) => string }
> = {
  rate: {
    label: "Deaths per 100,000 residents",
    legendTitle: "Deaths per 100,000 residents per year",
    integer: false,
    format: (v) => v.toLocaleString("en-US", { maximumFractionDigits: v < 10 ? 1 : 0 }),
  },
  deaths: {
    label: "Deaths",
    legendTitle: "Traffic deaths",
    integer: true,
    format: formatInteger,
  },
  crashes: {
    label: "Fatal crashes",
    legendTitle: "Fatal crashes",
    integer: true,
    format: formatInteger,
  },
}

/**
 * Below this many deaths a rate swings widely from year to year by chance
 * (one more death can double it), so it's flagged as unstable. CDC WONDER
 * uses 20 for mortality rates; 10 keeps most counties rated for single-year
 * views while still flagging the noisiest ones.
 */
export const MIN_DEATHS_FOR_STABLE_RATE = 10

/**
 * Why an area's value should be read with caution. The map hatches these and
 * the legend explains them, so the warning never depends on color.
 */
export const AREA_FLAGS = ["unstable", "no_population"] as const
export type AreaFlag = (typeof AREA_FLAGS)[number]

export const AREA_FLAG_LABELS: Record<AreaFlag, string> = {
  unstable: `Fewer than ${MIN_DEATHS_FOR_STABLE_RATE} deaths: rate is unstable`,
  no_population: "No population estimate for every year selected",
}

/** Deaths per 100,000 residents per year, from totals over the same years. */
export function deathRate(deaths: number, personYears: number): number | null {
  return personYears > 0 ? (deaths / personYears) * 100_000 : null
}

export function isAreaMetric(value: string | null | undefined): value is AreaMetric {
  return (AREA_METRICS as readonly string[]).includes(value ?? "")
}
