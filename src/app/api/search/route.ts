import type { NextRequest } from "next/server"
import { z } from "zod"

import { dataResponse, errorResponse, serverErrorResponse } from "@/lib/api/responses"
import { searchAreas } from "@/lib/data/areas"

const querySchema = z.string().trim().min(2).max(64)

/** States and counties matching a name, e.g. /api/search?q=cook%20il */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const q = querySchema.safeParse(params.get("q") ?? "")
  if (!q.success) return errorResponse(400, "q must be 2–64 characters")
  try {
    return dataResponse(await searchAreas(q.data), params)
  } catch (error) {
    return serverErrorResponse("search", error)
  }
}
