"use client"

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts"

import { ChartTable, formattedTooltipRow } from "@/components/charts/chart-parts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatInteger } from "@/lib/format"
import { cn } from "@/lib/utils"

type YearBarsProps = {
  data: { year: number; value: number }[]
  /** Years inside the active filter; others are de-emphasized. */
  range: [number, number]
  /** Series name, e.g. "Deaths". */
  label: string
  /** Title for the figure; omit when the surrounding UI already labels it. */
  title?: string
  /** Year ticks under the bars (off where a slider below shows the years). */
  showAxis?: boolean
  className?: string
}

// Same hue, faded, so the selected years stand out without a second color.
const OUT_OF_RANGE_FILL = "color-mix(in oklch, var(--chart-1) 45%, transparent)"

/** Counts per year as bars; years outside the filter are faded. */
export function YearBars({
  data,
  range,
  label,
  title,
  showAxis = true,
  className,
}: YearBarsProps) {
  const config = { value: { label, color: "var(--chart-3)" } } satisfies ChartConfig
  const first = data[0]?.year
  const last = data.at(-1)?.year

  return (
    <figure className={cn("flex flex-col gap-1.5", className)}>
      {title && <figcaption className="text-xs font-medium">{title}</figcaption>}
      <ChartContainer
        config={config}
        className={cn("aspect-auto w-full", showAxis ? "h-24" : "h-12")}
        aria-hidden
      >
        <BarChart
          data={data}
          // Side margins keep the first and last year labels from being clipped.
          margin={{ top: 2, right: showAxis ? 6 : 0, bottom: 0, left: showAxis ? 6 : 0 }}
          barCategoryGap={1}
        >
          <XAxis
            dataKey="year"
            hide={!showAxis}
            ticks={first !== undefined && last !== undefined ? [first, last] : undefined}
            interval={0}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
          />
          <YAxis hide domain={[0, "dataMax"]} />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => payload?.[0]?.payload?.year}
                formatter={formattedTooltipRow(formatInteger)}
              />
            }
          />
          <Bar dataKey="value" name={label} radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.year}
                fill={d.year >= range[0] && d.year <= range[1] ? "var(--color-value)" : OUT_OF_RANGE_FILL}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <ChartTable
        caption={title ?? label}
        columns={["Year", label]}
        rows={data.map((d) => [d.year, formatInteger(d.value)])}
      />
    </figure>
  )
}
