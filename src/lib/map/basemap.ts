import { z } from "zod"

import type { MapProps } from "@/components/ui/map"

const styleUrl = z.url().optional()

// NEXT_PUBLIC_ values are inlined at build time, so each must be referenced
// literally. Unset values fall back to mapcn's CARTO Positron / Dark Matter.
const light = styleUrl.parse(process.env.NEXT_PUBLIC_MAP_STYLE_LIGHT || undefined)
const dark = styleUrl.parse(process.env.NEXT_PUBLIC_MAP_STYLE_DARK || undefined)

export const basemapStyles: MapProps["styles"] =
  light || dark ? { light, dark } : undefined
