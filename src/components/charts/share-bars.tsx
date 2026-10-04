"use client"

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"

import { categoryTick, ChartTable, formattedTooltipRow } from "@/components/charts/chart-parts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatInteger } from "@/lib/format"
import { cn } from "@/lib/utils"

export type ShareItem = {
  label: string
  count: number
  /** Comparison share, 0–1 (e.g. the national share). */
  compareShare?: number
}

type ShareBarsProps = {
  title: string
  items: ShareItem[]
  /** Name of this series, e.g. "This county". */
  valueLabel?: string
  /** Name of the comparison series, e.g. "U.S.". */
  compareLabel?: string
  /** Hide categories with no crashes here and a negligible comparison share. */
  hideEmpty?: boolean
  className?: string
}

const pct = (value: number) =>
  `${value.toLocaleString("en-US", { maximumFractionDigits: value < 10 ? 1 : 0 })}%`

const CATEGORY_AXIS_WIDTH = 150
const CategoryTick = categoryTick(26)

/**
 * Category shares as horizontal bars, optionally beside a comparison
 * (e.g. the U.S.). Bars are labeled with their percentages.
 */
export function ShareBars({
  title,
  items,
  valueLabel = "Share",
  compareLabel,
  hideEmpty,
  className,
}: ShareBarsProps) {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  const rows = (
    hideEmpty ? items.filter((i) => i.count > 0 || (i.compareShare ?? 0) >= 0.005) : items
  ).map((item) => ({
    label: item.label,
    count: item.count,
    value: total > 0 ? (item.count / total) * 100 : 0,
    compare: item.compareShare !== undefined ? item.compareShare * 100 : undefined,
  }))
  const hasCompare = compareLabel !== undefined && rows.some((r) => r.compare !== undefined)

  const config = {
    value: { label: valueLabel, color: "var(--chart-3)" },
    ...(hasCompare ? { compare: { label: compareLabel, color: "var(--chart-1)" } } : {}),
  } satisfies ChartConfig
  // Room per category: one bar, or a pair of bars.
  const height = rows.length * (hasCompare ? 34 : 24) + (hasCompare ? 28 : 4)

  return (
    <figure className={cn("flex flex-col gap-1.5", className)}>
      <figcaption className="text-xs font-medium">{title}</figcaption>
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }} aria-hidden>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
          barCategoryGap={hasCompare ? 4 : 3}
          barGap={1}
        >
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis
            type="category"
            dataKey="label"
            width={CATEGORY_AXIS_WIDTH}
            tickLine={false}
            axisLine={false}
            tick={CategoryTick}
            interval={0}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent formatter={formattedTooltipRow(pct)} />}
          />
          <Bar
            dataKey="value"
            name={valueLabel}
            fill="var(--color-value)"
            radius={2}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="value"
              position="right"
              className="fill-foreground tabular-nums"
              fontSize={11}
              formatter={(v: unknown) => pct(Number(v))}
            />
          </Bar>
          {hasCompare && (
            <Bar
              dataKey="compare"
              name={compareLabel}
              fill="var(--color-compare)"
              radius={2}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="compare"
                position="right"
                className="fill-muted-foreground tabular-nums"
                fontSize={10}
                formatter={(v: unknown) => pct(Number(v))}
              />
            </Bar>
          )}
          {hasCompare && <ChartLegend content={<ChartLegendContent />} />}
        </BarChart>
      </ChartContainer>
      <ChartTable
        caption={title}
        columns={["Category", valueLabel, "Crashes", ...(hasCompare ? [compareLabel!] : [])]}
        rows={rows.map((r) => [
          r.label,
          pct(r.value),
          formatInteger(r.count),
          ...(hasCompare ? [r.compare === undefined ? "—" : pct(r.compare)] : []),
        ])}
      />
    </figure>
  )
}
