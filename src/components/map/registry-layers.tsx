"use client"

import type { ErrorEvent as MapLibreErrorEvent } from "maplibre-gl"
import { useEffect, useMemo } from "react"
import { toast } from "sonner"

import {
  useCrashFilters,
  useExplorerConfig,
  useLayers,
  type LayerState,
} from "@/components/explorer/explorer-provider"
import { VectorTileLayer } from "@/components/map/vector-tile-layer"
import { useMap } from "@/components/ui/map"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { FILTER_DEBOUNCE_MS } from "@/hooks/use-crash-summary"
import { dataQuery } from "@/lib/api/client"
import type { CrashFilters } from "@/lib/filters/crash-filters"
import { LAYERS } from "@/lib/layers/registry"
import type { LayerDefinition, MapTheme } from "@/lib/layers/types"

function tilesUrl(
  layer: LayerDefinition,
  filters: CrashFilters,
  dataVersion: string,
  retry: number
): string {
  const query = new URLSearchParams(
    dataQuery(layer.source.usesCrashFilters ? filters : null, dataVersion)
  )
  if (retry > 0) query.set("retry", String(retry))
  // MapLibre fetches tiles from a worker, which needs absolute URLs. The
  // {z}/{x}/{y} placeholders must stay unencoded.
  return `${window.location.origin}/api/tiles/${layer.source.tileSource}/{z}/{x}/{y}?${query}`
}

function RegistryLayer({
  layer,
  state,
  theme,
  filters,
  dataVersion,
  retry,
}: {
  layer: LayerDefinition
  state: LayerState
  theme: MapTheme
  filters: CrashFilters
  dataVersion: string
  retry: number
}) {
  const specs = useMemo(
    () => layer.style({ theme, opacity: state.opacity, source: layer.id }),
    [layer, theme, state.opacity]
  )
  const images = useMemo(() => layer.images?.(theme), [layer, theme])
  return (
    <VectorTileLayer
      sourceId={layer.id}
      tilesUrl={tilesUrl(layer, filters, dataVersion, retry)}
      minzoom={layer.source.minzoom}
      maxzoom={layer.source.maxzoom}
      promoteId={layer.source.promoteId}
      specs={specs}
      placement={layer.placement}
      images={images}
      visible={state.visible}
    />
  )
}

/** Renders every registered layer and reports tile errors back to the layer panel. */
export function RegistryLayers() {
  const { map, resolvedTheme } = useMap()
  const { filters } = useCrashFilters()
  const { dataVersion } = useExplorerConfig()
  const { layers, reportError, retryNonce } = useLayers()
  // Don't refetch every tile on every slider tick.
  const debouncedFilters = useDebouncedValue(filters, FILTER_DEBOUNCE_MS)

  useEffect(() => {
    if (!map) return
    const onError = (event: MapLibreErrorEvent & { sourceId?: string }) => {
      const layer = LAYERS.find((l) => l.id === event.sourceId)
      if (!layer) return
      reportError(layer.id, "Some map tiles failed to load.")
      // One toast per layer, however many tiles fail.
      toast.error(`${layer.title} couldn't load`, {
        id: `layer-error-${layer.id}`,
        description: "Check your connection, then retry from the layer panel.",
      })
    }
    map.on("error", onError)
    return () => {
      map.off("error", onError)
    }
  }, [map, reportError])

  return LAYERS.map((layer) => (
    <RegistryLayer
      key={layer.id}
      layer={layer}
      state={layers[layer.id]}
      theme={resolvedTheme}
      filters={debouncedFilters}
      dataVersion={dataVersion}
      retry={retryNonce[layer.id] ?? 0}
    />
  ))
}
