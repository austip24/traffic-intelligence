/**
 * Response contracts for the JSON API. The server builds values of these
 * types and the client validates responses against the same schemas.
 *
 * Coordinates are EPSG:4326 degrees in GeoJSON order ([lng, lat]); bounding
 * boxes are [minLng, minLat, maxLng, maxLat]. An area spanning the
 * antimeridian (Alaska) gets minLng < -180 so the box stays contiguous.
 */
import { z } from "zod"

import { AREA_LEVELS } from "@/lib/domain/area"
import {
  COUNTY_MATCH,
  FUNCTIONAL_CLASS,
  INJURY_SEVERITY,
  LIGHT_CONDITION,
  PERSON_TYPE,
  ROAD_USER_CATEGORY,
  RURAL_URBAN,
  SEX,
  WEATHER,
} from "@/lib/domain/crash"
import { LIGHT_OPTIONS } from "@/lib/filters/crash-filters"
import { AREA_METRICS } from "@/lib/metrics/area-metrics"

const int = z.number().int()
const bboxSchema = z.tuple([z.number(), z.number(), z.number(), z.number()])
const lngLatSchema = z.tuple([z.number(), z.number()])

export const crashSummarySchema = z.object({
  crashes: int,
  fatalities: int,
  /** Matching crashes without usable coordinates (not on the map). */
  unlocated: int,
  byYear: z.array(z.object({ year: int, crashes: int, fatalities: int })),
})
export type CrashSummary = z.infer<typeof crashSummarySchema>

/**
 * Area flag codes in compact metric tuples: 0 none, 1 unstable (too few
 * deaths for a reliable rate), 2 no population estimate.
 */
export const AREA_FLAG_CODES = [null, "unstable", "no_population"] as const
const flagCodeSchema = z.union([z.literal(0), z.literal(1), z.literal(2)])
export type AreaFlagCode = z.infer<typeof flagCodeSchema>

const levelMetricsSchema = z.object({
  /** Interior class breaks (see lib/geo/classify). */
  breaks: z.array(z.number()),
  /** [geoid, value, flag]; value is null when it can't be computed. */
  areas: z.array(z.tuple([z.string(), z.number().nullable(), flagCodeSchema])),
})

/** One metric for every state and county, applied to map features by GEOID. */
export const areaMetricsSchema = z.object({
  metric: z.enum(AREA_METRICS),
  state: levelMetricsSchema,
  county: levelMetricsSchema,
})
export type AreaMetrics = z.infer<typeof areaMetricsSchema>
export type LevelMetrics = z.infer<typeof levelMetricsSchema>

const multiPolygonSchema = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(z.array(lngLatSchema))),
})

/** Filter-independent facts about an area, including a simplified outline. */
export const areaInfoSchema = z.object({
  geoid: z.string(),
  level: z.enum(AREA_LEVELS),
  name: z.string(),
  stateFips: z.string(),
  landAreaKm2: z.number(),
  bbox: bboxSchema,
  outline: multiPolygonSchema,
})
export type AreaInfo = z.infer<typeof areaInfoSchema>

const scopeTotalsSchema = z.object({
  crashes: int,
  deaths: int,
  /** Deaths per 100,000 residents per year; null without population data. */
  rate: z.number().nullable(),
  flag: flagCodeSchema,
})
export type ScopeTotals = z.infer<typeof scopeTotalsSchema>

export const BREAKDOWN_DIMENSIONS = ["road_user", "light", "road_class", "setting"] as const
export type BreakdownDimension = (typeof BREAKDOWN_DIMENSIONS)[number]

/** Category keys per dimension (labels live in the domain vocabularies). */
export const BREAKDOWN_KEYS = {
  road_user: ROAD_USER_CATEGORY.values,
  light: [...LIGHT_OPTIONS.values, "other"] as const,
  road_class: FUNCTIONAL_CLASS.values,
  setting: RURAL_URBAN.values,
} as const satisfies Record<BreakdownDimension, readonly string[]>

const breakdownSchema = z.object({
  dimension: z.enum(BREAKDOWN_DIMENSIONS),
  items: z.array(
    z.object({
      key: z.string(),
      crashes: int,
      /** Share of the nation's matching crashes in this category, 0–1. */
      nationalShare: z.number(),
    })
  ),
})
export type Breakdown = z.infer<typeof breakdownSchema>

/** How an area compares with the rest of the country for the current filters. */
export const areaProfileSchema = z.object({
  geoid: z.string(),
  level: z.enum(AREA_LEVELS),
  name: z.string(),
  stateFips: z.string(),
  /** Latest population estimate within the selected years. */
  population: z.object({ year: int, value: int }).nullable(),
  totals: scopeTotalsSchema,
  /** The county's state; null for states. */
  state: scopeTotalsSchema.nullable(),
  national: scopeTotalsSchema,
  /**
   * Share of peers (counties or states) with a lower death rate, 0–1. Only
   * peers with a stable rate are ranked; null when this area's isn't stable.
   */
  rank: z
    .object({
      peers: z.enum(["counties", "states"]),
      national: z.number(),
      nationalPeers: int,
      /** Within the county's state; null for states. */
      inState: z.number().nullable(),
      inStatePeers: int,
    })
    .nullable(),
  /** Every year (ignores the year filter) so the trend has context. */
  trend: z.array(
    z.object({
      year: int,
      crashes: int,
      deaths: int,
      rate: z.number().nullable(),
      nationalRate: z.number().nullable(),
    })
  ),
  breakdowns: z.array(breakdownSchema),
})
export type AreaProfile = z.infer<typeof areaProfileSchema>

export const crashDetailSchema = z.object({
  id: int,
  year: int,
  /** Local date; null when the day wasn't recorded. */
  date: z.string().nullable(),
  month: int,
  /** Local time, no time zone. */
  hour: int.nullable(),
  minute: int.nullable(),
  fatalities: int,
  persons: int,
  vehicles: int,
  roadUser: z.enum(ROAD_USER_CATEGORY.values),
  alcoholInvolved: z.boolean(),
  speedingInvolved: z.boolean(),
  lightCondition: z.enum(LIGHT_CONDITION.values),
  weather: z.enum(WEATHER.values),
  ruralUrban: z.enum(RURAL_URBAN.values),
  functionalClass: z.enum(FUNCTIONAL_CLASS.values),
  stateFips: z.string(),
  county: z
    .object({ geoid: z.string(), name: z.string(), match: z.enum(COUNTY_MATCH.values) })
    .nullable(),
  location: lngLatSchema.nullable(),
  people: z.array(
    z.object({
      vehicleNumber: int,
      personNumber: int,
      personType: z.enum(PERSON_TYPE.values),
      injurySeverity: z.enum(INJURY_SEVERITY.values),
      age: int.nullable(),
      sex: z.enum(SEX.values),
    })
  ),
})
export type CrashDetail = z.infer<typeof crashDetailSchema>

/** Located crashes inside a bounding box (the "in this view" panel). */
export const viewportSummarySchema = z.object({
  crashes: int,
  deaths: int,
  byRoadUser: z.array(z.object({ key: z.enum(ROAD_USER_CATEGORY.values), crashes: int })),
  topCounties: z.array(
    z.object({
      geoid: z.string(),
      name: z.string(),
      stateFips: z.string(),
      crashes: int,
      deaths: int,
    })
  ),
})
export type ViewportSummary = z.infer<typeof viewportSummarySchema>

export const searchResultsSchema = z.array(
  z.object({
    geoid: z.string(),
    level: z.enum(AREA_LEVELS),
    name: z.string(),
    stateFips: z.string(),
    bbox: bboxSchema,
  })
)
export type SearchResult = z.infer<typeof searchResultsSchema>[number]

export const apiErrorSchema = z.object({ error: z.string() })
