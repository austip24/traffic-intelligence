import { z } from "zod"

/** Web Mercator (EPSG:3857) world width in meters. */
export const WEB_MERCATOR_WORLD_METERS = 40_075_016.685578488

/** Highest zoom the tile API serves; MapLibre overzooms beyond it. */
export const MAX_TILE_ZOOM = 14

/** Vector tile coordinate resolution (MVT extent). */
export const TILE_EXTENT = 4096

/** Validated XYZ tile address. Rejects tiles that don't exist at their zoom. */
export const tileSchema = z
  .object({
    z: z.coerce.number().int().min(0).max(MAX_TILE_ZOOM),
    x: z.coerce.number().int().min(0),
    y: z.coerce.number().int().min(0),
  })
  .refine(({ z, x, y }) => x < 2 ** z && y < 2 ** z, {
    message: "Tile coordinates out of range for zoom",
  })

export type Tile = z.infer<typeof tileSchema>

/** Width of one tile at zoom `z`, in Web Mercator meters. */
export function tileWidthMeters(z: number): number {
  return WEB_MERCATOR_WORLD_METERS / 2 ** z
}

/**
 * Size of one tile pixel (at TILE_EXTENT resolution) in meters. Used as the
 * simplification tolerance so geometry detail never exceeds what can render.
 */
export function tilePixelMeters(z: number): number {
  return tileWidthMeters(z) / TILE_EXTENT
}
