/**
 * Crash filters, defined once and shared by the URL state, the filter UI,
 * tile URLs and server-side SQL. Pure TypeScript: safe on client and server.
 */
import { z } from "zod"

import {
  FUNCTIONAL_CLASS,
  type FunctionalClass,
  type LightCondition,
} from "@/lib/domain/crash"

export const CRASH_YEAR_MIN = 2010
export const CRASH_YEAR_MAX = 2024
/**
 * NHTSA publishes the newest year as a preliminary Annual Report File and
 * revises it a year later. Years after this one are labeled preliminary.
 */
export const CRASH_FINAL_YEAR = 2023

/** Road users a crash can involve; a crash matches if it involves any selected. */
export const ROAD_USERS = {
  values: ["pedestrian", "bicyclist", "motorcyclist"] as const,
  labels: {
    pedestrian: "Pedestrian",
    bicyclist: "Bicyclist",
    motorcyclist: "Motorcyclist",
  },
}
export type RoadUser = (typeof ROAD_USERS.values)[number]

/** Light filter options, each covering one or more stored light conditions. */
export const LIGHT_OPTIONS = {
  values: ["daylight", "twilight", "dark_lighted", "dark_unlit"] as const,
  labels: {
    daylight: "Daylight",
    twilight: "Dawn or dusk",
    dark_lighted: "Dark – lighted road",
    dark_unlit: "Dark – unlit or unknown",
  },
  conditions: {
    daylight: ["daylight"],
    twilight: ["dawn", "dusk"],
    dark_lighted: ["dark_lighted"],
    dark_unlit: ["dark_not_lighted", "dark_unknown_lighting"],
  } satisfies Record<string, LightCondition[]>,
}
export type LightOption = (typeof LIGHT_OPTIONS.values)[number]

export const SETTINGS = {
  values: ["urban", "rural"] as const,
  labels: { urban: "Urban", rural: "Rural" },
}
export type Setting = (typeof SETTINGS.values)[number]

export const ROAD_CLASSES = {
  values: FUNCTIONAL_CLASS.values.filter(
    (v): v is Exclude<FunctionalClass, "unknown"> => v !== "unknown"
  ),
  labels: FUNCTIONAL_CLASS.labels,
}
export type RoadClass = (typeof ROAD_CLASSES.values)[number]

export type CrashFilters = {
  from: number
  to: number
  /** Empty array means "no restriction" for every multi-select. */
  roadUsers: RoadUser[]
  light: LightOption[]
  settings: Setting[]
  roadClasses: RoadClass[]
}

export const DEFAULT_CRASH_FILTERS: CrashFilters = {
  from: CRASH_YEAR_MIN,
  to: CRASH_YEAR_MAX,
  roadUsers: [],
  light: [],
  settings: [],
  roadClasses: [],
}

/** URL parameter names; short so shared links stay readable. */
const PARAM = {
  from: "from",
  to: "to",
  roadUsers: "user",
  light: "light",
  settings: "setting",
  roadClasses: "road",
} as const satisfies Record<keyof CrashFilters, string>

const year = z.coerce.number().int().min(CRASH_YEAR_MIN).max(CRASH_YEAR_MAX)

/**
 * Comma-separated list of known values. Unknown values are dropped rather than
 * rejecting the whole URL, so links survive vocabulary changes.
 */
function list<const T extends readonly string[]>(values: T) {
  const allowed = new Set<string>(values)
  return z
    .string()
    .optional()
    .transform((raw) => {
      const picked = (raw ?? "").split(",").filter((v) => allowed.has(v))
      // Canonical order keeps equivalent filters on one cache key.
      return values.filter((v) => picked.includes(v)) as T[number][]
    })
}

const filtersSchema = z.object({
  from: year.catch(CRASH_YEAR_MIN),
  to: year.catch(CRASH_YEAR_MAX),
  roadUsers: list(ROAD_USERS.values),
  light: list(LIGHT_OPTIONS.values),
  settings: list(SETTINGS.values),
  roadClasses: list(ROAD_CLASSES.values),
})

/** Parses filters from URL params. Never throws: invalid values fall back to defaults. */
export function parseCrashFilters(params: URLSearchParams): CrashFilters {
  const get = (key: keyof CrashFilters) => params.get(PARAM[key]) ?? undefined
  const parsed = filtersSchema.parse({
    from: get("from"),
    to: get("to"),
    roadUsers: get("roadUsers"),
    light: get("light"),
    settings: get("settings"),
    roadClasses: get("roadClasses"),
  })
  const [from, to] = parsed.from <= parsed.to ? [parsed.from, parsed.to] : [parsed.to, parsed.from]
  return { ...parsed, from, to }
}

/**
 * Writes filters into a copy of `params`, omitting defaults so URLs and tile
 * cache keys stay minimal and canonical.
 */
export function writeCrashFilters(
  params: URLSearchParams,
  filters: CrashFilters
): URLSearchParams {
  const next = new URLSearchParams(params)
  const set = (key: keyof CrashFilters, value: string | null) => {
    if (value) next.set(PARAM[key], value)
    else next.delete(PARAM[key])
  }
  set("from", filters.from !== CRASH_YEAR_MIN ? String(filters.from) : null)
  set("to", filters.to !== CRASH_YEAR_MAX ? String(filters.to) : null)
  set("roadUsers", filters.roadUsers.join(","))
  set("light", filters.light.join(","))
  set("settings", filters.settings.join(","))
  set("roadClasses", filters.roadClasses.join(","))
  return next
}

export function isDefaultCrashFilters(filters: CrashFilters): boolean {
  return writeCrashFilters(new URLSearchParams(), filters).size === 0
}

/**
 * Short description of the active filters, e.g. "2018–2024 · Pedestrian ·
 * Urban", so every number shown can be read with what it counts.
 */
export function describeCrashFilters(filters: CrashFilters): string {
  const years = filters.from === filters.to ? String(filters.from) : `${filters.from}–${filters.to}`
  const parts = [
    years,
    filters.roadUsers.map((v) => ROAD_USERS.labels[v]).join(" or "),
    filters.light.map((v) => LIGHT_OPTIONS.labels[v]).join(" or "),
    filters.settings.map((v) => SETTINGS.labels[v]).join(" or "),
    filters.roadClasses.map((v) => ROAD_CLASSES.labels[v]).join(" or "),
  ]
  return parts.filter(Boolean).join(" · ")
}
