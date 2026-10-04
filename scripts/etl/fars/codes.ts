/**
 * FARS code → normalized category mappings for 2010–2024.
 *
 * Source: NHTSA FARS Analytical User's Manual, cross-checked against the
 * *NAME label columns in the 2015+ CSVs. Codes not listed map to "unknown"
 * (or the closest "other" bucket) rather than failing, because NHTSA adds
 * codes over time; the ETL report counts unmapped codes so drift is visible.
 */
import type {
  FunctionalClass,
  InjurySeverity,
  LightCondition,
  PersonType,
  RuralUrban,
  Sex,
  Weather,
} from "@/lib/domain/crash"

/** First data year that uses FUNC_SYS + RUR_URB instead of ROAD_FNC. */
export const FUNC_SYS_FIRST_YEAR = 2015

export const LGT_COND: Record<number, LightCondition> = {
  1: "daylight",
  2: "dark_not_lighted",
  3: "dark_lighted",
  4: "dawn",
  5: "dusk",
  6: "dark_unknown_lighting",
  7: "other",
  8: "unknown", // Not reported
  9: "unknown",
}

export const WEATHER: Record<number, Weather> = {
  1: "clear",
  2: "rain",
  3: "sleet_hail",
  4: "snow",
  5: "fog_smoke",
  6: "severe_crosswinds",
  7: "blowing_sand",
  8: "other",
  10: "cloudy",
  11: "blowing_snow",
  12: "freezing_rain",
  98: "unknown", // Not reported
  99: "unknown",
}

/**
 * 2010–2014 ROAD_FNC combines rural/urban with function class.
 * Rural "principal arterial – other" includes non-interstate freeways, which
 * 2015+ data separates; this is a known discontinuity in the series.
 */
export const ROAD_FNC: Record<number, [FunctionalClass, RuralUrban]> = {
  1: ["interstate", "rural"],
  2: ["principal_arterial", "rural"],
  3: ["minor_arterial", "rural"],
  4: ["collector", "rural"], // Major collector
  5: ["collector", "rural"], // Minor collector
  6: ["local", "rural"],
  9: ["unknown", "rural"],
  11: ["interstate", "urban"],
  12: ["freeway_expressway", "urban"],
  13: ["principal_arterial", "urban"],
  14: ["minor_arterial", "urban"],
  15: ["collector", "urban"],
  16: ["local", "urban"],
  19: ["unknown", "urban"],
  99: ["unknown", "unknown"],
}

/** 2015+ FUNC_SYS. 96 = not in state inventory, 98 = not reported. */
export const FUNC_SYS: Record<number, FunctionalClass> = {
  1: "interstate",
  2: "freeway_expressway",
  3: "principal_arterial",
  4: "minor_arterial",
  5: "collector", // Major collector
  6: "collector", // Minor collector
  7: "local",
  96: "unknown",
  98: "unknown",
  99: "unknown",
}

/** 2015+ RUR_URB. 6 = not in state inventory, 8 = not reported. */
export const RUR_URB: Record<number, RuralUrban> = {
  1: "rural",
  2: "urban",
  6: "unknown",
  8: "unknown",
  9: "unknown",
}

/** PER_TYP. Codes 11–13 (personal conveyance subtypes) appear only in 2021. */
export const PER_TYP: Record<number, PersonType> = {
  1: "driver",
  2: "passenger",
  3: "other_occupant", // Occupant of a motor vehicle not in transport
  4: "other_non_motorist", // Occupant of a non-motor-vehicle transport device
  5: "pedestrian",
  6: "bicyclist",
  7: "bicyclist", // Other cyclist / pedalcyclist
  8: "other_non_motorist", // Personal conveyance
  9: "other_occupant", // Unknown occupant type
  10: "other_non_motorist", // Person in/on a building
  11: "other_non_motorist",
  12: "other_non_motorist",
  13: "other_non_motorist",
  19: "other_non_motorist", // Unknown type of non-motorist
}

export const INJ_SEV: Record<number, InjurySeverity> = {
  0: "none",
  1: "possible",
  2: "suspected_minor",
  3: "suspected_serious",
  4: "fatal",
  5: "injured_unknown_severity",
  6: "died_prior",
  8: "unknown",
  9: "unknown",
}

export const SEX: Record<number, Sex> = {
  1: "male",
  2: "female",
}

/** BODY_TYP 80–89: motorcycles, mopeds, scooters and other motored cycles. */
export function isMotorcycleBodyType(code: number): boolean {
  return code >= 80 && code <= 89
}

/**
 * SPEEDREL "yes" codes: 1 (2010–2012), and 2–5 (racing, exceeded limit,
 * too fast for conditions, specifics unknown) from 2013.
 */
export function isSpeedingRelated(code: number): boolean {
  return code >= 1 && code <= 5
}

/** DRINKING = 1: police reported alcohol involvement. */
export const DRINKING_YES = 1

/** Hour/minute value meaning "unknown". */
export const TIME_UNKNOWN = 99
/** AGE values 998 (not reported) and 999 (unknown). */
export const AGE_MAX_VALID = 120
