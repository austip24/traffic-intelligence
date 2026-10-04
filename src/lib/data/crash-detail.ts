import "server-only"

import { asc, eq, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { roadUserCategorySql } from "@/lib/data/crash-sql"
import { getDb } from "@/lib/db"
import { areas, crashes, crashPeople } from "@/lib/db/schema"
import type { RoadUserCategory } from "@/lib/domain/crash"
import type { CrashDetail } from "@/lib/api/schemas"

// Aliased as `c` so the shared SQL fragments (which reference `c.`) apply.
const c = alias(crashes, "c")

/** One crash with the people involved, for the inspector. */
export async function getCrashDetail(id: number): Promise<CrashDetail | null> {
  const db = getDb()
  const [crash, people] = await Promise.all([
    db
      .select({
        id: c.id,
        year: c.year,
        date: c.crashDate,
        month: c.month,
        hour: c.hour,
        minute: c.minute,
        fatalities: c.fatalities,
        persons: c.persons,
        vehicles: c.vehicles,
        roadUser: sql<RoadUserCategory>`${roadUserCategorySql}`,
        alcoholInvolved: c.alcoholInvolved,
        speedingInvolved: c.speedingInvolved,
        lightCondition: c.lightCondition,
        weather: c.weather,
        ruralUrban: c.ruralUrban,
        functionalClass: c.functionalClass,
        stateFips: c.stateFips,
        countyGeoid: c.countyGeoid,
        countyName: areas.name,
        countyMatch: c.countyMatch,
        lng: sql<number | null>`ST_X(c.geom)`,
        lat: sql<number | null>`ST_Y(c.geom)`,
      })
      .from(c)
      .leftJoin(areas, eq(areas.geoid, c.countyGeoid))
      .where(eq(c.id, id))
      .then(([row]) => row),
    db
      .select({
        vehicleNumber: crashPeople.vehicleNumber,
        personNumber: crashPeople.personNumber,
        personType: crashPeople.personType,
        injurySeverity: crashPeople.injurySeverity,
        age: crashPeople.age,
        sex: crashPeople.sex,
      })
      .from(crashPeople)
      .where(eq(crashPeople.crashId, id))
      .orderBy(asc(crashPeople.vehicleNumber), asc(crashPeople.personNumber)),
  ])
  if (!crash) return null

  const { countyGeoid, countyName, countyMatch, lng, lat, ...rest } = crash
  return {
    ...rest,
    county:
      countyGeoid && countyName && countyMatch
        ? { geoid: countyGeoid, name: countyName, match: countyMatch }
        : null,
    location: lng !== null && lat !== null ? [lng, lat] : null,
    people,
  }
}
