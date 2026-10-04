import type { NextRequest } from "next/server"

import { DATA_CACHE, serverErrorResponse } from "@/lib/api/responses"
import { getCrashSummary } from "@/lib/data/crash-summary"
import { parseCrashFilters } from "@/lib/filters/crash-filters"

/** National crash totals for the given filters, with a per-year breakdown. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  try {
    const summary = await getCrashSummary(parseCrashFilters(params))
    return Response.json(summary, {
      headers: {
        "Cache-Control": params.has("v") ? DATA_CACHE.versioned : DATA_CACHE.default,
      },
    })
  } catch (error) {
    return serverErrorResponse("crash summary", error)
  }
}
