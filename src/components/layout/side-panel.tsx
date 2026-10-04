import { Layers, SlidersHorizontal } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SidePanel() {
  return (
    <Tabs defaultValue="layers" className="flex h-full min-h-0 flex-col gap-0">
      <div className="border-b p-3">
        <TabsList className="w-full">
          <TabsTrigger value="layers">
            <Layers />
            Layers
          </TabsTrigger>
          <TabsTrigger value="filters">
            <SlidersHorizontal />
            Filters
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="layers" className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Layers />
              </EmptyMedia>
              <EmptyTitle>No layers yet</EmptyTitle>
              <EmptyDescription>
                Data layers appear here once a dataset is connected.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="filters" className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SlidersHorizontal />
              </EmptyMedia>
              <EmptyTitle>No filters available</EmptyTitle>
              <EmptyDescription>
                Filters appear when a layer that supports them is turned on.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}
