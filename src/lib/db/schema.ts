import { sql } from "drizzle-orm"
import {
  bigint,
  boolean,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { geometry } from "@/lib/db/postgis"
import type { AreaLevel } from "@/lib/domain/area"
import type {
  CountyMatch,
  FunctionalClass,
  InjurySeverity,
  LightCondition,
  PersonType,
  RuralUrban,
  Sex,
  Weather,
} from "@/lib/domain/crash"

/*
 * CRS conventions:
 * - `geom` columns are EPSG:4326 (lon/lat degrees) and are the source of truth.
 *   Census boundaries are NAD83 (EPSG:4269) and are stored as 4326 without a
 *   datum shift; the difference (<2 m) is far below the 1:500k generalization.
 * - `geom_3857` columns are generated Web Mercator copies used only for
 *   vector tile generation, so tile queries never transform per request.
 */

/** Provenance for every loaded dataset; surfaced in the UI for attribution. */
export const datasets = pgTable("datasets", {
  id: text().primaryKey(),
  name: text().notNull(),
  publisher: text().notNull(),
  version: text().notNull(),
  sourceUrl: text().notNull(),
  license: text().notNull(),
  attribution: text().notNull(),
  rowCount: integer().notNull(),
  notes: text(),
  /** Per-run data-quality metrics written by the ETL. */
  qualityReport: jsonb(),
  retrievedAt: timestamp({ withTimezone: true }).notNull(),
  loadedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

/** States and counties from Census cartographic boundary files (1:500k). */
export const areas = pgTable(
  "areas",
  {
    /** State: 2-digit FIPS. County: 5-digit state+county FIPS. */
    geoid: text().primaryKey(),
    level: text().$type<AreaLevel>().notNull(),
    name: text().notNull(),
    stateFips: char({ length: 2 }).notNull(),
    landAreaM2: bigint("land_area_m2", { mode: "number" }).notNull(),
    waterAreaM2: bigint("water_area_m2", { mode: "number" }).notNull(),
    tigerVintage: smallint().notNull(),
    geom: geometry({ type: "MultiPolygon", srid: 4326 }).notNull(),
    geom3857: geometry("geom_3857", { type: "MultiPolygon", srid: 3857 })
      .notNull()
      .generatedAlwaysAs(sql`ST_Transform(geom, 3857)`),
    /** Guaranteed to fall inside the polygon, unlike a centroid. */
    labelPoint: geometry({ type: "Point", srid: 4326 })
      .notNull()
      .generatedAlwaysAs(sql`ST_PointOnSurface(geom)`),
  },
  (t) => [
    check("areas_level_check", sql`${t.level} in ('state', 'county')`),
    index("areas_geom_idx").using("gist", t.geom),
    index("areas_geom_3857_idx").using("gist", t.geom3857),
    index("areas_level_state_idx").on(t.level, t.stateFips),
    index("areas_name_trgm_idx").using("gin", sql`${t.name} gin_trgm_ops`),
  ]
)

/** Census Population Estimates (July 1) by area and year. */
export const areaPopulation = pgTable(
  "area_population",
  {
    geoid: text()
      .notNull()
      .references(() => areas.geoid, { onDelete: "cascade" }),
    year: smallint().notNull(),
    population: integer().notNull(),
    /** PEP vintage the estimate came from, e.g. "pep-v2024". */
    source: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.geoid, t.year] })]
)

/** One row per fatal crash (NHTSA FARS "accident" file). */
export const crashes = pgTable(
  "crashes",
  {
    /** year * 1_000_000 + FARS ST_CASE; ST_CASE is only unique within a year. */
    id: bigint({ mode: "number" }).primaryKey(),
    year: smallint().notNull(),
    stCase: integer().notNull(),
    month: smallint().notNull(),
    /** Local date of the crash; null when the day is unknown. No time zone. */
    crashDate: date({ mode: "string" }),
    /** Local hour 0–23; null when unknown. */
    hour: smallint(),
    minute: smallint(),
    fatalities: smallint().notNull(),
    persons: smallint().notNull(),
    vehicles: smallint().notNull(),
    involvesPedestrian: boolean().notNull(),
    involvesBicyclist: boolean().notNull(),
    involvesMotorcyclist: boolean().notNull(),
    /** Police-reported alcohol involvement for at least one driver. */
    alcoholInvolved: boolean().notNull(),
    speedingInvolved: boolean().notNull(),
    lightCondition: text().$type<LightCondition>().notNull(),
    weather: text().$type<Weather>().notNull(),
    ruralUrban: text().$type<RuralUrban>().notNull(),
    functionalClass: text().$type<FunctionalClass>().notNull(),
    stateFips: char({ length: 2 }).notNull(),
    /** FARS-reported county code; kept for reference, not used for joins. */
    farsCountyCode: char({ length: 3 }),
    /** Assigned by spatial join against `areas`, not from FARS codes. */
    countyGeoid: text().references(() => areas.geoid),
    countyMatch: text().$type<CountyMatch>(),
    /** Null when FARS has no usable coordinates for the crash. */
    geom: geometry({ type: "Point", srid: 4326 }),
    geom3857: geometry("geom_3857", {
      type: "Point",
      srid: 3857,
    }).generatedAlwaysAs(sql`ST_Transform(geom, 3857)`),
  },
  (t) => [
    index("crashes_geom_3857_idx").using("gist", t.geom3857),
    index("crashes_year_idx").on(t.year),
    index("crashes_county_year_idx").on(t.countyGeoid, t.year),
    index("crashes_state_year_idx").on(t.stateFips, t.year),
  ]
)

/** People involved in each crash (FARS "person" file), for detail views. */
export const crashPeople = pgTable(
  "crash_people",
  {
    crashId: bigint({ mode: "number" })
      .notNull()
      .references(() => crashes.id, { onDelete: "cascade" }),
    /** 0 for non-motorists (pedestrians, cyclists, …). */
    vehicleNumber: smallint().notNull(),
    personNumber: smallint().notNull(),
    personType: text().$type<PersonType>().notNull(),
    injurySeverity: text().$type<InjurySeverity>().notNull(),
    age: smallint(),
    sex: text().$type<Sex>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.crashId, t.vehicleNumber, t.personNumber] })]
)
