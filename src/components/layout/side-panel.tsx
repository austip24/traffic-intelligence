import { Layers, SlidersHorizontal } from "lucide-react"

import { FilterPanel } from "@/components/filters/filter-panel"
import { LayerPanel } from "@/components/layers/layer-panel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SidePanel() {
  return (
    <Tabs defaultValue="filters" className="flex h-full min-h-0 flex-col gap-0">
      <div className="border-b p-3">
        <TabsList className="w-full">
          <TabsTrigger value="filters">
            <SlidersHorizontal />
            Filters
          </TabsTrigger>
          <TabsTrigger value="layers">
            <Layers />
            Layers
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="filters" className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <FilterPanel />
        </ScrollArea>
      </TabsContent>

      <TabsContent value="layers" className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <LayerPanel />
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}
