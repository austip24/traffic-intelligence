/**
 * Tile contract shared by the tile API (server) and map layers (client).
 * Changing a value here changes both sides together.
 */

/** Tile endpoints, i.e. `/api/tiles/{source}/{z}/{x}/{y}`. */
export const TILE_SOURCES = ["crashes", "areas"] as const
export type TileSource = (typeof TILE_SOURCES)[number]

/** MVT layer names inside the tiles. */
export const SOURCE_LAYERS = {
  crashCells: "crash_cells",
  crashes: "crashes",
  states: "states",
  counties: "counties",
} as const

/** Individual crashes from this zoom; aggregated cells below it. */
export const CRASH_POINTS_MIN_ZOOM = 11

/** Grid resolution for aggregated crash cells (cells per tile side). */
export const CRASH_CELLS_PER_TILE = 32

/** County outlines appear from this zoom; below it they'd be visual noise. */
export const COUNTIES_MIN_ZOOM = 4

/** Highest zoom tiles are generated for; MapLibre overzooms beyond. */
export const TILE_MAX_ZOOM = 14
