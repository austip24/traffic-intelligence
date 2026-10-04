"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { Map as MapLibreMap } from "maplibre-gl"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import {
  toQueryString,
  writeAreaMetric,
  writeSelection,
  writeVisibleLayers,
  type Selection,
} from "@/lib/explorer/url-state"
import {
  DEFAULT_CRASH_FILTERS,
  writeCrashFilters,
  type CrashFilters,
} from "@/lib/filters/crash-filters"
import { DEFAULT_VISIBLE_LAYERS, LAYERS } from "@/lib/layers/registry"
import type { AreaMetric } from "@/lib/metrics/area-metrics"
import type { BBox } from "@/types/geo"

/*
 * Explorer state is split into small contexts so that, e.g., changing a
 * layer's opacity doesn't re-render the filter panel. The live map viewport
 * is not here: it lives in MapLibre and the URL (see ViewportUrlSync). Only
 * the settled, rounded bounds are, for the "in this view" summary.
 */

type ConfigContextValue = { dataVersion: string }

type FiltersContextValue = {
  filters: CrashFilters
  setFilters: (update: (current: CrashFilters) => CrashFilters) => void
  resetFilters: () => void
}

export type LayerState = { visible: boolean; opacity: number }

type LayersContextValue = {
  layers: Record<string, LayerState>
  setVisible: (id: string, visible: boolean) => void
  setOpacity: (id: string, opacity: number) => void
  /** Which metric the area choropleth shows. */
  areaMetric: AreaMetric
  setAreaMetric: (metric: AreaMetric) => void
  /** Latest load error per layer, if any. */
  errors: Record<string, string | undefined>
  reportError: (id: string, message: string) => void
  /** Bumped on retry so tile URLs change and MapLibre refetches. */
  retryNonce: Record<string, number>
  retry: (id: string) => void
}

type SelectionContextValue = {
  selection: Selection | null
  select: (selection: Selection | null) => void
}

export type SettledViewport = { bbox: BBox; zoom: number }

type ViewportContextValue = {
  viewport: SettledViewport | null
  setViewport: (viewport: SettledViewport) => void
}

type MapHandleContextValue = {
  /** Set by the map while it is mounted; null before load and after teardown. */
  mapRef: React.RefObject<MapLibreMap | null>
  /** Fits the map to a bbox ([minLng, minLat, maxLng, maxLat], EPSG:4326). */
  fitBBox: (bbox: BBox) => void
}

const ConfigContext = createContext<ConfigContextValue | null>(null)
const FiltersContext = createContext<FiltersContextValue | null>(null)
const LayersContext = createContext<LayersContextValue | null>(null)
const SelectionContext = createContext<SelectionContextValue | null>(null)
const ViewportContext = createContext<ViewportContextValue | null>(null)
const MapHandleContext = createContext<MapHandleContextValue | null>(null)

function useRequired<T>(context: React.Context<T | null>, name: string): T {
  const value = useContext(context)
  if (!value) throw new Error(`${name} must be used within ExplorerProvider`)
  return value
}

export const useExplorerConfig = () => useRequired(ConfigContext, "useExplorerConfig")
export const useCrashFilters = () => useRequired(FiltersContext, "useCrashFilters")
export const useLayers = () => useRequired(LayersContext, "useLayers")
export const useSelection = () => useRequired(SelectionContext, "useSelection")
export const useSettledViewport = () => useRequired(ViewportContext, "useSettledViewport")
export const useMapHandle = () => useRequired(MapHandleContext, "useMapHandle")

/** Merges `write` into the current URL without a navigation or server round trip. */
function replaceUrlParams(write: (params: URLSearchParams) => URLSearchParams) {
  const params = write(new URLSearchParams(window.location.search))
  const query = toQueryString(params)
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`)
}

// Leave room for the docked panels' edges and the map controls.
const FIT_PADDING = 48

type ExplorerProviderProps = {
  dataVersion: string
  initialFilters: CrashFilters
  initialVisibleLayers: string[]
  initialAreaMetric: AreaMetric
  initialSelection: Selection | null
  children: ReactNode
}

export function ExplorerProvider({
  dataVersion,
  initialFilters,
  initialVisibleLayers,
  initialAreaMetric,
  initialSelection,
  children,
}: ExplorerProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Data only changes when the ETL runs; dataVersion is in every key.
          queries: { staleTime: 5 * 60_000, retry: 2, refetchOnWindowFocus: false },
        },
      })
  )

  const [filters, setFilterState] = useState(initialFilters)
  const [layers, setLayers] = useState<Record<string, LayerState>>(() =>
    Object.fromEntries(
      LAYERS.map((l) => [
        l.id,
        { visible: initialVisibleLayers.includes(l.id), opacity: l.defaultOpacity },
      ])
    )
  )
  const [areaMetric, setAreaMetric] = useState(initialAreaMetric)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [retryNonce, setRetryNonce] = useState<Record<string, number>>({})
  const [selection, setSelection] = useState(initialSelection)
  const [viewport, setViewportState] = useState<SettledViewport | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)

  // Shareable state → URL. Effects (not setters) so React batching applies.
  useEffect(() => {
    replaceUrlParams((p) => writeCrashFilters(p, filters))
  }, [filters])

  const visibleIds = useMemo(
    () => LAYERS.filter((l) => layers[l.id]?.visible).map((l) => l.id),
    [layers]
  )
  useEffect(() => {
    replaceUrlParams((p) => writeVisibleLayers(p, visibleIds, DEFAULT_VISIBLE_LAYERS))
  }, [visibleIds])

  useEffect(() => {
    replaceUrlParams((p) => writeAreaMetric(p, areaMetric))
  }, [areaMetric])

  useEffect(() => {
    replaceUrlParams((p) => writeSelection(p, selection))
  }, [selection])

  const setFilters = useCallback(
    (update: (current: CrashFilters) => CrashFilters) => setFilterState(update),
    []
  )
  const resetFilters = useCallback(() => setFilterState(DEFAULT_CRASH_FILTERS), [])

  const setVisible = useCallback((id: string, visible: boolean) => {
    setLayers((current) => ({ ...current, [id]: { ...current[id], visible } }))
  }, [])
  const setOpacity = useCallback((id: string, opacity: number) => {
    setLayers((current) => ({ ...current, [id]: { ...current[id], opacity } }))
  }, [])
  const reportError = useCallback((id: string, message: string) => {
    setErrors((current) => (current[id] === message ? current : { ...current, [id]: message }))
  }, [])
  const retry = useCallback((id: string) => {
    setErrors((current) => ({ ...current, [id]: undefined }))
    setRetryNonce((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }))
  }, [])

  const select = useCallback((next: Selection | null) => setSelection(next), [])

  const setViewport = useCallback((next: SettledViewport) => {
    // Rounded bounds repeat often (small pans); skip no-op updates.
    setViewportState((current) =>
      current &&
      current.zoom === next.zoom &&
      current.bbox.every((v, i) => v === next.bbox[i])
        ? current
        : next
    )
  }, [])

  const fitBBox = useCallback((bbox: BBox) => {
    const map = mapRef.current
    if (!map) return
    const [minLng, minLat, maxLng, maxLat] = bbox
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: FIT_PADDING, maxZoom: 14, animate: !reduceMotion }
    )
  }, [])

  const config = useMemo(() => ({ dataVersion }), [dataVersion])
  const filtersValue = useMemo(
    () => ({ filters, setFilters, resetFilters }),
    [filters, setFilters, resetFilters]
  )
  const layersValue = useMemo(
    () => ({
      layers,
      setVisible,
      setOpacity,
      areaMetric,
      setAreaMetric,
      errors,
      reportError,
      retryNonce,
      retry,
    }),
    [layers, setVisible, setOpacity, areaMetric, errors, reportError, retryNonce, retry]
  )
  const selectionValue = useMemo(() => ({ selection, select }), [selection, select])
  const viewportValue = useMemo(() => ({ viewport, setViewport }), [viewport, setViewport])
  const mapHandle = useMemo(() => ({ mapRef, fitBBox }), [fitBBox])

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigContext.Provider value={config}>
        <MapHandleContext.Provider value={mapHandle}>
          <FiltersContext.Provider value={filtersValue}>
            <LayersContext.Provider value={layersValue}>
              <SelectionContext.Provider value={selectionValue}>
                <ViewportContext.Provider value={viewportValue}>{children}</ViewportContext.Provider>
              </SelectionContext.Provider>
            </LayersContext.Provider>
          </FiltersContext.Provider>
        </MapHandleContext.Provider>
      </ConfigContext.Provider>
    </QueryClientProvider>
  )
}
