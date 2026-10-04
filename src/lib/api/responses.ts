import "server-only"

/** Cache policy for data that only changes when the ETL runs. */
export const DATA_CACHE = {
  /** Browser: 1 hour. CDN: 1 day, then serve stale for a week while refreshing. */
  default: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  /** Versioned URLs (`?v=`) change whenever data is reloaded. */
  versioned: "public, max-age=86400, s-maxage=31536000, immutable",
} as const

export function errorResponse(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } })
}

/**
 * Logs the real error server-side and returns a generic message, so database
 * details never reach the client.
 */
export function serverErrorResponse(context: string, error: unknown) {
  console.error(`[api] ${context}`, error)
  return errorResponse(500, "Something went wrong while loading data.")
}

/** JSON with the data cache policy; versioned (`?v=`) URLs are cached immutably. */
export function dataResponse(data: unknown, params: URLSearchParams) {
  return Response.json(data, {
    headers: { "Cache-Control": params.has("v") ? DATA_CACHE.versioned : DATA_CACHE.default },
  })
}
