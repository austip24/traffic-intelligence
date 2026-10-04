import { eq } from "drizzle-orm"

import { datasets } from "@/lib/db/schema"

import type { Db } from "./db"

type DatasetRecord = typeof datasets.$inferInsert

/** Records provenance for a loaded dataset; attribution is shown in the UI. */
export async function upsertDataset(db: Db, record: DatasetRecord) {
  await db
    .insert(datasets)
    .values(record)
    .onConflictDoUpdate({ target: datasets.id, set: { ...record, loadedAt: new Date() } })
}

export async function getQualityReport(db: Db, id: string) {
  const [row] = await db
    .select({ qualityReport: datasets.qualityReport })
    .from(datasets)
    .where(eq(datasets.id, id))
  return (row?.qualityReport ?? {}) as Record<string, unknown>
}
