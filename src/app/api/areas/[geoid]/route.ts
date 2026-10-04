import type { NextRequest } from "next/server"

import { dataResponse, errorResponse, serverErrorResponse } from "@/lib/api/responses"
import { getAreaInfo } from "@/lib/data/areas"
import { GEOID_PATTERN } from "@/lib/domain/area"

/** Name, extent and simplified outline of a state or county. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/areas/[geoid]">) {
  const { geoid } = await ctx.params
  if (!GEOID_PATTERN.test(geoid)) return errorResponse(400, "Invalid area id")
  try {
    const info = await getAreaInfo(geoid)
    if (!info) return errorResponse(404, "Area not found")
    return dataResponse(info, request.nextUrl.searchParams)
  } catch (error) {
    return serverErrorResponse(`area ${geoid}`, error)
  }
}
