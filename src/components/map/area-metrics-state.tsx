"use client"

import type { ExpressionSpecification } from "maplibre-gl"
import { useEffect } from "react"

import { useLayers } from "@/components/explorer/explorer-provider"
import { useMap } from "@/components/ui/map"
import { useAreaMetrics } from "@/hooks/use-explorer-data"
import { AREA_LEVELS } from "@/lib/domain/area"
import { classIndex } from "@/lib/geo/classify"
import {
  CHOROPLETH_LAYER_ID,
  CHOROPLETH_STYLE_LAYERS,
  classColorIndexes,
} from "@/lib/layers/choropleth"

/**
 * Joins area metrics to the boundary tiles by GEOID using feature state, so a
 * filter or metric change only moves a few KB of numbers: geometry tiles are
 * never refetched. Flagged areas get the hatch overlay via a layer filter,
 * because pattern fills can't read feature state.
 *
 * Re-runs after a basemap swap (`isLoaded` toggles), which drops all state.
 */
export function AreaMetricsState() {
  const { map, isLoaded } = useMap()
  const { layers } = useLayers()
  const { data } = useAreaMetrics()
  const visible = !!layers[CHOROPLETH_LAYER_ID]?.visible

  useEffect(() => {
    if (!map || !isLoaded || !data || !visible) return
    const source = CHOROPLETH_LAYER_ID
    if (!map.getSource(source)) return

    for (const level of AREA_LEVELS) {
      const { sourceLayer, hatch } = CHOROPLETH_STYLE_LAYERS[level]
      const { breaks, areas } = data[level]
      const colors = classColorIndexes(breaks.length + 1)
      const flagged: string[] = []

      map.removeFeatureState({ source, sourceLayer })
      for (const [geoid, value, flag] of areas) {
        map.setFeatureState(
          { source, sourceLayer, id: geoid },
          { color: value === null ? -1 : colors[classIndex(value, breaks)] }
        )
        if (flag !== 0) flagged.push(geoid)
      }
      if (map.getLayer(hatch)) {
        const filter: ExpressionSpecification = ["in", ["get", "geoid"], ["literal", flagged]]
        map.setFilter(hatch, filter)
      }
    }
  }, [map, isLoaded, data, visible])

  return null
}
