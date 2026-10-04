import { describe, expect, it } from "vitest"

import { bboxParamSchema, boundsToBBox } from "@/lib/geo/bbox"

describe("bboxParamSchema", () => {
  it("parses minLng,minLat,maxLng,maxLat", () => {
    expect(bboxParamSchema.parse("-88.2,41.6,-87.3,42.1")).toEqual([-88.2, 41.6, -87.3, 42.1])
  })

  it.each([
    "",
    "1,2,3",
    "a,b,c,d",
    "-88,41,,42",
    "-200,41,-87,42",
    "-87,41,-88,42", // min > max
    "-88,42,-87,41",
  ])("rejects %j", (raw) => {
    expect(bboxParamSchema.safeParse(raw).success).toBe(false)
  })
})

describe("boundsToBBox", () => {
  it("rounds outward with zoom-dependent precision", () => {
    expect(boundsToBBox([-87.6543, 41.8123, -87.6012, 41.8567], 12)).toEqual([
      -87.655, 41.812, -87.601, 41.857,
    ])
    expect(boundsToBBox([-125.4, 24.6, -66.2, 49.3], 3)).toEqual([-126, 24, -66, 50])
  })

  it("clamps wrapped worlds to valid coordinates", () => {
    expect(boundsToBBox([-250, -89, 250, 89], 0)).toEqual([-180, -85.051129, 180, 85.051129])
  })
})
