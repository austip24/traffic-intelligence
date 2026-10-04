"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

export function MapSkeleton() {
  return <Skeleton className="size-full rounded-none" aria-label="Loading map" />
}

// MapLibre touches window at import time and is a large bundle, so it is
// loaded only in the browser and kept out of the initial JS payload.
// `ssr: false` is only allowed inside Client Components.
export const MapLoader = dynamic(
  () => import("@/components/map/explorer-map").then((m) => m.ExplorerMap),
  { ssr: false, loading: MapSkeleton }
)
