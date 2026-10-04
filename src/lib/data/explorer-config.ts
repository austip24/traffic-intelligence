import "server-only"

import { max } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"

import { getDb } from "@/lib/db"
import { datasets } from "@/lib/db/schema"

export type ExplorerConfig = {
  /**
   * Changes whenever any dataset is reloaded. Added to data URLs as `?v=` so
   * CDN-cached tiles and summaries can be cached long-term yet never go stale.
   */
  dataVersion: string
}

export async function getExplorerConfig(): Promise<ExplorerConfig> {
  "use cache"
  cacheLife("hours")
  cacheTag("datasets")

  const [row] = await getDb().select({ loadedAt: max(datasets.loadedAt) }).from(datasets)
  const loadedAt = row?.loadedAt ? new Date(row.loadedAt).getTime() : 0
  return { dataVersion: Math.floor(loadedAt / 1000).toString(36) }
}
