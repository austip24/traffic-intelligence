import { existsSync } from "node:fs"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/lib/db/schema"

// ETL runs outside Next.js, so load env files the same way drizzle-kit does.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file)
}

/**
 * Database for bulk loading. Prefers the direct (unpooled) URL: long-running
 * transactions and large statements don't belong on a transaction pooler.
 */
export function connect() {
  const url =
    process.env.TRAFFIC_INTELLIGENCE_DATABASE_URL_UNPOOLED ??
    process.env.TRAFFIC_INTELLIGENCE_DATABASE_URL
  if (!url) {
    throw new Error(
      "Set TRAFFIC_INTELLIGENCE_DATABASE_URL (and ideally TRAFFIC_INTELLIGENCE_DATABASE_URL_UNPOOLED) in .env.local or .env. See .env.example."
    )
  }
  const client = postgres(url, { max: 1, onnotice: () => {} })
  const db = drizzle(client, { schema, casing: "snake_case" })
  return { db, client, close: () => client.end() }
}

export type Db = ReturnType<typeof connect>["db"]

/** Splits rows into chunks so each INSERT stays under Postgres' 65,535 parameter limit. */
export function* chunks<T>(rows: T[], size: number): Generator<T[]> {
  for (let i = 0; i < rows.length; i += size) yield rows.slice(i, i + size)
}
