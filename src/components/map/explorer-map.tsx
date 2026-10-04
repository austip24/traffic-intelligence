"use client"

import { MonitorX } from "lucide-react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

import { AreaMetricsState } from "@/components/map/area-metrics-state"
import { MapBridge } from "@/components/map/map-bridge"
import { MapInteractions } from "@/components/map/map-interactions"
import { MapLegend } from "@/components/map/map-legend"
import { MapStatusBar } from "@/components/map/map-status-bar"
import { RegistryLayers } from "@/components/map/registry-layers"
import { SelectionHighlight } from "@/components/map/selection-highlight"
import { ViewportUrlSync } from "@/components/map/viewport-url-sync"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Map, MapControls, useMap, type MapProps } from "@/components/ui/map"
import { parseViewport } from "@/lib/explorer/url-state"
import { CONUS_BBOX } from "@/lib/geo/crs"
import { basemapStyles } from "@/lib/map/basemap"
import { isWebGLSupported } from "@/lib/map/webgl"
import type { MapView } from "@/types/geo"

// This component only ever renders on the client (see MapLoader), so reading
// window.location directly is safe. The URL is read once at mount: later URL
// writes come from the map itself and must not re-render it.
function readInitialView(): MapView | null {
  return parseViewport(new URLSearchParams(window.location.search))
}

function initialCamera(view: MapView | null): Partial<MapProps> {
  if (view) return { center: view.center, zoom: view.zoom }
  return {
    bounds: CONUS_BBOX,
    fitBoundsOptions: { padding: 24 },
  }
}

// Bearing and pitch carry no analytical meaning for 2D thematic layers and
// make legends and density comparisons harder to read, so rotation is locked.
function LockRotation() {
  const { map } = useMap()
  useEffect(() => {
    if (!map) return
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
  }, [map])
  return null
}

// Exposes load state on the container (data-map-ready) for tests and styling,
// without lifting map lifecycle into React state.
function ReadyMarker() {
  const { map, isLoaded } = useMap()
  useEffect(() => {
    if (!map) return
    const container = map.getContainer()
    container.dataset.mapReady = String(isLoaded)
    return () => {
      delete container.dataset.mapReady
    }
  }, [map, isLoaded])
  return null
}

export function ExplorerMap() {
  const [webglSupported] = useState(isWebGLSupported)
  const [initialView, setInitialView] = useState(readInitialView)
  const lastViewRef = useRef<MapView | null>(null)

  // Opened from a link that names a selection but no viewport: go to it.
  const [fitSelectionOnLoad] = useState(() => initialView === null)

  // Interactive overlays (the legend, tooltips) are portaled into this sibling of the
  // MapLibre container so their wheel, click and dblclick events never reach
  // MapLibre's handlers (scrolling the legend shouldn't zoom the map, and
  // clicking it shouldn't select features underneath).
  const [overlayRoot, setOverlayRoot] = useState<HTMLDivElement | null>(null)

  const handleViewSettled = useCallback((view: MapView) => {
    lastViewRef.current = view
  }, [])

  // With cacheComponents, Next.js hides inactive routes with <Activity> instead
  // of unmounting them. That tears down the MapLibre instance; remember the last
  // view so the map is recreated where the user left it.
  useLayoutEffect(() => {
    return () => {
      if (lastViewRef.current) setInitialView(lastViewRef.current)
    }
  }, [])

  if (!webglSupported) {
    return (
      <Empty className="size-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MonitorX />
          </EmptyMedia>
          <EmptyTitle>Map unavailable</EmptyTitle>
          <EmptyDescription>
            This browser or device doesn&apos;t support WebGL, which the map
            needs. Try a recent version of Chrome, Firefox, Safari or Edge, or
            enable hardware acceleration.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="relative size-full">
      <Map
        {...initialCamera(initialView)}
        styles={basemapStyles}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        maxPitch={0}
        className="size-full"
      >
        <ReadyMarker />
        <LockRotation />
        <ViewportUrlSync onViewSettled={handleViewSettled} />
        <MapBridge />
        <RegistryLayers />
        {/* After RegistryLayers: applies state to the sources it creates. */}
        <AreaMetricsState />
        <SelectionHighlight fitOnLoad={fitSelectionOnLoad} />
        <MapStatusBar />
        {overlayRoot && <MapLegend portalTo={overlayRoot} />}
        {overlayRoot && <MapInteractions portalTo={overlayRoot} />}
        <MapControls position="bottom-right" showZoom showLocate />
      </Map>
      <div
        ref={setOverlayRoot}
        className="pointer-events-none absolute inset-0 z-10"
      />
    </div>
  )
}
