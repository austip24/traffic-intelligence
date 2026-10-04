"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import {
  useCrashFilters,
  useExplorerConfig,
  useLayers,
  useSettledViewport,
} from "@/components/explorer/explorer-provider"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { FILTER_DEBOUNCE_MS } from "@/hooks/use-crash-summary"
import {
  ApiError,
  fetchAreaInfo,
  fetchAreaMetrics,
  fetchAreaProfile,
  fetchCrashDetail,
  fetchSearch,
  fetchViewportSummary,
  queryKeys,
} from "@/lib/api/client"
import { CHOROPLETH_LAYER_ID } from "@/lib/layers/choropleth"

/** Filters after they've settled, so dragging a slider doesn't fire requests. */
function useSettledFilters() {
  const { filters } = useCrashFilters()
  return useDebouncedValue(filters, FILTER_DEBOUNCE_MS)
}

// 4xx responses (bad id, not found) won't succeed on retry.
const retryServerErrors = (failureCount: number, error: Error) =>
  !(error instanceof ApiError && error.status < 500) && failureCount < 2

/** Choropleth values; only fetched while the choropleth layer is visible. */
export function useAreaMetrics() {
  const { dataVersion } = useExplorerConfig()
  const { layers, areaMetric } = useLayers()
  const filters = useSettledFilters()
  return useQuery({
    queryKey: queryKeys.areaMetrics(areaMetric, filters, dataVersion),
    queryFn: ({ signal }) => fetchAreaMetrics(areaMetric, filters, dataVersion, signal),
    enabled: !!layers[CHOROPLETH_LAYER_ID]?.visible,
    placeholderData: keepPreviousData,
  })
}

export function useAreaInfo(geoid: string | null) {
  const { dataVersion } = useExplorerConfig()
  return useQuery({
    queryKey: queryKeys.areaInfo(geoid ?? "", dataVersion),
    queryFn: ({ signal }) => fetchAreaInfo(geoid as string, dataVersion, signal),
    enabled: geoid !== null,
    staleTime: Infinity,
    retry: retryServerErrors,
  })
}

export function useAreaProfile(geoid: string) {
  const { dataVersion } = useExplorerConfig()
  const filters = useSettledFilters()
  return useQuery({
    queryKey: queryKeys.areaProfile(geoid, filters, dataVersion),
    queryFn: ({ signal }) => fetchAreaProfile(geoid, filters, dataVersion, signal),
    // Keep the previous numbers on filter changes, but not across areas.
    placeholderData: (previous) => (previous?.geoid === geoid ? previous : undefined),
    retry: retryServerErrors,
  })
}

export function useCrashDetail(id: number | null) {
  const { dataVersion } = useExplorerConfig()
  return useQuery({
    queryKey: queryKeys.crashDetail(id ?? 0, dataVersion),
    queryFn: ({ signal }) => fetchCrashDetail(id as number, dataVersion, signal),
    enabled: id !== null,
    staleTime: Infinity,
    retry: retryServerErrors,
  })
}

export function useViewportSummary() {
  const { dataVersion } = useExplorerConfig()
  const { viewport } = useSettledViewport()
  const filters = useSettledFilters()
  return useQuery({
    queryKey: viewport
      ? queryKeys.viewportSummary(viewport.bbox, filters, dataVersion)
      : ["viewport-summary", "pending"],
    queryFn: ({ signal }) =>
      fetchViewportSummary(viewport!.bbox, filters, dataVersion, signal),
    enabled: viewport !== null,
    placeholderData: keepPreviousData,
  })
}

const SEARCH_DEBOUNCE_MS = 200

export function usePlaceSearch(query: string) {
  const { dataVersion } = useExplorerConfig()
  const q = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS)
  return useQuery({
    queryKey: queryKeys.search(q.toLowerCase(), dataVersion),
    queryFn: ({ signal }) => fetchSearch(q, dataVersion, signal),
    enabled: q.length >= 2,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  })
}
