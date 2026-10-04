import "server-only"

import { sql, type SQL } from "drizzle-orm"

/**
 * Bounding box of an EPSG:4326 geometry as [minLng, minLat, maxLng, maxLat].
 * Alaska's Aleutians cross the antimeridian, which would make its box span
 * the whole globe; for such geometries the box is computed in 0–360°
 * longitude and shifted back, giving minLng < -180 (MapLibre handles that).
 */
export function bboxSql(geom: SQL): SQL {
  return sql`CASE
    WHEN ST_XMax(${geom}) - ST_XMin(${geom}) > 180 THEN ARRAY[
      ST_XMin(ST_ShiftLongitude(${geom})) - 360, ST_YMin(${geom}),
      ST_XMax(ST_ShiftLongitude(${geom})) - 360, ST_YMax(${geom})
    ]
    ELSE ARRAY[ST_XMin(${geom}), ST_YMin(${geom}), ST_XMax(${geom}), ST_YMax(${geom})]
  END::float8[]`
}

const round5 = (n: number) => Math.round(n * 1e5) / 1e5

export function toBBox(values: number[]): [number, number, number, number] {
  const [minLng, minLat, maxLng, maxLat] = values.map(round5)
  return [minLng, minLat, maxLng, maxLat]
}
