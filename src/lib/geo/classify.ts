/**
 * Classification for choropleth maps. Pure functions, shared by the server
 * (which computes breaks) and the client (which assigns classes and labels).
 *
 * Breaks are interior thresholds: with breaks [b0, b1], class 0 is
 * value < b0, class 1 is b0 ≤ value < b1 and class 2 is value ≥ b1.
 */

/** Rounds to two significant figures so legend labels stay readable. */
export function roundNice(value: number): number {
  if (value === 0 || !Number.isFinite(value)) return value
  const magnitude = 10 ** (Math.floor(Math.log10(Math.abs(value))) - 1)
  return Math.round(value / magnitude) * magnitude
}

/**
 * Quantile breaks: each class holds roughly the same number of areas, so the
 * map shows relative standing rather than being dominated by outliers (a few
 * very large counties would otherwise put everything else in one class).
 *
 * Returns at most `classes - 1` strictly increasing breaks; fewer when many
 * values are equal (e.g. lots of zeros).
 */
export function quantileBreaks(
  values: readonly number[],
  classes: number,
  { integer = false } = {}
): number[] {
  const sorted = values.filter(Number.isFinite).toSorted((a, b) => a - b)
  if (sorted.length === 0 || classes < 2) return []

  const breaks: number[] = []
  for (let i = 1; i < classes; i++) {
    // Nearest-rank quantile; values at a break go to the upper class.
    const q = sorted[Math.min(sorted.length - 1, Math.floor((i * sorted.length) / classes))]
    const rounded = integer ? Math.max(1, Math.round(roundNice(q))) : roundNice(q)
    if (rounded > sorted[0] && rounded > (breaks.at(-1) ?? -Infinity)) breaks.push(rounded)
  }
  return breaks
}

/** Class index 0…breaks.length for a value. */
export function classIndex(value: number, breaks: readonly number[]): number {
  let i = 0
  while (i < breaks.length && value >= breaks[i]) i++
  return i
}

/** Human labels for each class, e.g. ["Under 5", "5–10", "10 or more"]. */
export function classLabels(
  breaks: readonly number[],
  format: (value: number) => string
): string[] {
  if (breaks.length === 0) return ["All areas"]
  return [
    `Under ${format(breaks[0])}`,
    ...breaks.slice(1).map((b, i) => `${format(breaks[i])}–${format(b)}`),
    `${format(breaks.at(-1)!)} or more`,
  ]
}
