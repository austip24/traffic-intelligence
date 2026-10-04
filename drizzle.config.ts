import { existsSync } from "node:fs"
import { defineConfig } from "drizzle-kit"

// drizzle-kit doesn't read Next.js env files. Load them with Next's precedence:
// .env.local first, since loadEnvFile never overrides an already-set variable.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file)
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  // Migrations and DDL need a direct (unpooled) connection.
  dbCredentials: {
    url:
      process.env.TRAFFIC_INTELLIGENCE_DATABASE_URL_UNPOOLED ??
      process.env.TRAFFIC_INTELLIGENCE_DATABASE_URL ??
      "",
  },
  // Ignore PostGIS-owned objects such as spatial_ref_sys.
  extensionsFilters: ["postgis"],
  strict: true,
  verbose: true,
})
