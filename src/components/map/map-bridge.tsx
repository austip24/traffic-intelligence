"use client"

import { useEffect } from "react"

import { useMapHandle, useSettledViewport } from "@/components/explorer/explorer-provider"
import { useMap } from "@/components/ui/map"
import { boundsToBBox } from "@/lib/geo/bbox"

const VIEWPORT_SETTLE_MS = 300

/**
 * Connects the MapLibre instance to explorer state outside the map:
 * - exposes it to camera actions (search results, "zoom to" buttons)
 * - publishes the settled, rounded viewport for the "in this view" summary
 */
export function MapBridge() {
  const { map } = useMap()
  const { mapRef } = useMapHandle()
  const { setViewport } = useSettledViewport()

  useEffect(() => {
    if (!map) return
    mapRef.current = map
    return () => {
      if (mapRef.current === map) mapRef.current = null
    }
  }, [map, mapRef])

  useEffect(() => {
    if (!map) return
    let timeout: ReturnType<typeof setTimeout> | undefined
    const publish = () => {
      const b = map.getBounds()
      // Whole zoom levels: the summary only needs to know roughly how far in.
      const zoom = Math.round(map.getZoom())
      setViewport({
        bbox: boundsToBBox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom),
        zoom,
      })
    }
    const onMoveEnd = () => {
      clearTimeout(timeout)
      timeout = setTimeout(publish, VIEWPORT_SETTLE_MS)
    }
    publish()
    map.on("moveend", onMoveEnd)
    return () => {
      clearTimeout(timeout)
      map.off("moveend", onMoveEnd)
    }
  }, [map, setViewport])

  return null
}
