import { rawPath } from "../lib/download"
import { readCsv, readZipEntry } from "../lib/csv"
import { farsSource } from "../sources"
import {
  ACCIDENT_COLUMNS,
  applyPersonFlags,
  applyVehicleFlags,
  emptyCounters,
  emptyFlags,
  PERSON_COLUMNS,
  transformAccident,
  transformPerson,
  VEHICLE_COLUMNS,
  type CrashFlags,
  type CrashInsert,
  type PersonInsert,
  type QualityCounters,
} from "./transform"

export type FarsYear = {
  year: number
  crashes: CrashInsert[]
  people: PersonInsert[]
  quality: QualityCounters & { people: number; duplicatePeople: number }
}

/** Reads one year of FARS from its downloaded zip and normalizes it. */
export async function extractYear(year: number): Promise<FarsYear> {
  const zipPath = rawPath(farsSource(year))
  const q = emptyCounters()
  const flagsByCase = new Map<string, CrashFlags>()
  const flagsFor = (stCase: string) => {
    let flags = flagsByCase.get(stCase)
    if (!flags) flagsByCase.set(stCase, (flags = emptyFlags()))
    return flags
  }

  // Vehicles and people first: their flags are rolled up onto each crash.
  for await (const row of readCsv(
    await readZipEntry(zipPath, "vehicle.csv"),
    VEHICLE_COLUMNS
  )) {
    applyVehicleFlags(flagsFor(row.ST_CASE), row)
  }

  const peopleRows: PersonInsert[] = []
  for await (const row of readCsv(
    await readZipEntry(zipPath, "person.csv"),
    PERSON_COLUMNS
  )) {
    applyPersonFlags(flagsFor(row.ST_CASE), row)
    const person = transformPerson(row, year, q)
    if (person) peopleRows.push(person)
  }

  const crashes: CrashInsert[] = []
  for await (const row of readCsv(
    await readZipEntry(zipPath, "accident.csv"),
    ACCIDENT_COLUMNS(year)
  )) {
    const crash = transformAccident(row, year, flagsFor(row.ST_CASE), q)
    if (crash) crashes.push(crash)
  }

  // Keep only people whose crash was loaded, and drop duplicate keys.
  const crashIds = new Set(crashes.map((c) => c.id))
  const seen = new Set<string>()
  let duplicatePeople = 0
  const people = peopleRows.filter((p) => {
    if (!crashIds.has(p.crashId)) return false
    const key = `${p.crashId}:${p.vehicleNumber}:${p.personNumber}`
    if (seen.has(key)) {
      duplicatePeople++
      return false
    }
    seen.add(key)
    return true
  })

  return {
    year,
    crashes,
    people,
    quality: { ...q, people: people.length, duplicatePeople },
  }
}
