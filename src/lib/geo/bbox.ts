import { z } from "zod"

import { WEB_MERCATOR_MAX_LAT } from "@/lib/geo/crs"
import type { BBox } from "@/types/geo"

const lng = z.number().min(-180).max(180)
const lat = z.number().min(-90).max(90)

/**
 * `minLng,minLat,maxLng,maxLat` in EPSG:4326 degrees. Antimeridian-crossing
 * boxes (minLng > maxLng) are rejected: the app's data never needs them and
 * callers clamp the viewport instead (see `boundsToBBox`).
 */
export const bboxParamSchema = z
  .string()
  .transform((raw) => raw.split(",").map((part) => (part.trim() === "" ? NaN : Number(part))))
  .pipe(z.tuple([lng, lat, lng, lat]))
  .refine(([minLng, minLat, maxLng, maxLat]) => minLng < maxLng && minLat < maxLat, {
    message: "bbox must be minLng,minLat,maxLng,maxLat with min < max",
  })
  .transform((b) => b as BBox)

export function formatBBox(bbox: BBox): string {
  return bbox.join(",")
}

// Decimal places by zoom: enough to match what's visible (≈1/10 of the
// viewport), coarse enough that small pans reuse cached summaries.
function bboxDecimals(zoom: number): number {
  if (zoom < 5) return 0
  if (zoom < 8) return 1
  if (zoom < 11) return 2
  return 3
}

/**
 * Converts the visible map bounds to a query bbox: clamped to valid ranges
 * (MapLibre reports longitudes past ±180 when the world wraps) and rounded
 * outward so the box always covers the viewport.
 */
export function boundsToBBox(bounds: BBox, zoom: number): BBox {
  const d = 10 ** bboxDecimals(zoom)
  const down = (v: number) => Math.floor(v * d) / d
  const up = (v: number) => Math.ceil(v * d) / d
  const clamp = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v))
  const [minLng, minLat, maxLng, maxLat] = bounds
  return [
    clamp(down(minLng), 180),
    clamp(down(minLat), WEB_MERCATOR_MAX_LAT),
    clamp(up(maxLng), 180),
    clamp(up(maxLat), WEB_MERCATOR_MAX_LAT),
  ]
}
