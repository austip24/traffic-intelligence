"use client"

import type { ReactNode } from "react"

import type { Severity } from "@/lib/metrics/severity"

/** Severity → design tokens (globals.css). Typical values stay neutral. */
export const SEVERITY_FILL: Record<Severity, string> = {
  high: "var(--severity-high)",
  elevated: "var(--severity-elevated)",
  typical: "var(--chart-3)",
  low: "var(--severity-low)",
}

export const SEVERITY_TEXT: Record<Severity, string> = {
  high: "text-severity-high",
  elevated: "text-severity-elevated",
  typical: "",
  low: "text-severity-low",
}

/**
 * A tooltip row with a formatted value (the default prints raw numbers).
 * The series name comes from the `name` prop on the Line or Bar.
 */
export function formattedTooltipRow(format: (value: number) => string) {
  return function TooltipRow(
    value: unknown,
    name: unknown,
    item: { color?: string; payload?: { fill?: string } }
  ): ReactNode {
    return (
      <div className="flex w-full items-center gap-2">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: item.payload?.fill ?? item.color }}
        />
        <span className="flex-1 text-muted-foreground">{String(name)}</span>
        <span className="font-mono font-medium text-foreground tabular-nums">
          {typeof value === "number" ? format(value) : String(value)}
        </span>
      </div>
    )
  }
}

/** Legend icons that show line style, so series differ by more than color. */
export function SolidLineIcon() {
  return (
    <svg viewBox="0 0 16 4" className="h-1 w-4" aria-hidden>
      <line x1="0" y1="2" x2="16" y2="2" stroke="var(--color-value)" strokeWidth="2.5" />
    </svg>
  )
}

export function DashedLineIcon() {
  return (
    <svg viewBox="0 0 16 4" className="h-1 w-4" aria-hidden>
      <line
        x1="0"
        y1="2"
        x2="16"
        y2="2"
        stroke="var(--color-compare)"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
    </svg>
  )
}

/** Numbers behind a chart for screen readers (the SVG itself is hidden). */
export function ChartTable({
  caption,
  columns,
  rows,
}: {
  caption: string
  columns: string[]
  rows: (string | number)[][]
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([head, ...cells]) => (
          <tr key={String(head)}>
            <th scope="row">{head}</th>
            {cells.map((cell, i) => (
              <td key={i}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Category axis label on one line, truncated to fit. Recharts' default tick
 * wraps long labels onto two lines, which misaligns them with their bars.
 * The full label is in the tooltip and the accessible table.
 */
export function categoryTick(maxChars: number) {
  return function CategoryTick({
    x,
    y,
    payload,
  }: {
    x?: number | string
    y?: number | string
    payload?: { value?: unknown }
  }) {
    const label = String(payload?.value ?? "")
    return (
      <text
        x={Number(x)}
        y={Number(y)}
        dy={4}
        textAnchor="end"
        fontSize={11}
        className="fill-muted-foreground"
      >
        {label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label}
      </text>
    )
  }
}
