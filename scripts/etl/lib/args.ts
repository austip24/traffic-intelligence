/** Parses `--years 2010-2024` or `--years 2016,2018` (default: `all`). */
export function parseYears(argv: string[], all: number[]): number[] {
  const index = argv.indexOf("--years")
  const value = index >= 0 ? argv[index + 1] : undefined
  if (!value) return all

  const years = value.includes("-")
    ? (() => {
        const [from, to] = value.split("-").map(Number)
        return all.filter((y) => y >= from && y <= to)
      })()
    : value.split(",").map(Number)

  const invalid = years.filter((y) => !all.includes(y))
  if (invalid.length > 0 || years.length === 0) {
    throw new Error(
      `--years must be within ${all[0]}–${all[all.length - 1]}; got "${value}"`
    )
  }
  return years
}

export const hasFlag = (argv: string[], flag: string) => argv.includes(flag)
