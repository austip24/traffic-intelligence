"use client"

import { RotateCw, TriangleAlert, X } from "lucide-react"
import type { ReactNode } from "react"

import { SEVERITY_TEXT } from "@/components/charts/chart-parts"
import { useSelection } from "@/components/explorer/explorer-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Severity } from "@/lib/metrics/severity"
import { cn } from "@/lib/utils"

export function InspectorHeader({
  eyebrow,
  title,
  actions,
  closable = true,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  actions?: ReactNode
  closable?: boolean
}) {
  const { select } = useSelection()
  return (
    <div className="flex min-h-14 shrink-0 items-center gap-2 border-b py-2 pr-2 pl-4">
      <div className="flex min-w-0 flex-1 flex-col">
        {eyebrow && <p className="truncate text-xs text-muted-foreground">{eyebrow}</p>}
        <h2 className="truncate text-sm font-medium">{title}</h2>
      </div>
      {actions}
      {closable && (
        <IconAction label="Clear selection (Esc)" onClick={() => select(null)}>
          <X />
        </IconAction>
      )}
    </div>
  )
}

export function IconAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * A headline number with its label. `tone` colors the value by severity;
 * pass a `note` that says the same thing in words, so color isn't the only
 * signal.
 */
export function Stat({
  label,
  value,
  note,
  tone = "typical",
  className,
}: {
  label: string
  value: ReactNode
  note?: ReactNode
  tone?: Severity
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn("text-lg leading-tight font-semibold tabular-nums", SEVERITY_TEXT[tone])}>
        {value}
      </dd>
      {note && (
        <dd className={cn("text-[11px] leading-snug", SEVERITY_TEXT[tone] || "text-muted-foreground")}>
          {note}
        </dd>
      )}
    </div>
  )
}

export function InspectorSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-4" aria-busy aria-label="Loading details">
      <Skeleton className="h-3 w-40" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-32" />
    </div>
  )
}

export function InspectorError({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div role="alert" className="m-4 flex flex-col gap-3 rounded-md bg-destructive/10 p-3 text-sm">
      <p className="flex items-center gap-2 text-destructive">
        <TriangleAlert className="size-4 shrink-0" />
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="self-start" onClick={onRetry}>
          <RotateCw />
          Try again
        </Button>
      )}
    </div>
  )
}

/** Small print explaining what the numbers count. */
export function DataNote({ children }: { children: ReactNode }) {
  return <p className="text-[11px] leading-relaxed text-muted-foreground">{children}</p>
}
