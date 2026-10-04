import { describe, expect, it } from "vitest"

import { compareRate, crashSeverity, describeRatio } from "@/lib/metrics/severity"

describe("compareRate", () => {
  it.each([
    [18, 12, "high"],
    [14, 12, "elevated"],
    [12.5, 12, "typical"],
    [9, 12, "low"],
  ] as const)("rate %d vs %d is %s", (rate, reference, severity) => {
    expect(compareRate(rate, reference)?.severity).toBe(severity)
  })

  it("doesn't judge missing or unstable rates", () => {
    expect(compareRate(null, 12)).toBeNull()
    expect(compareRate(10, null)).toBeNull()
    expect(compareRate(10, 0)).toBeNull()
    expect(compareRate(30, 12, { stable: false })).toBeNull()
  })
})

describe("describeRatio", () => {
  it("states the ratio, or that it's typical", () => {
    expect(describeRatio({ severity: "high", ratio: 1.62 }, "U.S.")).toBe("1.6× the U.S. rate")
    expect(describeRatio({ severity: "typical", ratio: 1.02 }, "U.S.")).toBe("About the U.S. rate")
  })
})

describe("crashSeverity", () => {
  it("flags crashes with multiple deaths", () => {
    expect(crashSeverity(1)).toBe("typical")
    expect(crashSeverity(3)).toBe("high")
  })
})
