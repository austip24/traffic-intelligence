"use client"

import { useEffect, useRef } from "react"

import { useMap } from "@/components/ui/map"
import { toQueryString, writeViewport } from "@/lib/explorer/url-state"
import type { MapView } from "@/types/geo"

const URL_WRITE_DELAY_MS = 300

type ViewportUrlSyncProps = {
  /** Receives every settled viewport; lets the parent remember it without re-rendering. */
  onViewSettled?: (view: MapView) => void
}

/**
 * Mirrors the settled map viewport into the URL so views are shareable.
 * Uses history.replaceState (which Next.js syncs with useSearchParams) rather
 * than router navigation, so panning never triggers a server round trip or
 * adds history entries.
 */
export function ViewportUrlSync({ onViewSettled }: ViewportUrlSyncProps) {
  const { map } = useMap()
  const onViewSettledRef = useRef(onViewSettled)

  useEffect(() => {
    onViewSettledRef.current = onViewSettled
  }, [onViewSettled])

  useEffect(() => {
    if (!map) return
    let timeout: ReturnType<typeof setTimeout> | undefined

    const handleMoveEnd = () => {
      const center = map.getCenter()
      const view: MapView = { center: [center.lng, center.lat], zoom: map.getZoom() }
      onViewSettledRef.current?.(view)

      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const params = writeViewport(
          new URLSearchParams(window.location.search),
          view
        )
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}?${toQueryString(params)}`
        )
      }, URL_WRITE_DELAY_MS)
    }

    map.on("moveend", handleMoveEnd)
    return () => {
      clearTimeout(timeout)
      map.off("moveend", handleMoveEnd)
    }
  }, [map])

  return null
}
