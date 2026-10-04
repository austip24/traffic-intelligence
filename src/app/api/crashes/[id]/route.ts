import type { NextRequest } from "next/server"

import { dataResponse, errorResponse, serverErrorResponse } from "@/lib/api/responses"
import { getCrashDetail } from "@/lib/data/crash-detail"
import { parseSelection } from "@/lib/explorer/url-state"

/** One crash and the people involved, by id (year * 1,000,000 + FARS ST_CASE). */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/crashes/[id]">) {
  const { id: raw } = await ctx.params
  // Same validation as a shared `?sel=crash-<id>` link.
  const selection = parseSelection(new URLSearchParams({ sel: `crash-${raw}` }))
  if (selection?.type !== "crash") return errorResponse(400, "Invalid crash id")
  try {
    const crash = await getCrashDetail(selection.id)
    if (!crash) return errorResponse(404, "Crash not found")
    return dataResponse(crash, request.nextUrl.searchParams)
  } catch (error) {
    return serverErrorResponse(`crash ${selection.id}`, error)
  }
}
