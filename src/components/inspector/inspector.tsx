"use client"

import { useEffect } from "react"

import { useSelection } from "@/components/explorer/explorer-provider"
import { AreaProfilePanel } from "@/components/inspector/area-profile"
import { CrashDetailPanel } from "@/components/inspector/crash-detail"
import { ViewportSummaryPanel } from "@/components/inspector/viewport-summary"

/** Escape clears the selection, unless a dialog, sheet or menu is handling it. */
function useEscapeToDeselect() {
  const { selection, select } = useSelection()
  useEffect(() => {
    if (!selection) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      if (target?.closest("[role=dialog], [role=menu], [role=listbox], input, textarea")) return
      select(null)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selection, select])
}

/** Details for the selected crash or area; otherwise a summary of the map view. */
export function Inspector() {
  const { selection } = useSelection()
  useEscapeToDeselect()

  // Keyed so switching selections starts from the top with fresh state.
  if (selection?.type === "area") {
    return <AreaProfilePanel key={selection.geoid} geoid={selection.geoid} />
  }
  if (selection?.type === "crash") {
    return <CrashDetailPanel key={selection.id} id={selection.id} />
  }
  return <ViewportSummaryPanel />
}
