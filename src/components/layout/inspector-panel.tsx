import { MousePointerClick } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function InspectorPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <h2 className="text-sm font-medium">Details</h2>
      </div>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MousePointerClick />
          </EmptyMedia>
          <EmptyTitle>Nothing selected</EmptyTitle>
          <EmptyDescription>
            Select a feature on the map to see its details and trends here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
