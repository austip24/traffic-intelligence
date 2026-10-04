import { Inspector } from "@/components/inspector/inspector"

/** The details panel: selection details, or a summary of the current view. */
export function InspectorPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Inspector />
    </div>
  )
}
