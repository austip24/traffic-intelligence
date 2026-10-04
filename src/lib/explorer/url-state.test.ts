import { describe, expect, it } from "vitest"

import {
  parseAreaMetric,
  parseSelection,
  parseViewport,
  toQueryString,
  writeAreaMetric,
  writeSelection,
  writeViewport,
} from "./url-state"

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

describe("parseSelection", () => {
  it.each([
    ["sel=crash-2023012345", { type: "crash", id: 2023012345 }],
    ["sel=area-17031", { type: "area", geoid: "17031" }],
    ["sel=area-06", { type: "area", geoid: "06" }],
  ])("parses %s", (query, expected) => {
    expect(parseSelection(new URLSearchParams(query))).toEqual(expected)
  })

  it.each([
    "",
    "sel=crash-abc",
    "sel=crash-1999000001",
    "sel=area-170",
    "sel=area-1703x",
    "sel=road:1",
    "sel=area",
  ])("ignores %j", (query) => {
    expect(parseSelection(new URLSearchParams(query))).toBeNull()
  })

  it("round-trips through writeSelection", () => {
    const selection = { type: "area", geoid: "17031" } as const
    expect(parseSelection(writeSelection(new URLSearchParams(), selection))).toEqual(selection)
    expect(writeSelection(new URLSearchParams("sel=area-01&x=1"), null).toString()).toBe("x=1")
  })
})

describe("area metric param", () => {
  it("falls back to the default and omits it when writing", () => {
    expect(parseAreaMetric(new URLSearchParams("metric=bogus"))).toBe("rate")
    expect(parseAreaMetric(new URLSearchParams("metric=deaths"))).toBe("deaths")
    expect(writeAreaMetric(new URLSearchParams("metric=deaths"), "rate").has("metric")).toBe(false)
  })
})

describe("toQueryString", () => {
  it("keeps commas readable and round-trips", () => {
    const params = new URLSearchParams({ layers: "areas,crashes", sel: "area-06" })
    const query = toQueryString(params)
    expect(query).toBe("layers=areas,crashes&sel=area-06")
    expect(new URLSearchParams(query).get("layers")).toBe("areas,crashes")
  })
})
