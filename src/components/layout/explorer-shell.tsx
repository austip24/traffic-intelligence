"use client"

import { PanelLeft, PanelRight, X } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSelection } from "@/components/explorer/explorer-provider"
import { useMediaQuery } from "@/hooks/use-media-query"
import { selectionKey } from "@/lib/explorer/url-state"
import { cn } from "@/lib/utils"

type ExplorerShellProps = {
  brand: ReactNode
  headerActions?: ReactNode
  sidePanel: ReactNode
  inspector: ReactNode
  map: ReactNode
}

/**
 * Map-first layout. Panels dock beside the map on wide screens and become
 * sheets on narrow ones, so the map always keeps most of the viewport:
 * - side panel (layers/filters): docked at lg+, sheet below
 * - inspector (details): docked at xl+, sheet below
 * Panel contents are passed in as nodes so they can stay Server Components.
 */
export function ExplorerShell({
  brand,
  headerActions,
  sidePanel,
  inspector,
  map,
}: ExplorerShellProps) {
  const isMd = useMediaQuery("(min-width: 48rem)")
  const isLg = useMediaQuery("(min-width: 64rem)")
  const isXl = useMediaQuery("(min-width: 80rem)")

  const [sideCollapsed, setSideCollapsed] = useState(false)
  const [sideSheetOpen, setSideSheetOpen] = useState(false)
  const [inspectorSheetOpen, setInspectorSheetOpen] = useState(false)

  // Selecting something on the map opens the details sheet where the
  // inspector isn't docked (adjusting state during render, not in an effect).
  const { selection } = useSelection()
  const currentKey = selection ? selectionKey(selection) : null
  const [lastKey, setLastKey] = useState(currentKey)
  if (currentKey !== lastKey) {
    setLastKey(currentKey)
    if (currentKey && !isXl) setInspectorSheetOpen(true)
  }

  const sidePanelVisible = isLg ? !sideCollapsed : sideSheetOpen
  const toggleSidePanel = () => {
    if (isLg) setSideCollapsed((collapsed) => !collapsed)
    else setSideSheetOpen(true)
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-2 sm:px-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Toggle layers and filters"
                aria-expanded={sidePanelVisible}
                onClick={toggleSidePanel}
              />
            }
          >
            <PanelLeft />
          </TooltipTrigger>
          <TooltipContent side="bottom">Layers and filters</TooltipContent>
        </Tooltip>

        {brand}

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="xl:hidden"
            aria-expanded={inspectorSheetOpen}
            onClick={() => setInspectorSheetOpen(true)}
          >
            <PanelRight />
            <span className="max-sm:sr-only">Details</span>
          </Button>
          {headerActions}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Layers and filters"
          className={cn(
            "hidden w-80 shrink-0 flex-col border-r bg-background lg:flex",
            sideCollapsed && "lg:hidden"
          )}
        >
          {sidePanel}
        </aside>

        {/* MapLibre tracks container size, so collapsing panels resizes the map. */}
        <main className="relative min-w-0 flex-1">{map}</main>

        <aside
          aria-label="Details"
          className="hidden w-96 shrink-0 flex-col border-l bg-background xl:flex"
        >
          {/* Mounted only when docked, so a hidden copy never fetches data. */}
          {isXl && inspector}
        </aside>
      </div>

      <Sheet open={sideSheetOpen && !isLg} onOpenChange={setSideSheetOpen}>
        <SheetContent
          side={isMd ? "left" : "bottom"}
          showCloseButton={false}
          className="gap-0 p-0 data-[side=bottom]:h-[80svh]"
        >
          <div className="flex h-12 shrink-0 items-center justify-between border-b px-3">
            <SheetTitle className="text-sm">Layers and filters</SheetTitle>
            <SheetClose
              render={<Button variant="ghost" size="icon-sm" aria-label="Close" />}
            >
              <X />
            </SheetClose>
          </div>
          <div className="min-h-0 flex-1">{sidePanel}</div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={inspectorSheetOpen && !isXl}
        onOpenChange={setInspectorSheetOpen}
      >
        <SheetContent
          side={isMd ? "right" : "bottom"}
          showCloseButton={false}
          className="gap-0 p-0 data-[side=bottom]:h-[70svh]"
        >
          <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
            <SheetTitle className="text-sm">Details</SheetTitle>
            <SheetClose
              render={<Button variant="ghost" size="icon-sm" aria-label="Close details" />}
            >
              <X />
            </SheetClose>
          </div>
          <div className="min-h-0 flex-1">{inspector}</div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
