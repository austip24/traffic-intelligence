/**
 * Severity levels for data readouts. The UI pairs each level with a color
 * token (see globals.css) and always with text or an icon, never color alone.
 */
export type Severity = "high" | "elevated" | "typical" | "low"

/**
 * How far an area's death rate is from a reference rate (usually the U.S.)
 * before it's called out. Relative, so it works for any filter combination,
 * whose absolute rates differ by orders of magnitude.
 */
const RATE_RATIO = { high: 1.5, elevated: 1.15, low: 0.85 } as const

export type RateComparison = {
  severity: Severity
  /** rate / reference, e.g. 1.6 means 60% above the reference. */
  ratio: number
}

/** Null when either rate is missing or the area's rate is too unstable to judge. */
export function compareRate(
  rate: number | null,
  reference: number | null,
  { stable = true } = {}
): RateComparison | null {
  if (rate === null || reference === null || reference <= 0 || !stable) return null
  const ratio = rate / reference
  const severity: Severity =
    ratio >= RATE_RATIO.high
      ? "high"
      : ratio >= RATE_RATIO.elevated
        ? "elevated"
        : ratio <= RATE_RATIO.low
          ? "low"
          : "typical"
  return { severity, ratio }
}

/** "1.6× the U.S. rate", "about the U.S. rate", "0.6× the U.S. rate". */
export function describeRatio({ severity, ratio }: RateComparison, reference: string): string {
  if (severity === "typical") return `About the ${reference} rate`
  return `${ratio.toLocaleString("en-US", { maximumFractionDigits: 1 })}× the ${reference} rate`
}

/** More than one death in a crash is the most severe outcome FARS records. */
export function crashSeverity(fatalities: number): Severity {
  return fatalities > 1 ? "high" : "typical"
}
