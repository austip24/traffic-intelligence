import type { NextRequest } from "next/server"

import { dataResponse, serverErrorResponse } from "@/lib/api/responses"
import { getAreaTotals } from "@/lib/data/area-totals"
import { parseAreaMetric } from "@/lib/explorer/url-state"
import { parseCrashFilters } from "@/lib/filters/crash-filters"
import { buildAreaMetrics } from "@/lib/metrics/build-area-metrics"

/**
 * One metric for every state and county under the crash filters, e.g.
 * /api/areas/metrics?metric=rate&user=pedestrian. Values are compact
 * [geoid, value, flag] tuples that the map joins to boundary tiles by GEOID,
 * so changing a filter never re-downloads geometry.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  try {
    const totals = await getAreaTotals(parseCrashFilters(params))
    return dataResponse(buildAreaMetrics(totals, parseAreaMetric(params)), params)
  } catch (error) {
    return serverErrorResponse("area metrics", error)
  }
}
