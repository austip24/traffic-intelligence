import { z } from "zod"

import { MAX_ZOOM, MIN_ZOOM, WEB_MERCATOR_MAX_LAT } from "@/lib/geo/crs"
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
