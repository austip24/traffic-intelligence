import { describe, expect, it } from "vitest"

import { classIndex, classLabels, quantileBreaks, roundNice } from "@/lib/geo/classify"

describe("roundNice", () => {
  it("keeps two significant figures", () => {
    expect(roundNice(12.345)).toBe(12)
    expect(roundNice(0.04567)).toBeCloseTo(0.046)
    expect(roundNice(98_765)).toBe(99_000)
    expect(roundNice(0)).toBe(0)
  })
})

describe("quantileBreaks", () => {
  it("splits evenly distributed values into equal-count classes", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(quantileBreaks(values, 5)).toEqual([21, 41, 61, 81])
  })

  it("collapses classes when many values are equal", () => {
    const values = [0, 0, 0, 0, 0, 0, 0, 0, 5, 10]
    expect(quantileBreaks(values, 5)).toEqual([5])
  })

  it("rounds integer metrics to whole numbers of at least 1", () => {
    expect(quantileBreaks([0.2, 0.4, 1.4, 2.6, 3.1, 7.9], 3, { integer: true })).toEqual([1, 3])
  })

  it("returns no breaks for empty input", () => {
    expect(quantileBreaks([], 5)).toEqual([])
    expect(quantileBreaks([1, 2, 3], 1)).toEqual([])
  })
})

describe("classIndex", () => {
  it("puts values equal to a break in the upper class", () => {
    const breaks = [5, 10]
    expect(classIndex(0, breaks)).toBe(0)
    expect(classIndex(5, breaks)).toBe(1)
    expect(classIndex(9.99, breaks)).toBe(1)
    expect(classIndex(10, breaks)).toBe(2)
    expect(classIndex(1e9, breaks)).toBe(2)
  })
})

describe("classLabels", () => {
  it("describes each class", () => {
    expect(classLabels([5, 10], String)).toEqual(["Under 5", "5–10", "10 or more"])
    expect(classLabels([], String)).toEqual(["All areas"])
  })
})
