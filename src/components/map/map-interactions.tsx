"use client"

import type {
  MapGeoJSONFeature,
  MapMouseEvent,
  Map as MapLibreMap,
  PointLike,
} from "maplibre-gl"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { useLayers, useSelection } from "@/components/explorer/explorer-provider"
import { FeatureTooltip, type HoveredFeature } from "@/components/map/feature-tooltip"
import { useMap } from "@/components/ui/map"
import { CRASH_POINTS_MIN_ZOOM } from "@/lib/layers/tile-config"
import { LAYERS } from "@/lib/layers/registry"
import type { FeatureKind } from "@/lib/layers/types"

// When several features are under the pointer, the most specific wins.
const KIND_PRIORITY: Record<FeatureKind, number> = { crash: 0, "crash-cell": 1, area: 2 }

// Touch targets are imprecise; clicks search a small box around the point.
const CLICK_TOLERANCE_PX = 6
const TOOLTIP_OFFSET_PX = 14

type FeatureRef = { source: string; sourceLayer?: string; id: string | number }

function pickFeature(
  map: MapLibreMap,
  kinds: Map<string, FeatureKind>,
  where: PointLike | [PointLike, PointLike]
): { feature: MapGeoJSONFeature; kind: FeatureKind } | null {
  // Only query layers currently in the style (they're re-added after a theme swap).
  const layers = [...kinds.keys()].filter((id) => map.getLayer(id))
  if (layers.length === 0) return null
  let best: { feature: MapGeoJSONFeature; kind: FeatureKind } | null = null
  for (const feature of map.queryRenderedFeatures(where, { layers })) {
    const kind = kinds.get(feature.layer.id)
    if (!kind) continue
    if (!best || KIND_PRIORITY[kind] < KIND_PRIORITY[best.kind]) best = { feature, kind }
  }
  return best
}

/** Places the tooltip beside the pointer, flipping sides near the right/bottom edges. */
function positionTooltip(el: HTMLElement, bounds: HTMLElement, point: { x: number; y: number }) {
  const { clientWidth, clientHeight } = bounds
  const x =
    point.x + TOOLTIP_OFFSET_PX + el.offsetWidth > clientWidth
      ? point.x - TOOLTIP_OFFSET_PX - el.offsetWidth
      : point.x + TOOLTIP_OFFSET_PX
  const y =
    point.y + TOOLTIP_OFFSET_PX + el.offsetHeight > clientHeight
      ? point.y - TOOLTIP_OFFSET_PX - el.offsetHeight
      : point.y + TOOLTIP_OFFSET_PX
  el.style.transform = `translate(${Math.max(0, x)}px, ${Math.max(0, y)}px)`
}

/**
 * Hover tooltips and click selection for every interactive registry layer.
 *
 * Pointer handling stays outside React: moves are coalesced to one query per
 * animation frame, hover highlighting uses feature state, and the tooltip is
 * positioned by writing its transform directly. React only re-renders when
 * the hovered feature changes.
 */
export function MapInteractions({ portalTo }: { portalTo: HTMLElement }) {
  const { map } = useMap()
  const { layers } = useLayers()
  const { select } = useSelection()
  const [hovered, setHovered] = useState<HoveredFeature | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)

  const kinds = useMemo(() => {
    const result = new Map<string, FeatureKind>()
    for (const layer of LAYERS) {
      if (!layers[layer.id]?.visible) continue
      for (const [styleLayer, kind] of Object.entries(layer.interactive ?? {})) {
        result.set(styleLayer, kind)
      }
    }
    return result
  }, [layers])
  const kindsRef = useRef(kinds)
  const selectRef = useRef(select)
  useEffect(() => {
    kindsRef.current = kinds
    selectRef.current = select
  })

  useEffect(() => {
    if (!map) return
    const canvas = map.getCanvas()
    let frame = 0
    let hoverRef: FeatureRef | null = null
    let hoverKey: string | null = null

    const setHoverState = (next: FeatureRef | null) => {
      if (hoverRef && map.getSource(hoverRef.source)) {
        map.setFeatureState(hoverRef, { hover: false })
      }
      hoverRef = next
      if (next && map.getSource(next.source)) map.setFeatureState(next, { hover: true })
    }

    const clear = () => {
      cancelAnimationFrame(frame)
      frame = 0
      pointerRef.current = null
      setHoverState(null)
      hoverKey = null
      canvas.style.cursor = ""
      setHovered(null)
    }

    const update = () => {
      frame = 0
      const point = pointerRef.current
      if (!point) return
      const picked = pickFeature(map, kindsRef.current, [point.x, point.y])
      if (!picked) {
        if (hoverKey !== null) clear()
        return
      }
      const { feature, kind } = picked
      canvas.style.cursor = "pointer"
      const key = `${feature.layer.id}:${feature.id ?? JSON.stringify(feature.geometry)}`
      if (key !== hoverKey) {
        hoverKey = key
        setHoverState(
          feature.id !== undefined
            ? { source: feature.source, sourceLayer: feature.sourceLayer, id: feature.id }
            : null
        )
        setHovered({ kind, properties: { ...feature.properties } })
      }
      if (tooltipRef.current) positionTooltip(tooltipRef.current, canvas, point)
    }

    const onMove = (e: MapMouseEvent) => {
      pointerRef.current = { x: e.point.x, y: e.point.y }
      if (!frame) frame = requestAnimationFrame(update)
    }

    const onClick = (e: MapMouseEvent) => {
      const { x, y } = e.point
      // Exactly under the pointer first (what the tooltip showed), then nearby.
      const picked =
        pickFeature(map, kindsRef.current, [x, y]) ??
        pickFeature(map, kindsRef.current, [
          [x - CLICK_TOLERANCE_PX, y - CLICK_TOLERANCE_PX],
          [x + CLICK_TOLERANCE_PX, y + CLICK_TOLERANCE_PX],
        ])
      if (!picked) return
      const { feature, kind } = picked
      if (kind === "crash" && typeof feature.id === "number") {
        selectRef.current({ type: "crash", id: feature.id })
      } else if (kind === "area" && typeof feature.properties.geoid === "string") {
        selectRef.current({ type: "area", geoid: feature.properties.geoid })
      } else if (kind === "crash-cell" && feature.geometry.type === "Point") {
        // A cell is a summary; clicking it zooms toward individual crashes.
        const [lng, lat] = feature.geometry.coordinates
        map.easeTo({
          center: [lng, lat],
          zoom: Math.min(map.getZoom() + 2, CRASH_POINTS_MIN_ZOOM),
        })
      }
    }

    map.on("mousemove", onMove)
    map.on("mouseout", clear)
    map.on("dragstart", clear)
    map.on("click", onClick)
    return () => {
      cancelAnimationFrame(frame)
      map.off("mousemove", onMove)
      map.off("mouseout", clear)
      map.off("dragstart", clear)
      map.off("click", onClick)
      canvas.style.cursor = ""
    }
  }, [map])

  // New content changes the tooltip's size; re-place it before paint.
  useLayoutEffect(() => {
    if (hovered && map && tooltipRef.current && pointerRef.current) {
      positionTooltip(tooltipRef.current, map.getCanvas(), pointerRef.current)
    }
  }, [hovered, map])

  return createPortal(
    <div
      ref={tooltipRef}
      // Positioned imperatively; starts off-screen until the first move.
      className="pointer-events-none absolute top-0 left-0 z-20 will-change-transform"
      style={{ transform: "translate(-9999px, -9999px)" }}
    >
      {hovered && <FeatureTooltip feature={hovered} />}
    </div>,
    portalTo
  )
}
