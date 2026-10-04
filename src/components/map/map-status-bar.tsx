"use client"

import { useEffect, useState } from "react"

import { useMap } from "@/components/ui/map"

/** Thin progress bar along the top of the map while tiles are loading. */
export function MapStatusBar() {
  const { map } = useMap()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!map) return
    const start = () => setLoading(true)
    const stop = () => setLoading(false)
    map.on("dataloading", start)
    map.on("idle", stop)
    return () => {
      map.off("dataloading", start)
      map.off("idle", stop)
    }
  }, [map])

  return (
    <div
      role="progressbar"
      aria-label="Loading map data"
      aria-hidden={!loading}
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden"
    >
      <div
        className={
          loading
            ? "h-full w-1/3 animate-[map-loading_1.1s_ease-in-out_infinite] bg-primary motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-60"
            : "hidden"
        }
      />
    </div>
  )
}
