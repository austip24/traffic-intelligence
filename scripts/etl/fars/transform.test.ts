import { describe, expect, it } from "vitest"

import {
  applyPersonFlags,
  applyVehicleFlags,
  emptyCounters,
  emptyFlags,
  parseCoordinates,
  parseDate,
  transformAccident,
  transformPerson,
} from "./transform"

const baseAccident = {
  STATE: "17",
  ST_CASE: "170042",
  COUNTY: "31",
  YEAR: "2016",
  MONTH: "7",
  DAY: "4",
  HOUR: "22",
  MINUTE: "15",
  FATALS: "2",
  PERSONS: "3",
  VE_TOTAL: "2",
  LATITUDE: "41.8781",
  LONGITUD: "-87.6298",
  LGT_COND: "3",
  WEATHER: "1",
  FUNC_SYS: "3",
  RUR_URB: "2",
}

describe("parseCoordinates", () => {
  it("accepts US coordinates in [lng, lat] order", () => {
    expect(parseCoordinates("41.8781", "-87.6298")).toEqual([-87.6298, 41.8781])
  })

  it.each([
    ["77.7777", "777.7777"],
    ["88.8888", "888.8888"],
    ["99.9999", "999.9999"],
    ["", ""],
    ["0", "0"],
  ])("rejects FARS sentinel/blank %s, %s", (lat, lng) => {
    expect(parseCoordinates(lat, lng)).toBeNull()
  })

  it("accepts Alaska and the Aleutians east of the antimeridian", () => {
    expect(parseCoordinates("64.84", "-147.72")).not.toBeNull()
    expect(parseCoordinates("52.9", "173.2")).not.toBeNull()
  })
})

describe("parseDate", () => {
  it("builds ISO dates and rejects impossible ones", () => {
    expect(parseDate(2016, 2, 29)).toBe("2016-02-29")
    expect(parseDate(2015, 2, 29)).toBeNull()
    expect(parseDate(2015, 4, 99)).toBeNull()
    expect(parseDate(2015, 4, null)).toBeNull()
  })
})

describe("transformAccident", () => {
  it("normalizes a 2015+ crash", () => {
    const q = emptyCounters()
    const row = transformAccident(baseAccident, 2016, emptyFlags(), q)
    expect(row).toMatchObject({
      id: 2016_170042,
      crashDate: "2016-07-04",
      hour: 22,
      fatalities: 2,
      lightCondition: "dark_lighted",
      weather: "clear",
      functionalClass: "principal_arterial",
      ruralUrban: "urban",
      stateFips: "17",
      farsCountyCode: "031",
      geom: "SRID=4326;POINT(-87.6298 41.8781)",
    })
    expect(q).toMatchObject({ crashes: 1, fatalities: 2, located: 1 })
  })

  it("maps pre-2015 ROAD_FNC to class and rural/urban", () => {
    const pre2015 = Object.fromEntries(
      Object.entries(baseAccident).filter(([k]) => k !== "FUNC_SYS" && k !== "RUR_URB")
    )
    const row = transformAccident(
      { ...pre2015, YEAR: "2012", ROAD_FNC: "12" },
      2012,
      emptyFlags(),
      emptyCounters()
    )
    expect(row).toMatchObject({
      functionalClass: "freeway_expressway",
      ruralUrban: "urban",
    })
  })

  it("keeps unlocated crashes and unknown times, and counts them", () => {
    const q = emptyCounters()
    const row = transformAccident(
      { ...baseAccident, LATITUDE: "99.9999", LONGITUD: "999.9999", HOUR: "99", DAY: "99" },
      2016,
      emptyFlags(),
      q
    )
    expect(row).toMatchObject({ geom: null, hour: null, crashDate: null })
    expect(q).toMatchObject({ unlocated: 1, unknownHour: 1, unknownDay: 1 })
  })

  it("records unmapped codes instead of failing", () => {
    const q = emptyCounters()
    const row = transformAccident(
      { ...baseAccident, WEATHER: "42" },
      2016,
      emptyFlags(),
      q
    )
    expect(row?.weather).toBe("unknown")
    expect(q.unmappedCodes).toEqual({ "WEATHER=42": 1 })
  })

  it("rejects rows from the wrong year", () => {
    const q = emptyCounters()
    expect(transformAccident(baseAccident, 2017, emptyFlags(), q)).toBeNull()
    expect(q.rejected).toEqual({ "YEAR does not match file": 1 })
  })
})

describe("crash flags", () => {
  it("derives road-user and behavior flags from person and vehicle rows", () => {
    const flags = emptyFlags()
    applyPersonFlags(flags, { PER_TYP: "5", DRINKING: "0" })
    applyPersonFlags(flags, { PER_TYP: "7", DRINKING: "1" }) // cyclist drinking ≠ driver
    applyVehicleFlags(flags, { BODY_TYP: "80", SPEEDREL: "0" })
    expect(flags).toEqual({
      pedestrian: true,
      bicyclist: true,
      motorcyclist: true,
      alcohol: false,
      speeding: false,
    })

    applyPersonFlags(flags, { PER_TYP: "1", DRINKING: "1" })
    applyVehicleFlags(flags, { BODY_TYP: "4", SPEEDREL: "1" }) // 2010–2012 "yes"
    expect(flags.alcohol).toBe(true)
    expect(flags.speeding).toBe(true)
  })

  it("does not treat SPEEDREL 8/9 (no driver/unknown) as speeding", () => {
    const flags = emptyFlags()
    applyVehicleFlags(flags, { BODY_TYP: "4", SPEEDREL: "9" })
    applyVehicleFlags(flags, { BODY_TYP: "4", SPEEDREL: "8" })
    expect(flags.speeding).toBe(false)
  })
})

describe("transformPerson", () => {
  it("normalizes people and drops unknown ages", () => {
    const q = emptyCounters()
    const row = transformPerson(
      { ST_CASE: "170042", VEH_NO: "0", PER_NO: "1", PER_TYP: "5", INJ_SEV: "4", AGE: "999", SEX: "2" },
      2016,
      q
    )
    expect(row).toEqual({
      crashId: 2016_170042,
      vehicleNumber: 0,
      personNumber: 1,
      personType: "pedestrian",
      injurySeverity: "fatal",
      age: null,
      sex: "female",
    })
  })
})
