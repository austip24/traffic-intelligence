import { describe, expect, it } from "vitest"

import {
  buildAreaMetrics,
  flagFor,
  nationalTotals,
  ratePercentile,
  type AreaTotalsRow,
} from "@/lib/metrics/build-area-metrics"

const county = (geoid: string, deaths: number, personYears: number | null): AreaTotalsRow => ({
  geoid,
  level: "county",
  stateFips: geoid.slice(0, 2),
  crashes: deaths,
  deaths,
  personYears,
})

describe("flagFor", () => {
  it("flags missing population before small counts", () => {
    expect(flagFor(100, null)).toBe(2)
    expect(flagFor(9, 1_000_000)).toBe(1)
    expect(flagFor(10, 1_000_000)).toBe(0)
  })
})

describe("buildAreaMetrics", () => {
  const rows: AreaTotalsRow[] = [
    { geoid: "01", level: "state", stateFips: "01", crashes: 900, deaths: 1000, personYears: 5e6 },
    county("01001", 50, 1_000_000), // 5 per 100k
    county("01003", 20, 100_000), // 20 per 100k
    county("01005", 3, 10_000), // unstable
    county("09110", 40, null), // no population
  ]

  it("computes annual rates per 100,000 with flags", () => {
    const metrics = buildAreaMetrics(rows, "rate")
    expect(metrics.state.areas).toEqual([["01", 20, 0]])
    expect(metrics.county.areas).toEqual([
      ["01001", 5, 0],
      ["01003", 20, 0],
      ["01005", 30, 1],
      ["09110", null, 2],
    ])
  })

  it("leaves unstable and missing rates out of the breaks", () => {
    // Only 5 and 20 are stable, so the 30 outlier can't set a break.
    expect(buildAreaMetrics(rows, "rate").county.breaks).toEqual([20])
  })

  it("never flags count metrics", () => {
    const metrics = buildAreaMetrics(rows, "deaths")
    expect(metrics.county.areas.map(([, , flag]) => flag)).toEqual([0, 0, 0, 0])
    expect(metrics.county.areas.find(([geoid]) => geoid === "09110")?.[1]).toBe(40)
  })
})

describe("nationalTotals", () => {
  it("sums states and needs population for every state to give a rate", () => {
    const states: AreaTotalsRow[] = [
      { geoid: "01", level: "state", stateFips: "01", crashes: 10, deaths: 12, personYears: 100_000 },
      { geoid: "02", level: "state", stateFips: "02", crashes: 5, deaths: 8, personYears: 100_000 },
      county("01001", 999, 1),
    ]
    expect(nationalTotals(states)).toEqual({ crashes: 15, deaths: 20, rate: 10, flag: 0 })
    expect(nationalTotals([{ ...states[0], personYears: null }]).rate).toBeNull()
  })
})

describe("ratePercentile", () => {
  const peers = [
    county("01001", 10, 1_000_000), // 1
    county("01003", 20, 1_000_000), // 2
    county("01005", 30, 1_000_000), // 3
    county("01007", 2, 1_000_000), // unstable, not ranked
  ]

  it("ranks stable rates", () => {
    expect(ratePercentile("01001", peers)).toEqual({ percentile: 0, peers: 3 })
    expect(ratePercentile("01003", peers)).toEqual({ percentile: 0.5, peers: 3 })
    expect(ratePercentile("01005", peers)).toEqual({ percentile: 1, peers: 3 })
  })

  it("doesn't rank an unstable rate", () => {
    expect(ratePercentile("01007", peers)).toBeNull()
  })
})
