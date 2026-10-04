import { describe, expect, it } from "vitest"

import { tileSchema, tileWidthMeters } from "./tiles"

describe("tileSchema", () => {
  it("accepts valid tiles", () => {
    expect(tileSchema.parse({ z: "3", x: "1", y: "2" })).toEqual({ z: 3, x: 1, y: 2 })
  })

  it.each([
    { z: "3", x: "8", y: "0" },
    { z: "15", x: "0", y: "0" },
    { z: "-1", x: "0", y: "0" },
    { z: "2", x: "1.5", y: "0" },
    { z: "abc", x: "0", y: "0" },
  ])("rejects %o", (tile) => {
    expect(tileSchema.safeParse(tile).success).toBe(false)
  })
})

describe("tileWidthMeters", () => {
  it("halves with each zoom level", () => {
    expect(tileWidthMeters(0)).toBeCloseTo(40_075_016.69, 1)
    expect(tileWidthMeters(1)).toBeCloseTo(tileWidthMeters(0) / 2, 6)
  })
})
