import { describe, expect, it } from "vitest"

import { parseViewport, writeViewport } from "./url-state"

describe("parseViewport", () => {
  it("parses a complete, valid viewport", () => {
    const params = new URLSearchParams("lng=-87.6298&lat=41.8781&z=11.5")
    expect(parseViewport(params)).toEqual({
      center: [-87.6298, 41.8781],
      zoom: 11.5,
    })
  })

  it.each([
    ["missing param", "lng=-87.6&lat=41.8"],
    ["empty value", "lng=&lat=41.8&z=4"],
    ["non-numeric", "lng=abc&lat=41.8&z=4"],
    ["longitude out of range", "lng=200&lat=41.8&z=4"],
    ["latitude beyond Web Mercator", "lng=0&lat=89&z=4"],
    ["zoom out of range", "lng=0&lat=0&z=30"],
    ["infinity", "lng=Infinity&lat=0&z=4"],
  ])("returns null for %s", (_label, query) => {
    expect(parseViewport(new URLSearchParams(query))).toBeNull()
  })
})

describe("writeViewport", () => {
  it("round-trips through parseViewport", () => {
    const view = { center: [-122.41942, 37.77493] as [number, number], zoom: 15 }
    const parsed = parseViewport(writeViewport(new URLSearchParams(), view))
    expect(parsed).toEqual(view)
  })

  it("reduces precision at low zoom", () => {
    const params = writeViewport(new URLSearchParams(), {
      center: [-98.583333, 39.833333],
      zoom: 3.4,
    })
    expect(params.get("lng")).toBe("-98.58")
    expect(params.get("lat")).toBe("39.83")
    expect(params.get("z")).toBe("3.40")
  })

  it("preserves unrelated params", () => {
    const params = writeViewport(new URLSearchParams("layers=crashes"), {
      center: [0, 0],
      zoom: 2,
    })
    expect(params.get("layers")).toBe("crashes")
  })
})
