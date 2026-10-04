import type { ExpressionSpecification } from "maplibre-gl"

import { ROAD_USER_CATEGORY } from "@/lib/domain/crash"
import { DENSITY_COLORS, outlineColors, ROAD_USER_COLORS } from "@/lib/layers/palette"
import {
  CRASH_POINTS_MIN_ZOOM,
  SOURCE_LAYERS,
  TILE_MAX_ZOOM,
} from "@/lib/layers/tile-config"
import type { LayerDefinition } from "@/lib/layers/types"

/**
 * Density classes for aggregated cells, in fatal crashes per 1,000 km² per
 * year (see crashTile). Log-spaced so national, regional and city views all
 * spread across the scale. Size grows with the class too, so the encoding
 * never relies on color alone.
 */
const DENSITY_CLASSES = [
  { min: 0, label: "Under 1", radius: 2.5 },
  { min: 1, label: "1–3", radius: 3.5 },
  { min: 3, label: "3–10", radius: 4.5 },
  { min: 10, label: "10–30", radius: 5.5 },
  { min: 30, label: "30–100", radius: 6.5 },
  { min: 100, label: "100 or more", radius: 7.5 },
] as const

function densityStep(output: (i: number) => string | number): ExpressionSpecification {
  const [first, ...rest] = DENSITY_CLASSES.map((c, i) => [c.min, output(i)] as const)
  return [
    "step",
    ["get", "density"],
    first[1],
    ...rest.flatMap(([min, value]) => [min, value]),
  ] as ExpressionSpecification
}

export const crashesLayer: LayerDefinition = {
  id: "crashes",
  title: "Fatal crashes",
  description:
    "Every crash on a public road in which someone died within 30 days. Shown as density per area when zoomed out.",
  attribution: "NHTSA FARS",
  source: {
    type: "vector-tiles",
    tileSource: "crashes",
    minzoom: 2,
    maxzoom: TILE_MAX_ZOOM,
    usesCrashFilters: true,
  },
  placement: "above-roads",
  style: ({ theme, opacity, source }) => {
    const { halo, hover } = outlineColors(theme)
    return [
      {
        id: "crashes-cells",
        type: "circle",
        source,
        "source-layer": SOURCE_LAYERS.crashCells,
        maxzoom: CRASH_POINTS_MIN_ZOOM,
        paint: {
          "circle-radius": densityStep((i) => DENSITY_CLASSES[i].radius),
          "circle-color": densityStep((i) => DENSITY_COLORS[i]),
          "circle-opacity": 0.85 * opacity,
          "circle-stroke-color": halo,
          "circle-stroke-width": 0.5,
          "circle-stroke-opacity": 0.6 * opacity,
        },
      },
      {
        id: "crashes-points",
        type: "circle",
        source,
        "source-layer": SOURCE_LAYERS.crashes,
        minzoom: CRASH_POINTS_MIN_ZOOM,
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            CRASH_POINTS_MIN_ZOOM, ["case", [">", ["get", "fatalities"], 1], 5, 3.5],
            16, ["case", [">", ["get", "fatalities"], 1], 10, 7],
          ],
          "circle-color": [
            "match", ["get", "road_user"],
            "pedestrian", ROAD_USER_COLORS.pedestrian,
            "bicyclist", ROAD_USER_COLORS.bicyclist,
            "motorcyclist", ROAD_USER_COLORS.motorcyclist,
            ROAD_USER_COLORS.vehicle,
          ],
          "circle-opacity": 0.9 * opacity,
          "circle-stroke-color": [
            "case", ["boolean", ["feature-state", "hover"], false], hover, halo,
          ],
          "circle-stroke-width": [
            "case", ["boolean", ["feature-state", "hover"], false], 2.5, 1.25,
          ],
          "circle-stroke-opacity": opacity,
        },
      },
    ]
  },
  interactive: {
    "crashes-cells": "crash-cell",
    "crashes-points": "crash",
  },
  legends: [
    {
      maxzoom: CRASH_POINTS_MIN_ZOOM,
      spec: {
        type: "classes",
        title: "Fatal crashes per 1,000 km² per year",
        items: DENSITY_CLASSES.map((c, i) => ({
          label: c.label,
          color: DENSITY_COLORS[i],
          radius: c.radius,
        })),
      },
    },
    {
      minzoom: CRASH_POINTS_MIN_ZOOM,
      spec: {
        type: "categorical",
        title: "Fatal crash (larger: multiple deaths)",
        items: ROAD_USER_CATEGORY.values.map((k) => ({
          label: ROAD_USER_CATEGORY.labels[k],
          color: ROAD_USER_COLORS[k],
        })),
      },
    },
  ],
  defaultVisible: true,
  defaultOpacity: 1,
}
