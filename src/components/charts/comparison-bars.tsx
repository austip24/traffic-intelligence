"use client"

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts"

import {
  categoryTick,
  ChartTable,
  formattedTooltipRow,
  SEVERITY_FILL,
} from "@/components/charts/chart-parts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { Severity } from "@/lib/metrics/severity"
import { cn } from "@/lib/utils"

export type ComparisonRow = {
  label: string
  value: number | null
  /** The row being compared; colored by its severity, the rest stay neutral. */
  emphasis?: Severity
}

type ComparisonBarsProps = {
  title: string
  rows: ComparisonRow[]
  format: (value: number) => string
  className?: string
}

const CategoryTick = categoryTick(22)

const NEUTRAL_FILL = "var(--chart-1)"

/** One value per row (e.g. county, state, U.S. rates), labeled at the bar end. */
export function ComparisonBars({ title, rows, format, className }: ComparisonBarsProps) {
  const config = { value: { label: title, color: "var(--chart-3)" } } satisfies ChartConfig
  const data = rows.map((r) => ({ ...r, value: r.value ?? 0, missing: r.value === null }))

  return (
    <figure className={cn("flex flex-col gap-1.5", className)}>
      <figcaption className="text-xs font-medium">{title}</figcaption>
      <ChartContainer
        config={config}
        className="aspect-auto w-full"
        style={{ height: rows.length * 28 }}
        aria-hidden
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 44, bottom: 0, left: 0 }}
          barCategoryGap={5}
        >
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="label"
            width={126}
            tickLine={false}
            axisLine={false}
            tick={CategoryTick}
            interval={0}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel formatter={formattedTooltipRow(format)} />}
          />
          <Bar dataKey="value" name="Rate" radius={2} isAnimationActive={false}>
            {data.map((row) => (
              <Cell
                key={row.label}
                fill={row.emphasis ? SEVERITY_FILL[row.emphasis] : NEUTRAL_FILL}
              />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              className="fill-foreground tabular-nums"
              fontSize={11}
              formatter={(v: unknown) => format(Number(v))}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <ChartTable
        caption={title}
        columns={["Area", "Value"]}
        rows={rows.map((r) => [r.label, r.value === null ? "No data" : format(r.value)])}
      />
    </figure>
  )
}
