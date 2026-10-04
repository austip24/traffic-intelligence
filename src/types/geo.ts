/**
 * Coordinate conventions used throughout the app:
 * - All coordinates exchanged with the client are WGS84 (EPSG:4326) degrees.
 * - Positions are always GeoJSON order: [longitude, latitude].
 * - Web Mercator (EPSG:3857) is used only inside the tile pipeline.
 */

/** [longitude, latitude] in EPSG:4326 degrees. */
export type LngLat = [lng: number, lat: number]

/** [minLng, minLat, maxLng, maxLat] in EPSG:4326 degrees. */
export type BBox = [minLng: number, minLat: number, maxLng: number, maxLat: number]

/** The part of the map viewport that is persisted and shareable. */
export type MapView = {
  center: LngLat
  zoom: number
}
