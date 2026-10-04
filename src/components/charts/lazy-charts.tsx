"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

/*
 * Recharts is large and only needed once a panel shows data, so charts load
 * in their own chunk after the page is interactive, alongside the map. The
 * placeholders reserve each chart's height so panels don't jump.
 */

export const TrendChart = dynamic(
  () => import("@/components/charts/trend-chart").then((m) => m.TrendChart),
  { ssr: false, loading: () => <Skeleton className="h-46 w-full" /> }
)

export const YearBars = dynamic(
  () => import("@/components/charts/year-bars").then((m) => m.YearBars),
  { ssr: false, loading: () => <Skeleton className="h-12 w-full" /> }
)

export const ShareBars = dynamic(
  () => import("@/components/charts/share-bars").then((m) => m.ShareBars),
  { ssr: false, loading: () => <Skeleton className="h-28 w-full" /> }
)

export const ComparisonBars = dynamic(
  () => import("@/components/charts/comparison-bars").then((m) => m.ComparisonBars),
  { ssr: false, loading: () => <Skeleton className="h-24 w-full" /> }
)
