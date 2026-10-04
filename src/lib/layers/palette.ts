import type { RoadUserCategory } from "@/lib/domain/crash"
import type { MapTheme } from "@/lib/layers/types"

/**
 * Map data colors, kept separate from UI tokens: they must stay legible on
 * both basemaps (CARTO Positron / Dark Matter) and be distinguishable for
 * common color-vision deficiencies. Legends always add text labels.
 */
export const ROAD_USER_COLORS: Record<RoadUserCategory, string> = {
  pedestrian: "#e0457b",
  bicyclist: "#f59f00",
  motorcyclist: "#845ef7",
  vehicle: "#339af0",
}

/** Sequential YlOrRd (ColorBrewer), low → high; legible on light and dark basemaps. */
export const DENSITY_COLORS = ["#fed976", "#feb24c", "#fd8d3c", "#f03b20", "#bd0026", "#800026"]

/**
 * Sequential purple ramps for area choropleths, low → high: a different hue
 * family from the crash density ramp, so the two layers can't be confused.
 * More always means more contrast with the basemap: darker on the light map
 * (ColorBrewer BuPu, without its near-white end, which vanishes on Positron),
 * lighter on the dark map.
 */
export const CHOROPLETH_COLORS: Record<MapTheme, readonly string[]> = {
  light: ["#9ebcda", "#8c96c6", "#8c6bb1", "#88419d", "#6e016b"],
  dark: ["#3f3a78", "#5b4b9c", "#8068bd", "#ab8fd8", "#dcc8f0"],
}

export function choroplethNeutrals(theme: MapTheme) {
  return theme === "dark" ? { noData: "#3f3f46" } : { noData: "#d4d4d8" }
}

export function outlineColors(theme: MapTheme) {
  return theme === "dark"
    ? { state: "#a1a1aa", county: "#52525b", halo: "#18181b", hover: "#fafafa", selection: "#38bdf8" }
    : { state: "#52525b", county: "#c4c4cc", halo: "#ffffff", hover: "#18181b", selection: "#0284c7" }
}
