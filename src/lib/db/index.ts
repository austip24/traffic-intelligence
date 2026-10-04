import "server-only"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { serverEnv } from "@/lib/env"

import * as schema from "./schema"

type Database = ReturnType<typeof createDb>

function createDb() {
  const client = postgres(serverEnv().DATABASE_URL, {
    // The pooled Neon URL runs PgBouncer in transaction mode, which doesn't
    // support named prepared statements.
    prepare: false,
    // Serverless functions are short-lived; keep each instance's pool small.
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  })
  return drizzle(client, { schema, casing: "snake_case" })
}

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { trafficDb?: Database }

export function getDb(): Database {
  if (!globalForDb.trafficDb) globalForDb.trafficDb = createDb()
  return globalForDb.trafficDb
}
