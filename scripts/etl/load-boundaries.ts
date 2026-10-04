/**
 * Loads Census cartographic boundary files (1:500k) for states and counties.
 * Only the 50 states + DC are loaded; territories are out of scope for FARS.
 *
 * Usage: pnpm etl:boundaries
 */
import { sql } from "drizzle-orm"
import type * as GeoJSON from "geojson"
import * as shapefile from "shapefile"

import type { AreaLevel } from "@/lib/domain/area"

import { readZipEntry } from "./lib/csv"
import { connect } from "./lib/db"
import { upsertDataset } from "./lib/datasets"
import { rawPath } from "./lib/download"
import { TIGER_VINTAGE, tigerSource } from "./sources"

const MAX_STATE_FIPS = 56

type AreaFeature = {
  geoid: string
  level: AreaLevel
  name: string
  stateFips: string
  landAreaM2: number
  waterAreaM2: number
  geometry: GeoJSON.Geometry
}

const toArrayBuffer = (bytes: Uint8Array) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

async function readAreas(level: AreaLevel): Promise<AreaFeature[]> {
  const zip = rawPath(tigerSource(level))
  const base = `cb_${TIGER_VINTAGE}_us_${level}_500k`
  const source = await shapefile.open(
    toArrayBuffer(await readZipEntry(zip, `${base}.shp`)),
    toArrayBuffer(await readZipEntry(zip, `${base}.dbf`)),
    { encoding: "utf-8" } // per the .cpg sidecar
  )

  const features: AreaFeature[] = []
  for (let r = await source.read(); !r.done; r = await source.read()) {
    const p = r.value.properties as Record<string, string | number>
    const stateFips = String(p.STATEFP)
    if (Number(stateFips) > MAX_STATE_FIPS || !r.value.geometry) continue
    features.push({
      geoid: String(p.GEOID),
      level,
      // Counties use the legal/statistical name, e.g. "Cook County".
      name: String(level === "county" ? p.NAMELSAD : p.NAME),
      stateFips,
      landAreaM2: Number(p.ALAND),
      waterAreaM2: Number(p.AWATER),
      geometry: r.value.geometry,
    })
  }
  return features
}

/** Batches by serialized size: a few state outlines are several MB each. */
function* batchesBySize(features: AreaFeature[], maxBytes = 8_000_000) {
  let batch: AreaFeature[] = []
  let size = 0
  for (const f of features) {
    const bytes = JSON.stringify(f.geometry).length
    if (batch.length > 0 && size + bytes > maxBytes) {
      yield batch
      batch = []
      size = 0
    }
    batch.push(f)
    size += bytes
  }
  if (batch.length > 0) yield batch
}

async function main() {
  const states = await readAreas("state")
  const counties = await readAreas("county")
  console.log(`read ${states.length} states, ${counties.length} counties`)
  if (states.length !== 51) throw new Error(`Expected 51 states + DC, got ${states.length}`)

  const { db, close } = connect()
  try {
    await db.transaction(async (tx) => {
      // Crashes reference counties; clear assignments so areas can be replaced.
      await tx.execute(sql`UPDATE crashes SET county_geoid = NULL, county_match = NULL`)
      await tx.execute(sql`DELETE FROM areas`)

      for (const batch of batchesBySize([...states, ...counties])) {
        // Geometry is sent as GeoJSON and repaired/promoted in SQL so every
        // row is a valid MultiPolygon regardless of how the source encoded it.
        await tx.execute(sql`
          INSERT INTO areas (geoid, level, name, state_fips, land_area_m2, water_area_m2, tiger_vintage, geom)
          SELECT
            f->>'geoid', f->>'level', f->>'name', f->>'stateFips',
            (f->>'landAreaM2')::bigint, (f->>'waterAreaM2')::bigint, ${TIGER_VINTAGE},
            ST_Multi(ST_CollectionExtract(ST_MakeValid(
              ST_SetSRID(ST_GeomFromGeoJSON(f->'geometry'), 4326)
            ), 3))
          FROM jsonb_array_elements(${JSON.stringify(batch)}::jsonb) AS f
        `)
      }
    })
    console.log("areas loaded; re-run `pnpm etl:fars` if crashes were already loaded")

    await upsertDataset(db, {
      id: "census-boundaries",
      name: `Cartographic Boundary Files ${TIGER_VINTAGE} (1:500,000)`,
      publisher: "U.S. Census Bureau",
      version: String(TIGER_VINTAGE),
      sourceUrl: `https://www2.census.gov/geo/tiger/GENZ${TIGER_VINTAGE}/shp/`,
      license: "Public domain (U.S. Government work)",
      attribution: "U.S. Census Bureau, Cartographic Boundary Files",
      rowCount: states.length + counties.length,
      notes: "50 states + DC. NAD83 coordinates stored as EPSG:4326 (difference < 2 m).",
      qualityReport: { states: states.length, counties: counties.length },
      retrievedAt: new Date(),
    })
  } finally {
    await close()
  }
}

await main()
