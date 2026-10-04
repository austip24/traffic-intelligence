/**
 * Pure transforms from raw FARS CSV rows to database rows. No I/O here so
 * every rule can be unit tested.
 */
import { pointEwkt } from "@/lib/db/postgis"
import type { crashPeople, crashes } from "@/lib/db/schema"

import type { CsvRow } from "../lib/csv"
import {
  AGE_MAX_VALID,
  DRINKING_YES,
  FUNC_SYS,
  FUNC_SYS_FIRST_YEAR,
  INJ_SEV,
  isMotorcycleBodyType,
  isSpeedingRelated,
  LGT_COND,
  PER_TYP,
  ROAD_FNC,
  RUR_URB,
  SEX,
  TIME_UNKNOWN,
  WEATHER,
} from "./codes"

export type CrashInsert = typeof crashes.$inferInsert
export type PersonInsert = typeof crashPeople.$inferInsert

export const ACCIDENT_COLUMNS = (year: number) =>
  [
    "STATE",
    "ST_CASE",
    "COUNTY",
    "YEAR",
    "MONTH",
    "DAY",
    "HOUR",
    "MINUTE",
    "FATALS",
    "PERSONS",
    "VE_TOTAL",
    "LATITUDE",
    "LONGITUD",
    "LGT_COND",
    "WEATHER",
    ...(year < FUNC_SYS_FIRST_YEAR ? ["ROAD_FNC"] : ["FUNC_SYS", "RUR_URB"]),
  ] as const

export const PERSON_COLUMNS = [
  "ST_CASE",
  "VEH_NO",
  "PER_NO",
  "PER_TYP",
  "INJ_SEV",
  "AGE",
  "SEX",
  "DRINKING",
] as const

export const VEHICLE_COLUMNS = ["ST_CASE", "BODY_TYP", "SPEEDREL"] as const

/** Counters for the data-quality report; every dropped or defaulted value is counted. */
export type QualityCounters = {
  crashes: number
  fatalities: number
  located: number
  unlocated: number
  unknownDay: number
  unknownHour: number
  unmappedCodes: Record<string, number>
  rejected: Record<string, number>
}

export function emptyCounters(): QualityCounters {
  return {
    crashes: 0,
    fatalities: 0,
    located: 0,
    unlocated: 0,
    unknownDay: 0,
    unknownHour: 0,
    unmappedCodes: {},
    rejected: {},
  }
}

function bump(record: Record<string, number>, key: string) {
  record[key] = (record[key] ?? 0) + 1
}

export function toInt(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null
  const n = Number(value)
  return Number.isInteger(n) ? n : null
}

/** Looks up a code, recording codes the mapping doesn't know about. */
function mapCode<T>(
  table: Record<number, T>,
  field: string,
  value: string | undefined,
  fallback: T,
  q: QualityCounters
): T {
  const code = toInt(value)
  if (code !== null && code in table) return table[code]
  bump(q.unmappedCodes, `${field}=${value ?? ""}`)
  return fallback
}

/**
 * FARS uses 77.7777 / 88.8888 / 99.9999 (and 777.7777 etc. for longitude) for
 * "not reported / unknown". Rather than enumerating sentinels, accept only
 * coordinates inside the envelope of the 50 states + DC, which excludes all
 * of them. The Aleutians cross the antimeridian, hence the east-longitude band.
 */
export function parseCoordinates(
  latRaw: string | undefined,
  lngRaw: string | undefined
): [lng: number, lat: number] | null {
  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const latOk = lat >= 17 && lat <= 72
  const lngOk = (lng >= -180 && lng <= -64) || (lng >= 172 && lng <= 180)
  return latOk && lngOk ? [lng, lat] : null
}

/** Returns an ISO date only when year/month/day form a real calendar date. */
export function parseDate(year: number, month: number, day: number | null) {
  if (day === null || day < 1 || day > 31) return null
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCMonth() !== month - 1) return null
  return d.toISOString().slice(0, 10)
}

export function parseClock(value: string | undefined, max: number) {
  const n = toInt(value)
  return n === null || n === TIME_UNKNOWN || n < 0 || n > max ? null : n
}

/** Per-crash flags derived from the person and vehicle files. */
export type CrashFlags = {
  pedestrian: boolean
  bicyclist: boolean
  motorcyclist: boolean
  alcohol: boolean
  speeding: boolean
}

export function emptyFlags(): CrashFlags {
  return {
    pedestrian: false,
    bicyclist: false,
    motorcyclist: false,
    alcohol: false,
    speeding: false,
  }
}

export function applyPersonFlags(flags: CrashFlags, row: CsvRow) {
  const type = toInt(row.PER_TYP)
  if (type === 5) flags.pedestrian = true
  if (type === 6 || type === 7) flags.bicyclist = true
  // Police-reported alcohol involvement, drivers only (NHTSA convention).
  if (type === 1 && toInt(row.DRINKING) === DRINKING_YES) flags.alcohol = true
}

export function applyVehicleFlags(flags: CrashFlags, row: CsvRow) {
  const body = toInt(row.BODY_TYP)
  if (body !== null && isMotorcycleBodyType(body)) flags.motorcyclist = true
  const speed = toInt(row.SPEEDREL)
  if (speed !== null && isSpeedingRelated(speed)) flags.speeding = true
}

export function crashId(year: number, stCase: number) {
  return year * 1_000_000 + stCase
}

export function transformAccident(
  row: CsvRow,
  year: number,
  flags: CrashFlags,
  q: QualityCounters
): CrashInsert | null {
  const stCase = toInt(row.ST_CASE)
  const state = toInt(row.STATE)
  const month = toInt(row.MONTH)
  const fatalities = toInt(row.FATALS)

  if (stCase === null || stCase <= 0) return reject(q, "invalid ST_CASE")
  if (state === null || state < 1 || state > 56) return reject(q, "invalid STATE")
  if (month === null || month < 1 || month > 12) return reject(q, "invalid MONTH")
  if (fatalities === null || fatalities < 1) return reject(q, "no fatalities")
  if (toInt(row.YEAR) !== year) return reject(q, "YEAR does not match file")

  const crashDate = parseDate(year, month, toInt(row.DAY))
  const hour = parseClock(row.HOUR, 23)
  const coords = parseCoordinates(row.LATITUDE, row.LONGITUD)

  let functionalClass: CrashInsert["functionalClass"]
  let ruralUrban: CrashInsert["ruralUrban"]
  if (year < FUNC_SYS_FIRST_YEAR) {
    ;[functionalClass, ruralUrban] = mapCode(
      ROAD_FNC,
      "ROAD_FNC",
      row.ROAD_FNC,
      ["unknown", "unknown"],
      q
    )
  } else {
    functionalClass = mapCode(FUNC_SYS, "FUNC_SYS", row.FUNC_SYS, "unknown", q)
    ruralUrban = mapCode(RUR_URB, "RUR_URB", row.RUR_URB, "unknown", q)
  }

  q.crashes++
  q.fatalities += fatalities
  if (coords) q.located++
  else q.unlocated++
  if (!crashDate) q.unknownDay++
  if (hour === null) q.unknownHour++

  const county = toInt(row.COUNTY)

  return {
    id: crashId(year, stCase),
    year,
    stCase,
    month,
    crashDate,
    hour,
    minute: parseClock(row.MINUTE, 59),
    fatalities,
    persons: toInt(row.PERSONS) ?? 0,
    vehicles: toInt(row.VE_TOTAL) ?? 0,
    involvesPedestrian: flags.pedestrian,
    involvesBicyclist: flags.bicyclist,
    involvesMotorcyclist: flags.motorcyclist,
    alcoholInvolved: flags.alcohol,
    speedingInvolved: flags.speeding,
    lightCondition: mapCode(LGT_COND, "LGT_COND", row.LGT_COND, "unknown", q),
    weather: mapCode(WEATHER, "WEATHER", row.WEATHER, "unknown", q),
    ruralUrban,
    functionalClass,
    stateFips: String(state).padStart(2, "0"),
    // 997–999 are "not reported / unknown" county codes.
    farsCountyCode:
      county !== null && county > 0 && county < 997
        ? String(county).padStart(3, "0")
        : null,
    geom: coords ? pointEwkt(coords[0], coords[1]) : null,
  }
}

export function transformPerson(
  row: CsvRow,
  year: number,
  q: QualityCounters
): PersonInsert | null {
  const stCase = toInt(row.ST_CASE)
  const vehicleNumber = toInt(row.VEH_NO)
  const personNumber = toInt(row.PER_NO)
  if (stCase === null || vehicleNumber === null || personNumber === null) {
    return reject(q, "person: invalid key")
  }
  const age = toInt(row.AGE)
  return {
    crashId: crashId(year, stCase),
    vehicleNumber,
    personNumber,
    personType: mapCode(PER_TYP, "PER_TYP", row.PER_TYP, "other_non_motorist", q),
    injurySeverity: mapCode(INJ_SEV, "INJ_SEV", row.INJ_SEV, "unknown", q),
    age: age !== null && age >= 0 && age <= AGE_MAX_VALID ? age : null,
    sex: SEX[toInt(row.SEX) ?? -1] ?? "unknown",
  }
}

function reject(q: QualityCounters, reason: string): null {
  bump(q.rejected, reason)
  return null
}
