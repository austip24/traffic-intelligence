import { customType } from "drizzle-orm/pg-core"

type GeometryType = "Point" | "MultiPolygon" | "LineString" | "MultiLineString"

/** EPSG:4326 for canonical storage, EPSG:3857 only for tile generation. */
type Srid = 4326 | 3857

/**
 * PostGIS geometry column with an explicit type and SRID.
 *
 * Drizzle's built-in `geometry` only decodes points, so this type is
 * deliberately opaque: values are written as EWKT strings
 * (e.g. "SRID=4326;POINT(-87.6 41.8)") and geometry is read back through SQL
 * functions (ST_AsMVT, ST_AsGeoJSON) rather than through the ORM.
 */
export const geometry = customType<{
  data: string
  driverData: string
  config: { type: GeometryType; srid: Srid }
  configRequired: true
}>({
  dataType(config) {
    return `geometry(${config.type},${config.srid})`
  },
})

/** EWKT for a WGS84 point. Positions are always [longitude, latitude]. */
export function pointEwkt(lng: number, lat: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`
}
