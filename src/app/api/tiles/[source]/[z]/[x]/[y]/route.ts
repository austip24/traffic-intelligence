import type { NextRequest } from "next/server"

import { DATA_CACHE, errorResponse, serverErrorResponse } from "@/lib/api/responses"
import { areasTile, crashTile } from "@/lib/data/tiles"
import { parseCrashFilters } from "@/lib/filters/crash-filters"
import { tileSchema } from "@/lib/geo/tiles"
import { TILE_SOURCES, type TileSource } from "@/lib/layers/tile-config"

const isTileSource = (value: string): value is TileSource =>
  (TILE_SOURCES as readonly string[]).includes(value)

/** Mapbox Vector Tiles for the map, e.g. /api/tiles/crashes/6/14/24?from=2020 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/tiles/[source]/[z]/[x]/[y]">
) {
  const { source, ...coords } = await ctx.params
  if (!isTileSource(source)) return errorResponse(404, `Unknown tile source "${source}"`)

  const tile = tileSchema.safeParse(coords)
  if (!tile.success) return errorResponse(400, "Invalid tile coordinates")

  const params = request.nextUrl.searchParams
  try {
    const mvt =
      source === "crashes"
        ? await crashTile(tile.data, parseCrashFilters(params))
        : await areasTile(tile.data)

    const cacheControl = params.has("v") ? DATA_CACHE.versioned : DATA_CACHE.default
    // An empty tile is a normal result (nothing here); 204 lets MapLibre skip parsing.
    if (mvt.byteLength === 0) {
      return new Response(null, { status: 204, headers: { "Cache-Control": cacheControl } })
    }
    return new Response(mvt as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.mapbox-vector-tile",
        "Cache-Control": cacheControl,
      },
    })
  } catch (error) {
    return serverErrorResponse(`tile ${source}/${tile.data.z}/${tile.data.x}/${tile.data.y}`, error)
  }
}
