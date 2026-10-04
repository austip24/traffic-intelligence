"use client"

import { SearchX } from "lucide-react"

import { ShareBars } from "@/components/charts/lazy-charts"
import {
  useCrashFilters,
  useSelection,
  useSettledViewport,
} from "@/components/explorer/explorer-provider"
import {
  DataNote,
  InspectorError,
  InspectorHeader,
  InspectorSkeleton,
  Stat,
} from "@/components/inspector/inspector-parts"
import { Kbd } from "@/components/ui/kbd"
import { useShortcutModifier } from "@/components/search/place-search"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useViewportSummary } from "@/hooks/use-explorer-data"
import { areaLabel } from "@/lib/domain/area"
import { ROAD_USER_CATEGORY } from "@/lib/domain/crash"
import { describeCrashFilters } from "@/lib/filters/crash-filters"
import { formatInteger, pluralize } from "@/lib/format"
import { CRASH_POINTS_MIN_ZOOM } from "@/lib/layers/tile-config"
import { cn } from "@/lib/utils"

/** Shown when nothing is selected: what the current map view contains. */
export function ViewportSummaryPanel() {
  const { data, isPending, isError, refetch, isPlaceholderData } = useViewportSummary()
  const { viewport } = useSettledViewport()
  const { filters } = useCrashFilters()
  const { select } = useSelection()
  const modifier = useShortcutModifier()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <InspectorHeader title="In this view" closable={false} />
      <ScrollArea className="min-h-0 flex-1">
        {isPending ? (
          <InspectorSkeleton />
        ) : isError ? (
          <InspectorError message="Couldn't summarize this view." onRetry={() => refetch()} />
        ) : (
          <div
            aria-busy={isPlaceholderData}
            className={cn(
              "flex flex-col gap-6 p-4 transition-opacity",
              isPlaceholderData && "opacity-60"
            )}
          >
            <p className="text-xs text-muted-foreground">{describeCrashFilters(filters)}</p>

            {data.crashes === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <SearchX className="size-4" />
                No mapped fatal crashes here match the filters.
              </p>
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-3">
                  <Stat label="Fatal crashes" value={formatInteger(data.crashes)} />
                  <Stat label="Deaths" value={formatInteger(data.deaths)} />
                </dl>

                <ShareBars
                  title="Road users involved"
                  items={data.byRoadUser.map((r) => ({
                    label: ROAD_USER_CATEGORY.labels[r.key],
                    count: r.crashes,
                  }))}
                />

                {data.topCounties.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <h3 className="text-xs font-medium">Counties with the most deaths in view</h3>
                    <ol className="flex flex-col">
                      {data.topCounties.map((county) => (
                        <li key={county.geoid}>
                          <button
                            type="button"
                            onClick={() => select({ type: "area", geoid: county.geoid })}
                            className="flex w-full items-baseline justify-between gap-3 rounded-sm py-1.5 text-left text-sm outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span className="truncate">{areaLabel({ ...county, level: "county" })}</span>
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {pluralize(county.deaths, "death")}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                    <DataNote>Counts only include the part of each county inside the view.</DataNote>
                  </section>
                )}
              </>
            )}

            <div className="flex flex-col gap-1.5 border-t pt-4">
              <DataNote>
                Select a crash, county or state on the map to see its details, or search for a
                place with <Kbd>{modifier} K</Kbd>.
                {viewport && viewport.zoom < CRASH_POINTS_MIN_ZOOM &&
                  " Zoom in to city level to see individual crashes."}
              </DataNote>
              <DataNote>Only crashes with reported coordinates are counted.</DataNote>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
