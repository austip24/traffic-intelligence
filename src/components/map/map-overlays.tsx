"use client"

import { SearchX } from "lucide-react"

import { useCrashFilters, useLayers } from "@/components/explorer/explorer-provider"
import { TimeRangeControl } from "@/components/filters/time-range-control"
import { Button } from "@/components/ui/button"
import { useCrashSummary } from "@/hooks/use-crash-summary"

/** Shown over the map when the filters match no crashes at all. */
function NoResults() {
  const { data } = useCrashSummary()
  const { resetFilters } = useCrashFilters()
  const { layers } = useLayers()
  if (!data || data.crashes > 0 || !layers.crashes?.visible) return null

  return (
    <div
      role="status"
      className="pointer-events-auto absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-md border bg-background/95 py-2 pr-2 pl-3 text-sm shadow-sm backdrop-blur-sm"
    >
      <SearchX className="size-4 text-muted-foreground" />
      No fatal crashes match these filters.
      <Button size="sm" variant="outline" onClick={resetFilters}>
        Reset filters
      </Button>
    </div>
  )
}

/**
 * Overlays that sit on the map but don't need the MapLibre instance.
 * The time control is desktop-only; on small screens the year range lives
 * in the Filters sheet instead so the map stays usable.
 */
export function MapOverlays() {
  return (
    <>
      <NoResults />
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 hidden justify-center px-28 md:flex">
        <TimeRangeControl className="pointer-events-auto" />
      </div>
    </>
  )
}
