"use client"

import { CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from "recharts"

import {
  ChartTable,
  DashedLineIcon,
  formattedTooltipRow,
  SolidLineIcon,
} from "@/components/charts/chart-parts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

export type TrendPoint = { year: number; value: number | null; compare?: number | null }

type TrendChartProps = {
  title: string
  data: TrendPoint[]
  /** Years inside the active filter; shaded when they're a subset. */
  range: [number, number]
  format: (value: number) => string
  valueLabel: string
  /** Label for the dashed comparison series, if any. */
  compareLabel?: string
  className?: string
}

/**
 * One area across all years, optionally against a dashed comparison line
 * (e.g. the national rate). Gaps (missing population) break the line.
 */
export function TrendChart({
  title,
  data,
  range,
  format,
  valueLabel,
  compareLabel,
  className,
}: TrendChartProps) {
  const config = {
    value: { label: valueLabel, color: "var(--chart-3)", icon: SolidLineIcon },
    ...(compareLabel
      ? { compare: { label: compareLabel, color: "var(--chart-1)", icon: DashedLineIcon } }
      : {}),
  } satisfies ChartConfig
  const first = data[0]?.year ?? range[0]
  const last = data.at(-1)?.year ?? range[1]
  const shadeRange = range[0] > first || range[1] < last

  return (
    <figure className={cn("flex flex-col gap-1.5", className)}>
      <figcaption className="text-xs font-medium">{title}</figcaption>
      <ChartContainer config={config} className="aspect-auto h-40 w-full" aria-hidden>
        <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          {shadeRange && (
            <ReferenceArea
              x1={Math.max(range[0], first)}
              x2={Math.min(range[1], last)}
              fill="var(--muted)"
              fillOpacity={0.7}
            />
          )}
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            width={30}
            tickLine={false}
            axisLine={false}
            tickCount={4}
            tickFormatter={(v: number) => format(v)}
          />
          <ChartTooltip
            content={<ChartTooltipContent formatter={formattedTooltipRow(format)} />}
          />
          {compareLabel && (
            <Line
              dataKey="compare"
              name={compareLabel}
              stroke="var(--color-compare)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
          )}
          <Line
            dataKey="value"
            name={valueLabel}
            stroke="var(--color-value)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </LineChart>
      </ChartContainer>
      <ChartTable
        caption={title}
        columns={["Year", valueLabel, ...(compareLabel ? [compareLabel] : [])]}
        rows={data.map((d) => [
          d.year,
          d.value === null ? "No data" : format(d.value),
          ...(compareLabel ? [d.compare == null ? "No data" : format(d.compare)] : []),
        ])}
      />
    </figure>
  )
}
