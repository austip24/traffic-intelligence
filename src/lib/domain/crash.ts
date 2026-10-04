/**
 * Normalized crash vocabulary shared by the ETL, database and UI.
 *
 * FARS codes change between years (e.g. ROAD_FNC was split into FUNC_SYS and
 * RUR_URB in 2015). The ETL maps every year onto these stable categories so
 * filters and trends compare like with like. See scripts/etl/fars/codes.ts.
 */

function labels<const T extends readonly string[]>(
  values: T,
  map: Record<T[number], string>
) {
  return { values, labels: map }
}

export const LIGHT_CONDITION = labels(
  [
    "daylight",
    "dawn",
    "dusk",
    "dark_lighted",
    "dark_not_lighted",
    "dark_unknown_lighting",
    "other",
    "unknown",
  ] as const,
  {
    daylight: "Daylight",
    dawn: "Dawn",
    dusk: "Dusk",
    dark_lighted: "Dark – lighted",
    dark_not_lighted: "Dark – not lighted",
    dark_unknown_lighting: "Dark – unknown lighting",
    other: "Other",
    unknown: "Unknown",
  }
)
export type LightCondition = (typeof LIGHT_CONDITION.values)[number]

export const WEATHER = labels(
  [
    "clear",
    "cloudy",
    "rain",
    "snow",
    "sleet_hail",
    "freezing_rain",
    "fog_smoke",
    "blowing_snow",
    "blowing_sand",
    "severe_crosswinds",
    "other",
    "unknown",
  ] as const,
  {
    clear: "Clear",
    cloudy: "Cloudy",
    rain: "Rain",
    snow: "Snow",
    sleet_hail: "Sleet or hail",
    freezing_rain: "Freezing rain or drizzle",
    fog_smoke: "Fog, smog or smoke",
    blowing_snow: "Blowing snow",
    blowing_sand: "Blowing sand, soil or dirt",
    severe_crosswinds: "Severe crosswinds",
    other: "Other",
    unknown: "Unknown",
  }
)
export type Weather = (typeof WEATHER.values)[number]

/**
 * Road functional class. Major and minor collectors are merged because
 * pre-2015 FARS does not distinguish them on urban roads.
 */
export const FUNCTIONAL_CLASS = labels(
  [
    "interstate",
    "freeway_expressway",
    "principal_arterial",
    "minor_arterial",
    "collector",
    "local",
    "unknown",
  ] as const,
  {
    interstate: "Interstate",
    freeway_expressway: "Other freeway or expressway",
    principal_arterial: "Other principal arterial",
    minor_arterial: "Minor arterial",
    collector: "Collector",
    local: "Local road",
    unknown: "Unknown",
  }
)
export type FunctionalClass = (typeof FUNCTIONAL_CLASS.values)[number]

export const RURAL_URBAN = labels(["rural", "urban", "unknown"] as const, {
  rural: "Rural",
  urban: "Urban",
  unknown: "Unknown",
})
export type RuralUrban = (typeof RURAL_URBAN.values)[number]

export const PERSON_TYPE = labels(
  [
    "driver",
    "passenger",
    "other_occupant",
    "pedestrian",
    "bicyclist",
    "other_non_motorist",
  ] as const,
  {
    driver: "Driver",
    passenger: "Passenger",
    other_occupant: "Other vehicle occupant",
    pedestrian: "Pedestrian",
    bicyclist: "Bicyclist",
    other_non_motorist: "Other non-motorist",
  }
)
export type PersonType = (typeof PERSON_TYPE.values)[number]

export const INJURY_SEVERITY = labels(
  [
    "fatal",
    "suspected_serious",
    "suspected_minor",
    "possible",
    "injured_unknown_severity",
    "none",
    "died_prior",
    "unknown",
  ] as const,
  {
    fatal: "Fatal",
    suspected_serious: "Suspected serious injury",
    suspected_minor: "Suspected minor injury",
    possible: "Possible injury",
    injured_unknown_severity: "Injured, severity unknown",
    none: "No apparent injury",
    died_prior: "Died prior to crash",
    unknown: "Unknown",
  }
)
export type InjurySeverity = (typeof INJURY_SEVERITY.values)[number]

export const SEX = labels(["male", "female", "unknown"] as const, {
  male: "Male",
  female: "Female",
  unknown: "Unknown",
})
export type Sex = (typeof SEX.values)[number]

/** How a crash was assigned to a county (see the FARS ETL). */
export const COUNTY_MATCH = labels(["within", "nearest"] as const, {
  within: "Inside county boundary",
  nearest: "Nearest county (within 10 km)",
})
export type CountyMatch = (typeof COUNTY_MATCH.values)[number]

/**
 * One category per crash for mapping and breakdowns. A crash involving
 * several road users is counted once, under the first that applies
 * (pedestrian, then bicyclist, then motorcyclist).
 */
export const ROAD_USER_CATEGORY = labels(
  ["pedestrian", "bicyclist", "motorcyclist", "vehicle"] as const,
  {
    pedestrian: "Pedestrian involved",
    bicyclist: "Bicyclist involved",
    motorcyclist: "Motorcyclist involved",
    vehicle: "Vehicle occupants only",
  }
)
export type RoadUserCategory = (typeof ROAD_USER_CATEGORY.values)[number]
