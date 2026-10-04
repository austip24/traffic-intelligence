import type { NextRequest } from "next/server"

import { dataResponse, errorResponse, serverErrorResponse } from "@/lib/api/responses"
import { getViewportSummary } from "@/lib/data/viewport-summary"
import { parseCrashFilters } from "@/lib/filters/crash-filters"
import { bboxParamSchema } from "@/lib/geo/bbox"

/**
 * Located crashes in a bounding box, e.g.
 * /api/crashes/viewport?bbox=-88.2,41.6,-87.3,42.1 (EPSG:4326 degrees).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const bbox = bboxParamSchema.safeParse(params.get("bbox") ?? "")
  if (!bbox.success) {
    return errorResponse(400, "bbox must be minLng,minLat,maxLng,maxLat in degrees")
  }
  try {
    return dataResponse(await getViewportSummary(bbox.data, parseCrashFilters(params)), params)
  } catch (error) {
    return serverErrorResponse("viewport summary", error)
  }
}
