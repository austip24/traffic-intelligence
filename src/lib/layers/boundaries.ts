import type { ExpressionSpecification } from "maplibre-gl"

import { outlineColors } from "@/lib/layers/palette"
import {
  COUNTIES_MIN_ZOOM,
  SOURCE_LAYERS,
  TILE_MAX_ZOOM,
} from "@/lib/layers/tile-config"
import type { LayerDefinition } from "@/lib/layers/types"

export const boundariesLayer: LayerDefinition = {
  id: "boundaries",
  title: "State and county lines",
  description: "Census 2024 boundaries, used to group crashes by place.",
  attribution: "U.S. Census Bureau",
  source: {
    type: "vector-tiles",
    tileSource: "areas",
    minzoom: 0,
    maxzoom: TILE_MAX_ZOOM,
    promoteId: { [SOURCE_LAYERS.states]: "geoid", [SOURCE_LAYERS.counties]: "geoid" },
    usesCrashFilters: false,
  },
  placement: "below-roads",
  style: ({ theme, opacity, source }) => {
    const colors = outlineColors(theme)
    const hoverOpacity: ExpressionSpecification = [
      "case",
      ["boolean", ["feature-state", "hover"], false],
      1,
      0,
    ]
    return [
      // Invisible fills so areas can be hovered and clicked anywhere inside,
      // not just on their outlines. Counties take over where they're drawn.
      {
        id: "boundaries-states-hit",
        type: "fill",
        source,
        "source-layer": SOURCE_LAYERS.states,
        maxzoom: COUNTIES_MIN_ZOOM,
        paint: { "fill-color": "#000000", "fill-opacity": 0 },
      },
      {
        id: "boundaries-counties-hit",
        type: "fill",
        source,
        "source-layer": SOURCE_LAYERS.counties,
        minzoom: COUNTIES_MIN_ZOOM,
        paint: { "fill-color": "#000000", "fill-opacity": 0 },
      },
      {
        id: "boundaries-counties",
        type: "line",
        source,
        "source-layer": SOURCE_LAYERS.counties,
        minzoom: COUNTIES_MIN_ZOOM,
        paint: {
          "line-color": colors.county,
          "line-width": ["interpolate", ["linear"], ["zoom"], COUNTIES_MIN_ZOOM, 0.4, 10, 1],
          "line-opacity": opacity,
        },
      },
      {
        id: "boundaries-states",
        type: "line",
        source,
        "source-layer": SOURCE_LAYERS.states,
        paint: {
          "line-color": colors.state,
          "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.8, 10, 2],
          "line-opacity": opacity,
        },
      },
      {
        id: "boundaries-states-hover",
        type: "line",
        source,
        "source-layer": SOURCE_LAYERS.states,
        maxzoom: COUNTIES_MIN_ZOOM,
        paint: { "line-color": colors.hover, "line-width": 2, "line-opacity": hoverOpacity },
      },
      {
        id: "boundaries-counties-hover",
        type: "line",
        source,
        "source-layer": SOURCE_LAYERS.counties,
        minzoom: COUNTIES_MIN_ZOOM,
        paint: { "line-color": colors.hover, "line-width": 2, "line-opacity": hoverOpacity },
      },
    ]
  },
  interactive: {
    "boundaries-states-hit": "area",
    "boundaries-counties-hit": "area",
  },
  legends: [
    {
      spec: {
        type: "line",
        title: "Boundaries",
        items: [
          { label: "State", color: "#71717a", width: 2 },
          { label: "County", color: "#a1a1aa", width: 1 },
        ],
      },
    },
  ],
  defaultVisible: true,
  defaultOpacity: 0.8,
}
