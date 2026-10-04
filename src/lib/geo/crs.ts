import type { BBox } from "@/types/geo"

// Web Mercator is undefined at the poles; MapLibre clamps latitude to this.
export const WEB_MERCATOR_MAX_LAT = 85.051129

export const MIN_ZOOM = 0
export const MAX_ZOOM = 22

/** Contiguous United States, used as the default extent (EPSG:4326). */
export const CONUS_BBOX: BBox = [-125.0, 24.4, -66.9, 49.4]
