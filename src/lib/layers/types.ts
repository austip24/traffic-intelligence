import type { LayerSpecification } from "maplibre-gl"

import type { AreaMetrics } from "@/lib/api/schemas"
import type { TileSource } from "@/lib/layers/tile-config"
import type { AreaMetric } from "@/lib/metrics/area-metrics"

export type MapTheme = "light" | "dark"

/** Legend content. Every variant pairs color with a text label (never color alone). */
export type LegendSpec =
  | {
      type: "categorical"
      title: string
      items: { label: string; color: string }[]
    }
  | {
      /** Ordered classes encoded by both color and circle size. */
      type: "classes"
      title: string
      items: { label: string; color: string; radius: number }[]
    }
  | {
      type: "line"
      title: string
      items: { label: string; color: string; width: number }[]
    }
  | {
      /** Area fills; `hatched` items are drawn with the map's hatch pattern. */
      type: "fill"
      title: string
      items: { label: string; color: string; hatched?: boolean }[]
    }

export type LayerStyleContext = {
  theme: MapTheme
  /** User-chosen layer opacity, 0–1; multiply into every opacity paint value. */
  opacity: number
  /** MapLibre source id this definition's layers must reference. */
  source: string
}

/** Data a legend may depend on, beyond the layer's own definition. */
export type LegendContext = {
  theme: MapTheme
  areaMetric: AreaMetric
  areaMetrics: AreaMetrics | undefined
}

/** What a map feature represents, which decides its tooltip and click action. */
export type FeatureKind = "crash" | "crash-cell" | "area"

export type LayerPlacement = "below-roads" | "above-roads"

/** A raster image a layer's style references (e.g. a fill pattern). */
export type MapImage = {
  id: string
  width: number
  height: number
  /** RGBA, row-major. */
  data: Uint8Array
}

/**
 * Everything the app needs to show a dataset: how to fetch it, how to draw
 * it and how to explain it. The layer panel, legend and map render from
 * these definitions, so adding a dataset doesn't require UI changes.
 */
export type LayerDefinition = {
  id: string
  title: string
  description: string
  attribution: string
  source: {
    type: "vector-tiles"
    tileSource: TileSource
    minzoom: number
    maxzoom: number
    /** Feature property used as the feature id (for hover/selection state). */
    promoteId?: Record<string, string>
    /** Whether tile URLs carry the crash filters. */
    usesCrashFilters: boolean
  }
  style: (ctx: LayerStyleContext) => LayerSpecification[]
  /**
   * Where the layers sit in the basemap. Area fills go under roads so streets
   * stay readable through them; point data goes above roads and buildings.
   * Both stay under place labels.
   */
  placement: LayerPlacement
  /** Images the style uses; re-added whenever the basemap style is replaced. */
  images?: (theme: MapTheme) => MapImage[]
  /** Style layer ids that respond to hover and click, and what they hold. */
  interactive?: Record<string, FeatureKind>
  /** Legends by zoom band; the active one depends on the current zoom. */
  legends: {
    minzoom?: number
    maxzoom?: number
    spec: LegendSpec | ((ctx: LegendContext) => LegendSpec | null)
  }[]
  /** Extra settings shown under the layer in the layer panel. */
  controls?: "area-metric"
  defaultVisible: boolean
  defaultOpacity: number
}
