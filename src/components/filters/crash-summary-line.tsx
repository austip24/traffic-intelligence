"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useCrashSummary } from "@/hooks/use-crash-summary"
import { formatInteger, pluralize } from "@/lib/format"
import { cn } from "@/lib/utils"

/** "N fatal crashes · M deaths" for the current filters, nationally. */
export function CrashSummaryLine() {
  const { data, isPending, isError, isPlaceholderData, refetch } = useCrashSummary()

  if (isPending) {
    return (
      <div className="flex flex-col gap-1.5" aria-busy>
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
    )
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Couldn&apos;t load totals.{" "}
        <button type="button" className="underline underline-offset-4" onClick={() => refetch()}>
          Retry
        </button>
      </p>
    )
  }

  return (
    <div
      aria-live="polite"
      className={cn("flex flex-col gap-0.5 transition-opacity", isPlaceholderData && "opacity-60")}
    >
      <p className="text-sm font-medium tabular-nums">
        {pluralize(data.crashes, "fatal crash", "fatal crashes")}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {pluralize(data.fatalities, "death")} nationwide
        {data.unlocated > 0 && ` · ${formatInteger(data.unlocated)} not mappable`}
      </p>
    </div>
  )
}
