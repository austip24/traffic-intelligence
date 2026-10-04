import type { Metadata } from "next"

import { AppBrand } from "@/components/layout/app-brand"
import { ExplorerShell } from "@/components/layout/explorer-shell"
import { InspectorPanel } from "@/components/layout/inspector-panel"
import { SidePanel } from "@/components/layout/side-panel"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { MapLoader } from "@/components/map/map-loader"

export const metadata: Metadata = {
  title: "Map",
}

export default function MapPage() {
  return (
    <ExplorerShell
      brand={<AppBrand />}
      headerActions={<ThemeToggle />}
      sidePanel={<SidePanel />}
      inspector={<InspectorPanel />}
      map={<MapLoader />}
    />
  )
}
