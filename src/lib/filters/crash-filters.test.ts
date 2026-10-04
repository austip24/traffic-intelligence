import { describe, expect, it } from "vitest"

import {
  DEFAULT_CRASH_FILTERS,
  describeCrashFilters,
  isDefaultCrashFilters,
  parseCrashFilters,
  writeCrashFilters,
  type CrashFilters,
} from "./crash-filters"

const parse = (query: string) => parseCrashFilters(new URLSearchParams(query))

describe("parseCrashFilters", () => {
  it("returns defaults for an empty URL", () => {
    expect(parse("")).toEqual(DEFAULT_CRASH_FILTERS)
  })

  it("parses every filter", () => {
    expect(
      parse("from=2018&to=2022&user=pedestrian,bicyclist&light=dark_unlit&setting=urban&road=local")
    ).toEqual({
      from: 2018,
      to: 2022,
      roadUsers: ["pedestrian", "bicyclist"],
      light: ["dark_unlit"],
      settings: ["urban"],
      roadClasses: ["local"],
    })
  })

  it("drops unknown values and canonicalizes order", () => {
    expect(parse("user=motorcyclist,alien,pedestrian").roadUsers).toEqual([
      "pedestrian",
      "motorcyclist",
    ])
  })

  it("falls back on out-of-range years and swaps reversed ranges", () => {
    expect(parse("from=1990&to=2099")).toMatchObject({ from: 2010, to: 2024 })
    expect(parse("from=2020&to=2015")).toMatchObject({ from: 2015, to: 2020 })
  })
})

describe("writeCrashFilters", () => {
  it("omits defaults and round-trips", () => {
    const filters: CrashFilters = {
      ...DEFAULT_CRASH_FILTERS,
      from: 2019,
      light: ["twilight", "daylight"],
    }
    const params = writeCrashFilters(new URLSearchParams("lng=1"), filters)
    expect(params.toString()).toBe("lng=1&from=2019&light=twilight%2Cdaylight")
    expect(parseCrashFilters(params)).toEqual({
      ...filters,
      light: ["daylight", "twilight"],
    })
  })

  it("removes params when filters return to defaults", () => {
    const params = writeCrashFilters(new URLSearchParams("from=2019&user=pedestrian"), DEFAULT_CRASH_FILTERS)
    expect(params.toString()).toBe("")
    expect(isDefaultCrashFilters(DEFAULT_CRASH_FILTERS)).toBe(true)
  })
})

describe("describeCrashFilters", () => {
  it("summarizes years and active filters", () => {
    expect(describeCrashFilters(DEFAULT_CRASH_FILTERS)).toBe("2010–2024")
    expect(
      describeCrashFilters({
        ...DEFAULT_CRASH_FILTERS,
        from: 2020,
        to: 2020,
        roadUsers: ["pedestrian", "bicyclist"],
        settings: ["urban"],
      })
    ).toBe("2020 · Pedestrian or Bicyclist · Urban")
  })
})
