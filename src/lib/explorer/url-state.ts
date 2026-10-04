import { z } from "zod"

import { GEOID_PATTERN } from "@/lib/domain/area"
import { CRASH_YEAR_MAX, CRASH_YEAR_MIN } from "@/lib/filters/crash-filters"
import { MAX_ZOOM, MIN_ZOOM, WEB_MERCATOR_MAX_LAT } from "@/lib/geo/crs"
import {
  DEFAULT_AREA_METRIC,
  isAreaMetric,
  type AreaMetric,
} from "@/lib/metrics/area-metrics"
import type { MapView } from "@/types/geo"

// URL params are user-controlled; an empty string must not coerce to 0.
const numberParam = z.string().trim().min(1).pipe(z.coerce.number())

const viewportParamsSchema = z.object({
  lng: numberParam.pipe(z.number().min(-180).max(180)),
  lat: numberParam.pipe(
    z.number().min(-WEB_MERCATOR_MAX_LAT).max(WEB_MERCATOR_MAX_LAT)
  ),
  z: numberParam.pipe(z.number().min(MIN_ZOOM).max(MAX_ZOOM)),
})

/**
 * Reads the shareable viewport from URL params. Returns null unless all of
 * lng, lat and z are present and valid, so a partial or tampered URL falls
 * back to the default extent instead of an arbitrary location.
 */
export function parseViewport(params: URLSearchParams): MapView | null {
  const result = viewportParamsSchema.safeParse({
    lng: params.get("lng") ?? undefined,
    lat: params.get("lat") ?? undefined,
    z: params.get("z") ?? undefined,
  })
  if (!result.success) return null

  const { lng, lat, z: zoom } = result.data
  return { center: [lng, lat], zoom }
}

// Coordinate precision scales with zoom so URLs stay short at national scale
// while still locating a street at high zoom (5 decimals ≈ 1.1 m).
function coordinateDecimals(zoom: number): number {
  if (zoom < 6) return 2
  if (zoom < 10) return 3
  if (zoom < 14) return 4
  return 5
}

/**
 * Visible layers from `?layers=a,b`. Absent means "defaults"; present but
 * empty means "all layers off", so that state is shareable too.
 */
export function parseVisibleLayers(
  params: URLSearchParams,
  known: readonly string[],
  defaults: readonly string[]
): string[] {
  if (!params.has("layers")) return [...defaults]
  const requested = (params.get("layers") ?? "").split(",")
  return known.filter((id) => requested.includes(id))
}

export function writeVisibleLayers(
  params: URLSearchParams,
  visible: readonly string[],
  defaults: readonly string[]
): URLSearchParams {
  const next = new URLSearchParams(params)
  const isDefault =
    visible.length === defaults.length && defaults.every((id) => visible.includes(id))
  if (isDefault) next.delete("layers")
  else next.set("layers", visible.join(","))
  return next
}

/** Returns a copy of `params` with the viewport written; other params are kept. */
export function writeViewport(
  params: URLSearchParams,
  view: MapView
): URLSearchParams {
  const next = new URLSearchParams(params)
  const decimals = coordinateDecimals(view.zoom)
  next.set("lng", view.center[0].toFixed(decimals))
  next.set("lat", view.center[1].toFixed(decimals))
  next.set("z", view.zoom.toFixed(2))
  return next
}

/**
 * The feature shown in the inspector. Shareable via `?sel=crash-<id>` or
 * `?sel=area-<geoid>` (a hyphen, unlike a colon, survives URL encoding as is).
 */
export type Selection =
  | { type: "crash"; id: number }
  | { type: "area"; geoid: string }

// Crash ids are year * 1,000,000 + FARS ST_CASE (see the crashes table).
const crashIdSchema = z.coerce
  .number()
  .int()
  .min(CRASH_YEAR_MIN * 1_000_000)
  .max(CRASH_YEAR_MAX * 1_000_000 + 999_999)

export function parseSelection(params: URLSearchParams): Selection | null {
  const raw = params.get("sel")
  if (!raw) return null
  const [type, value] = raw.split("-", 2)
  if (type === "crash") {
    const id = crashIdSchema.safeParse(value)
    return id.success ? { type: "crash", id: id.data } : null
  }
  if (type === "area" && value && GEOID_PATTERN.test(value)) {
    return { type: "area", geoid: value }
  }
  return null
}

export function selectionKey(selection: Selection): string {
  return selection.type === "crash" ? `crash-${selection.id}` : `area-${selection.geoid}`
}

export function writeSelection(
  params: URLSearchParams,
  selection: Selection | null
): URLSearchParams {
  const next = new URLSearchParams(params)
  if (selection) next.set("sel", selectionKey(selection))
  else next.delete("sel")
  return next
}

/** Choropleth metric from `?metric=`; the default is omitted from URLs. */
export function parseAreaMetric(params: URLSearchParams): AreaMetric {
  const raw = params.get("metric")
  return isAreaMetric(raw) ? raw : DEFAULT_AREA_METRIC
}

export function writeAreaMetric(params: URLSearchParams, metric: AreaMetric): URLSearchParams {
  const next = new URLSearchParams(params)
  if (metric === DEFAULT_AREA_METRIC) next.delete("metric")
  else next.set("metric", metric)
  return next
}

/**
 * Serializes params for the address bar. URLSearchParams percent-encodes
 * commas, which are valid in query strings; keeping them makes shared links
 * like `?layers=areas,crashes` readable.
 */
export function toQueryString(params: URLSearchParams): string {
  return params.toString().replace(/%2C/gi, ",")
}
