import type { NextRequest } from "next/server"

import { dataResponse, errorResponse, serverErrorResponse } from "@/lib/api/responses"
import { getAreaProfile } from "@/lib/data/area-profile"
import { GEOID_PATTERN } from "@/lib/domain/area"
import { parseCrashFilters } from "@/lib/filters/crash-filters"

/** Totals, rate, ranking, trend and breakdowns for an area under the crash filters. */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/areas/[geoid]/profile">
) {
  const { geoid } = await ctx.params
  if (!GEOID_PATTERN.test(geoid)) return errorResponse(400, "Invalid area id")
  const params = request.nextUrl.searchParams
  try {
    const profile = await getAreaProfile(geoid, parseCrashFilters(params))
    if (!profile) return errorResponse(404, "Area not found")
    return dataResponse(profile, params)
  } catch (error) {
    return serverErrorResponse(`area profile ${geoid}`, error)
  }
}
