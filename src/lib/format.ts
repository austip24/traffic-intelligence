const integer = new Intl.NumberFormat("en-US")
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 })

export const formatInteger = (n: number) => integer.format(n)
export const formatCompact = (n: number) => compact.format(n)

export function pluralize(n: number, singular: string, plural = `${singular}s`) {
  return `${formatInteger(n)} ${n === 1 ? singular : plural}`
}
