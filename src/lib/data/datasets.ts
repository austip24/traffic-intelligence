import "server-only"

import { asc } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"

import { getDb } from "@/lib/db"
import { datasets } from "@/lib/db/schema"

export type DatasetInfo = {
  id: string
  name: string
  publisher: string
  version: string
  sourceUrl: string
  license: string
  attribution: string
  rowCount: number
  notes: string | null
  retrievedAt: string
}

/** Provenance of every loaded dataset, for attribution and methodology. */
export async function getDatasets(): Promise<DatasetInfo[]> {
  "use cache"
  cacheLife("days")
  cacheTag("datasets")

  const rows = await getDb()
    .select({
      id: datasets.id,
      name: datasets.name,
      publisher: datasets.publisher,
      version: datasets.version,
      sourceUrl: datasets.sourceUrl,
      license: datasets.license,
      attribution: datasets.attribution,
      rowCount: datasets.rowCount,
      notes: datasets.notes,
      retrievedAt: datasets.retrievedAt,
    })
    .from(datasets)
    .orderBy(asc(datasets.id))
  return rows.map((r) => ({ ...r, retrievedAt: new Date(r.retrievedAt).toISOString() }))
}
