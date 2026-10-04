import {
  areaInfoSchema,
  areaMetricsSchema,
  areaProfileSchema,
  crashDetailSchema,
  crashSummarySchema,
  searchResultsSchema,
  viewportSummarySchema,
  type AreaInfo,
  type AreaMetrics,
  type AreaProfile,
  type CrashDetail,
  type CrashSummary,
  type SearchResult,
  type ViewportSummary,
} from "@/lib/api/schemas"
import { writeCrashFilters, type CrashFilters } from "@/lib/filters/crash-filters"
import { formatBBox } from "@/lib/geo/bbox"
import type { AreaMetric } from "@/lib/metrics/area-metrics"
import type { BBox } from "@/types/geo"

/** Query string for data endpoints: canonical filters + data version. */
export function dataQuery(filters: CrashFilters | null, dataVersion: string): string {
  const params = filters ? writeCrashFilters(new URLSearchParams(), filters) : new URLSearchParams()
  params.set("v", dataVersion)
  return params.toString()
}

export const queryKeys = {
  crashSummary: (filters: CrashFilters, dataVersion: string) =>
    ["crash-summary", dataQuery(filters, dataVersion)] as const,
  areaMetrics: (metric: AreaMetric, filters: CrashFilters, dataVersion: string) =>
    ["area-metrics", metric, dataQuery(filters, dataVersion)] as const,
  areaInfo: (geoid: string, dataVersion: string) => ["area-info", geoid, dataVersion] as const,
  areaProfile: (geoid: string, filters: CrashFilters, dataVersion: string) =>
    ["area-profile", geoid, dataQuery(filters, dataVersion)] as const,
  crashDetail: (id: number, dataVersion: string) => ["crash-detail", id, dataVersion] as const,
  viewportSummary: (bbox: BBox, filters: CrashFilters, dataVersion: string) =>
    ["viewport-summary", formatBBox(bbox), dataQuery(filters, dataVersion)] as const,
  search: (q: string, dataVersion: string) => ["search", q, dataVersion] as const,
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

async function getJson<T>(
  url: string,
  schema: { parse: (data: unknown) => T },
  signal?: AbortSignal
): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status)
  // Validate at the boundary: a malformed response fails loudly here rather
  // than as undefined values deep in a chart.
  return schema.parse(await res.json())
}

export function fetchCrashSummary(
  filters: CrashFilters,
  dataVersion: string,
  signal?: AbortSignal
): Promise<CrashSummary> {
  return getJson(
    `/api/crashes/summary?${dataQuery(filters, dataVersion)}`,
    crashSummarySchema,
    signal
  )
}

export function fetchAreaMetrics(
  metric: AreaMetric,
  filters: CrashFilters,
  dataVersion: string,
  signal?: AbortSignal
): Promise<AreaMetrics> {
  const query = new URLSearchParams(dataQuery(filters, dataVersion))
  query.set("metric", metric)
  return getJson(`/api/areas/metrics?${query}`, areaMetricsSchema, signal)
}

export function fetchAreaInfo(
  geoid: string,
  dataVersion: string,
  signal?: AbortSignal
): Promise<AreaInfo> {
  return getJson(
    `/api/areas/${encodeURIComponent(geoid)}?${dataQuery(null, dataVersion)}`,
    areaInfoSchema,
    signal
  )
}

export function fetchAreaProfile(
  geoid: string,
  filters: CrashFilters,
  dataVersion: string,
  signal?: AbortSignal
): Promise<AreaProfile> {
  return getJson(
    `/api/areas/${encodeURIComponent(geoid)}/profile?${dataQuery(filters, dataVersion)}`,
    areaProfileSchema,
    signal
  )
}

export function fetchCrashDetail(
  id: number,
  dataVersion: string,
  signal?: AbortSignal
): Promise<CrashDetail> {
  return getJson(`/api/crashes/${id}?${dataQuery(null, dataVersion)}`, crashDetailSchema, signal)
}

export function fetchViewportSummary(
  bbox: BBox,
  filters: CrashFilters,
  dataVersion: string,
  signal?: AbortSignal
): Promise<ViewportSummary> {
  const query = new URLSearchParams(dataQuery(filters, dataVersion))
  query.set("bbox", formatBBox(bbox))
  return getJson(`/api/crashes/viewport?${query}`, viewportSummarySchema, signal)
}

export function fetchSearch(
  q: string,
  dataVersion: string,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const query = new URLSearchParams({ q, v: dataVersion })
  return getJson(`/api/search?${query}`, searchResultsSchema, signal)
}
