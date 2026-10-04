"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { useCrashFilters, useExplorerConfig } from "@/components/explorer/explorer-provider"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { fetchCrashSummary, queryKeys } from "@/lib/api/client"

/** Filters settle for this long before data is requested (e.g. while dragging a slider). */
export const FILTER_DEBOUNCE_MS = 250

export function useCrashSummary() {
  const { filters } = useCrashFilters()
  const { dataVersion } = useExplorerConfig()
  const debounced = useDebouncedValue(filters, FILTER_DEBOUNCE_MS)
  return useQuery({
    queryKey: queryKeys.crashSummary(debounced, dataVersion),
    queryFn: ({ signal }) => fetchCrashSummary(debounced, dataVersion, signal),
    // Keep showing the previous numbers while new ones load, instead of flashing.
    placeholderData: keepPreviousData,
  })
}
