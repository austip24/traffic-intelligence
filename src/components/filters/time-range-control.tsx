"use client"

import { useCrashFilters } from "@/components/explorer/explorer-provider"
import { YearBars } from "@/components/charts/lazy-charts"
import { Slider } from "@/components/ui/slider"
import { useCrashSummary } from "@/hooks/use-crash-summary"
import { CRASH_YEAR_MAX, CRASH_YEAR_MIN } from "@/lib/filters/crash-filters"
import { cn } from "@/lib/utils"

const YEARS = Array.from(
  { length: CRASH_YEAR_MAX - CRASH_YEAR_MIN + 1 },
  (_, i) => CRASH_YEAR_MIN + i
)

/**
 * Crashes per year for the current (non-year) filters, with a range slider
 * underneath. The histogram shows what the year filter will include, so the
 * user can see trends before narrowing the range.
 */
export function TimeRangeControl({ className }: { className?: string }) {
  const { filters, setFilters } = useCrashFilters()
  const { data } = useCrashSummary()
  const counts = new Map(data?.byYear.map((y) => [y.year, y.crashes]))

  return (
    <div
      className={cn(
        "flex w-[26rem] max-w-full flex-col gap-2 rounded-md border bg-background/95 px-4 pt-3 pb-3.5 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">Fatal crashes by year</span>
        <span className="text-muted-foreground tabular-nums">
          {filters.from === filters.to ? filters.from : `${filters.from}–${filters.to}`}
        </span>
      </div>

      <YearBars
        label="Fatal crashes"
        data={YEARS.map((year) => ({ year, value: counts.get(year) ?? 0 }))}
        range={[filters.from, filters.to]}
        showAxis={false}
      />

      <Slider
        aria-label="Year range"
        min={CRASH_YEAR_MIN}
        max={CRASH_YEAR_MAX}
        step={1}
        value={[filters.from, filters.to]}
        onValueChange={(value) => {
          const [from, to] = value as number[]
          setFilters((f) => ({ ...f, from, to }))
        }}
      />
      <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{CRASH_YEAR_MIN}</span>
        <span>{CRASH_YEAR_MAX}</span>
      </div>
    </div>
  )
}
