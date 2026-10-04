"use client"

import type { LayerSpecification, Map as MapLibreMap, VectorTileSource } from "maplibre-gl"
import { useEffect, useRef } from "react"

import { useMap } from "@/components/ui/map"
import type { LayerPlacement, MapImage } from "@/lib/layers/types"

type VectorTileLayerProps = {
  sourceId: string
  tilesUrl: string
  minzoom: number
  maxzoom: number
  promoteId?: Record<string, string>
  /** Style for the current theme and opacity; re-applied when it changes. */
  specs: LayerSpecification[]
  placement: LayerPlacement
  /** Images the specs reference (e.g. fill patterns). */
  images?: MapImage[]
  visible: boolean
}

/**
 * The basemap layer to insert data before. Basemaps interleave a few labels
 * (e.g. waterway names) before their road layers, so:
 * - below-roads: before the first label, under the road network
 * - above-roads: before the labels that follow the last road or building
 *   layer, so data covers streets but place names stay readable
 */
function insertBeforeId(map: MapLibreMap, placement: LayerPlacement): string | undefined {
  const layers = map.getStyle().layers
  if (placement === "below-roads") return layers.find((l) => l.type === "symbol")?.id
  const lastNonLabel = layers.findLastIndex((l) => l.type !== "symbol")
  return layers.slice(lastNonLabel + 1).find((l) => l.type === "symbol")?.id
}

function ensureImages(map: MapLibreMap, images: MapImage[] | undefined) {
  for (const { id, width, height, data } of images ?? []) {
    if (!map.hasImage(id)) map.addImage(id, { width, height, data })
  }
}

function applyPaint(map: MapLibreMap, spec: LayerSpecification) {
  if (!("paint" in spec) || !spec.paint) return
  type SetPaint = Parameters<MapLibreMap["setPaintProperty"]>
  for (const [property, value] of Object.entries(spec.paint) as [SetPaint[1], SetPaint[2]][]) {
    map.setPaintProperty(spec.id, property, value)
  }
}

/**
 * A MapLibre vector-tile source and its layers, managed imperatively.
 *
 * React never re-renders map features: filter changes swap the tile URL with
 * setTiles(), opacity/theme changes update paint properties, and visibility
 * toggles a layout property. The source is only re-added when the basemap
 * style is replaced (mapcn swaps styles on theme change, which drops every
 * custom layer; `isLoaded` goes false during the swap).
 */
export function VectorTileLayer({
  sourceId,
  tilesUrl,
  minzoom,
  maxzoom,
  promoteId,
  specs,
  placement,
  images,
  visible,
}: VectorTileLayerProps) {
  const { map, isLoaded } = useMap()
  const latest = useRef({ tilesUrl, specs, placement, images, visible })
  useEffect(() => {
    latest.current = { tilesUrl, specs, placement, images, visible }
  })

  // Add on style load; remove on unmount or before a style swap.
  useEffect(() => {
    if (!map || !isLoaded) return
    const { tilesUrl, specs, placement, images, visible } = latest.current
    ensureImages(map, images)
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: "vector", tiles: [tilesUrl], minzoom, maxzoom, promoteId })
    }
    const beforeId = insertBeforeId(map, placement)
    for (const spec of specs) {
      if (map.getLayer(spec.id)) continue
      map.addLayer(
        { ...spec, layout: { ...("layout" in spec ? spec.layout : {}), visibility: visible ? "visible" : "none" } } as LayerSpecification,
        beforeId
      )
    }
    return () => {
      // The style may already be gone (theme swap or map teardown).
      if (!map.style) return
      for (const spec of specs) if (map.getLayer(spec.id)) map.removeLayer(spec.id)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    }
  }, [map, isLoaded, sourceId, minzoom, maxzoom, promoteId])

  useEffect(() => {
    if (!map || !isLoaded) return
    const source = map.getSource<VectorTileSource>(sourceId)
    source?.setTiles([tilesUrl])
  }, [map, isLoaded, sourceId, tilesUrl])

  useEffect(() => {
    if (!map || !isLoaded) return
    // Theme changes can switch patterns before the new style finishes loading.
    ensureImages(map, images)
    for (const spec of specs) {
      if (!map.getLayer(spec.id)) continue
      map.setLayoutProperty(spec.id, "visibility", visible ? "visible" : "none")
      applyPaint(map, spec)
    }
  }, [map, isLoaded, specs, images, visible])

  return null
}
