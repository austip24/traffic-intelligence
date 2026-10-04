import type { Metadata } from "next"
import { Suspense } from "react"

import { ExplorerProvider } from "@/components/explorer/explorer-provider"
import { AboutLink } from "@/components/layout/about-link"
import { AppBrand } from "@/components/layout/app-brand"
import { ExplorerShell } from "@/components/layout/explorer-shell"
import { InspectorPanel } from "@/components/layout/inspector-panel"
import { SidePanel } from "@/components/layout/side-panel"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { MapLoader } from "@/components/map/map-loader"
import { MapOverlays } from "@/components/map/map-overlays"
import { PlaceSearch } from "@/components/search/place-search"
import { getExplorerConfig } from "@/lib/data/explorer-config"
import { parseAreaMetric, parseSelection, parseVisibleLayers } from "@/lib/explorer/url-state"
import { parseCrashFilters } from "@/lib/filters/crash-filters"
import { DEFAULT_VISIBLE_LAYERS, LAYER_IDS } from "@/lib/layers/registry"

import MapLoading from "./loading"

export const metadata: Metadata = {
  title: "Map",
}

type SearchParams = Record<string, string | string[] | undefined>

function toURLSearchParams(params: SearchParams): URLSearchParams {
  const result = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") result.set(key, value)
  }
  return result
}

/**
 * Reads the shared-link state on the server so the first render already
 * shows the right filters and layers (no flash, no hydration mismatch).
 */
async function Explorer({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = toURLSearchParams(await searchParams)
  const { dataVersion } = await getExplorerConfig()

  return (
    <ExplorerProvider
      dataVersion={dataVersion}
      initialFilters={parseCrashFilters(params)}
      initialVisibleLayers={parseVisibleLayers(params, LAYER_IDS, DEFAULT_VISIBLE_LAYERS)}
      initialAreaMetric={parseAreaMetric(params)}
      initialSelection={parseSelection(params)}
    >
      <ExplorerShell
        brand={<AppBrand />}
        headerActions={
          <>
            <PlaceSearch />
            <AboutLink />
            <ThemeToggle />
          </>
        }
        sidePanel={<SidePanel />}
        inspector={<InspectorPanel />}
        map={
          <>
            <MapLoader />
            <MapOverlays />
          </>
        }
      />
    </ExplorerProvider>
  )
}

export default function MapPage({ searchParams }: PageProps<"/map">) {
  return (
    <Suspense fallback={<MapLoading />}>
      <Explorer searchParams={searchParams} />
    </Suspense>
  )
}
