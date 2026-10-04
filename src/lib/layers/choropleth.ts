import type { ExpressionSpecification } from "maplibre-gl"

import type { LevelMetrics } from "@/lib/api/schemas"
import type { AreaLevel } from "@/lib/domain/area"
import { classLabels } from "@/lib/geo/classify"
import { CHOROPLETH_COLORS, choroplethNeutrals, outlineColors } from "@/lib/layers/palette"
import { COUNTIES_MIN_ZOOM, SOURCE_LAYERS, TILE_MAX_ZOOM } from "@/lib/layers/tile-config"
import type { LayerDefinition, LegendContext, LegendSpec, MapImage, MapTheme } from "@/lib/layers/types"
import { AREA_FLAG_LABELS, AREA_METRIC_INFO } from "@/lib/metrics/area-metrics"

export const CHOROPLETH_LAYER_ID = "areas"

/** Style layer ids, by area level; the metrics are applied to these. */
export const CHOROPLETH_STYLE_LAYERS = {
  state: { fill: "areas-states-fill", hatch: "areas-states-hatch", sourceLayer: SOURCE_LAYERS.states },
  county: {
    fill: "areas-counties-fill",
    hatch: "areas-counties-hatch",
    sourceLayer: SOURCE_LAYERS.counties,
  },
} as const satisfies Record<AreaLevel, { fill: string; hatch: string; sourceLayer: string }>

/** States below this zoom, counties from it (matching the boundary tiles). */
export const CHOROPLETH_LEVEL_ZOOM = COUNTIES_MIN_ZOOM

/**
 * Palette index for each class. With fewer classes than colors (many equal
 * values), classes are spread across the ramp so they stay distinguishable.
 */
export function classColorIndexes(classes: number): number[] {
  const last = CHOROPLETH_COLORS.light.length - 1
  if (classes <= 1) return [Math.round(last / 2)]
  return Array.from({ length: classes }, (_, i) => Math.round((i * last) / (classes - 1)))
}

/**
 * Feature state written per area (see AreaMetricsState):
 * - `color`: palette index, or -1 when the area has no value
 * - `hover`: pointer is over the area
 */
function fillColor(theme: MapTheme): ExpressionSpecification {
  return [
    "match",
    ["to-number", ["coalesce", ["feature-state", "color"], -2]],
    ...CHOROPLETH_COLORS[theme].flatMap((color, i) => [i, color]),
    -1,
    choroplethNeutrals(theme).noData,
    // No state yet (metrics loading): draw nothing rather than a wrong color.
    "rgba(0,0,0,0)",
    // A spread of label/output pairs can't be checked against match's tuple type.
  ] as unknown as ExpressionSpecification
}

const HATCH_SIZE = 8

/** Diagonal hatch for areas whose value needs caution; drawn over the fill. */
function hatchImage(theme: MapTheme): MapImage {
  const [r, g, b] = theme === "dark" ? [244, 244, 245] : [24, 24, 27]
  const data = new Uint8Array(HATCH_SIZE * HATCH_SIZE * 4)
  for (let y = 0; y < HATCH_SIZE; y++) {
    for (let x = 0; x < HATCH_SIZE; x++) {
      // One-pixel diagonal stripes that tile seamlessly.
      if ((x + y) % HATCH_SIZE !== 0) continue
      data.set([r, g, b, 170], (y * HATCH_SIZE + x) * 4)
    }
  }
  return { id: `hatch-${theme}`, width: HATCH_SIZE, height: HATCH_SIZE, data }
}

/** Legend for one level's current metric, or null until the values load. */
function levelLegend(level: AreaLevel) {
  return ({ areaMetric, areaMetrics, theme }: LegendContext): LegendSpec | null => {
    if (!areaMetrics || areaMetrics.metric !== areaMetric) return null
    const values: LevelMetrics = areaMetrics[level]
    const info = AREA_METRIC_INFO[areaMetric]
    const labels = classLabels(values.breaks, info.format)
    const colors = classColorIndexes(labels.length).map((i) => CHOROPLETH_COLORS[theme][i])
    const hasFlag = (flag: number) => values.areas.some(([, , f]) => f === flag)

    return {
      type: "fill",
      title: `${info.legendTitle}, by ${level}`,
      items: [
        ...labels.map((label, i) => ({ label, color: colors[i] })),
        ...(hasFlag(1)
          ? [{ label: AREA_FLAG_LABELS.unstable, color: "transparent", hatched: true }]
          : []),
        ...(hasFlag(2)
          ? [
              {
                label: AREA_FLAG_LABELS.no_population,
                color: choroplethNeutrals(theme).noData,
                hatched: true,
              },
            ]
          : []),
      ],
    }
  }
}

export const choroplethLayer: LayerDefinition = {
  id: CHOROPLETH_LAYER_ID,
  title: "State and county comparison",
  description:
    "Each area shaded by the selected measure under the current filters. Rates use Census population estimates.",
  attribution: "NHTSA FARS · U.S. Census Bureau",
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
    const hover = outlineColors(theme).hover
    const levels = [
      { ...CHOROPLETH_STYLE_LAYERS.state, band: { maxzoom: CHOROPLETH_LEVEL_ZOOM } },
      { ...CHOROPLETH_STYLE_LAYERS.county, band: { minzoom: CHOROPLETH_LEVEL_ZOOM } },
    ]
    return levels.flatMap(({ fill, hatch, sourceLayer, band }) => [
      {
        id: fill,
        type: "fill" as const,
        source,
        "source-layer": sourceLayer,
        ...band,
        paint: { "fill-color": fillColor(theme), "fill-opacity": 0.75 * opacity },
      },
      {
        id: hatch,
        type: "fill" as const,
        source,
        "source-layer": sourceLayer,
        ...band,
        // Filled in with flagged GEOIDs once metrics load (fill-pattern can't
        // read feature state).
        filter: ["in", ["get", "geoid"], ["literal", []]] as ExpressionSpecification,
        paint: { "fill-pattern": hatchImage(theme).id, "fill-opacity": opacity },
      },
      {
        id: `${fill}-hover`,
        type: "line" as const,
        source,
        "source-layer": sourceLayer,
        ...band,
        paint: {
          "line-color": hover,
          "line-width": 2,
          "line-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            opacity,
            0,
          ] as ExpressionSpecification,
        },
      },
    ])
  },
  images: (theme) => [hatchImage(theme)],
  interactive: {
    [CHOROPLETH_STYLE_LAYERS.state.fill]: "area",
    [CHOROPLETH_STYLE_LAYERS.county.fill]: "area",
  },
  legends: [
    { maxzoom: CHOROPLETH_LEVEL_ZOOM, spec: levelLegend("state") },
    { minzoom: CHOROPLETH_LEVEL_ZOOM, spec: levelLegend("county") },
  ],
  controls: "area-metric",
  defaultVisible: false,
  defaultOpacity: 0.9,
}
