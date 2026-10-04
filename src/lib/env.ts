import "server-only"

import { z } from "zod"

const serverEnvSchema = z.object({
  /** Pooled connection string (Vercel Postgres / Neon). */
  TRAFFIC_INTELLIGENCE_DATABASE_URL: z.string().min(1).startsWith("postgres"),
})

let cached: z.infer<typeof serverEnvSchema> | undefined

/**
 * Server-only environment, validated on first use rather than at import so
 * routes that never touch the database still build without credentials.
 */
export function serverEnv() {
  if (!cached) {
    const result = serverEnvSchema.safeParse(process.env)
    if (!result.success) {
      // Name the variables, never print their values.
      const names = result.error.issues.map((i) => i.path.join(".")).join(", ")
      throw new Error(`Invalid server environment: ${names}. See .env.example.`)
    }
    cached = result.data
  }
  return cached
}
