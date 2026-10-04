"use client"

import { useEffect, useMemo, useRef } from "react"

import { useMapHandle, useSelection } from "@/components/explorer/explorer-provider"
import { MapGeoJSON, MapMarker, MarkerContent, useMap } from "@/components/ui/map"
import { useAreaInfo, useCrashDetail } from "@/hooks/use-explorer-data"
import { outlineColors } from "@/lib/layers/palette"

const CRASH_FOCUS_ZOOM = 14

/**
 * Draws the selected area's outline (from /api/areas/[geoid], so it shows at
 * any zoom and with boundaries hidden) or a ring around the selected crash.
 *
 * With `fitOnLoad`, the map moves to the selection once its location is
 * known: a shared link with `sel=` but no viewport opens on the selection.
 */
export function SelectionHighlight({ fitOnLoad }: { fitOnLoad: boolean }) {
  const { map, resolvedTheme } = useMap()
  const { selection } = useSelection()
  const { fitBBox } = useMapHandle()
  const area = useAreaInfo(selection?.type === "area" ? selection.geoid : null)
  const crash = useCrashDetail(selection?.type === "crash" ? selection.id : null)
  const color = outlineColors(resolvedTheme).selection

  const areaInfo = selection?.type === "area" && area.data?.geoid === selection.geoid ? area.data : null
  const crashLocation =
    selection?.type === "crash" && crash.data?.id === selection.id ? crash.data.location : null

  const pendingFit = useRef(fitOnLoad)
  useEffect(() => {
    if (!pendingFit.current || !map) return
    if (areaInfo) {
      pendingFit.current = false
      fitBBox(areaInfo.bbox)
    } else if (crashLocation) {
      pendingFit.current = false
      map.jumpTo({ center: crashLocation, zoom: CRASH_FOCUS_ZOOM })
    }
  }, [map, areaInfo, crashLocation, fitBBox])

  const outline = useMemo(
    () =>
      areaInfo
        ? ({ type: "Feature", geometry: areaInfo.outline, properties: {} } as const)
        : null,
    [areaInfo]
  )
  const linePaint = useMemo(
    () => ({ "line-color": color, "line-width": 3, "line-opacity": 0.95 }),
    [color]
  )

  if (outline) {
    return <MapGeoJSON id="selection" data={outline} fillPaint={false} linePaint={linePaint} />
  }
  if (crashLocation) {
    return (
      <MapMarker longitude={crashLocation[0]} latitude={crashLocation[1]}>
        <MarkerContent className="pointer-events-none cursor-default">
          <span
            aria-hidden
            className="block size-6 rounded-full border-[3px] bg-transparent shadow-[0_0_0_2px_var(--background)]"
            style={{ borderColor: color }}
          />
        </MarkerContent>
      </MapMarker>
    )
  }
  return null
}
