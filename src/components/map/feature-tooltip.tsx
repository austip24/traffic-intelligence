"use client"

import { useLayers } from "@/components/explorer/explorer-provider"
import { useAreaMetrics } from "@/hooks/use-explorer-data"
import { areaLabel, levelOfGeoid } from "@/lib/domain/area"
import { ROAD_USER_CATEGORY, type RoadUserCategory } from "@/lib/domain/crash"
import { pluralize } from "@/lib/format"
import { CHOROPLETH_LAYER_ID } from "@/lib/layers/choropleth"
import type { FeatureKind } from "@/lib/layers/types"
import { AREA_FLAG_LABELS, AREA_METRIC_INFO } from "@/lib/metrics/area-metrics"
import { AREA_FLAG_CODES } from "@/lib/api/schemas"

/** Tile feature properties are untyped; read them defensively. */
type Properties = Record<string, unknown>

export type HoveredFeature = { kind: FeatureKind; properties: Properties }

const num = (p: Properties, key: string) => (typeof p[key] === "number" ? (p[key] as number) : 0)
const str = (p: Properties, key: string) => (typeof p[key] === "string" ? (p[key] as string) : "")

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] text-muted-foreground">{children}</p>
}

function CrashTooltip({ properties }: { properties: Properties }) {
  const roadUser = str(properties, "road_user") as RoadUserCategory
  return (
    <>
      <p className="font-medium">
        Fatal crash, {num(properties, "year")} · {pluralize(num(properties, "fatalities"), "death")}
      </p>
      <p className="text-muted-foreground">{ROAD_USER_CATEGORY.labels[roadUser] ?? "Unknown"}</p>
      <Hint>Click for details</Hint>
    </>
  )
}

function CellTooltip({ properties }: { properties: Properties }) {
  return (
    <>
      <p className="font-medium">{pluralize(num(properties, "crashes"), "fatal crash", "fatal crashes")}</p>
      <p className="text-muted-foreground">
        {pluralize(num(properties, "fatalities"), "death")} ·{" "}
        {num(properties, "density").toLocaleString("en-US", { maximumFractionDigits: 1 })} per 1,000
        km² per year
      </p>
      <Hint>Click to zoom in</Hint>
    </>
  )
}

function AreaTooltip({ properties }: { properties: Properties }) {
  const { layers, areaMetric } = useLayers()
  const { data } = useAreaMetrics()
  const geoid = str(properties, "geoid")
  const level = levelOfGeoid(geoid)
  const label = areaLabel({ level, name: str(properties, "name"), stateFips: str(properties, "state_fips") })

  // Only show a value when the choropleth is on and showing the current metric.
  const showValue = layers[CHOROPLETH_LAYER_ID]?.visible && data?.metric === areaMetric
  const entry = showValue ? data[level].areas.find(([id]) => id === geoid) : undefined
  const info = AREA_METRIC_INFO[areaMetric]
  const flag = entry ? AREA_FLAG_CODES[entry[2]] : null

  return (
    <>
      <p className="font-medium">{label}</p>
      {entry && (
        <p className="text-muted-foreground">
          {entry[1] === null ? "No data" : info.format(entry[1])}{" "}
          {areaMetric === "rate" ? "deaths per 100k residents a year" : info.label.toLowerCase()}
        </p>
      )}
      {flag && <p className="text-[11px] text-amber-600 dark:text-amber-400">{AREA_FLAG_LABELS[flag]}</p>}
      <Hint>Click for {level === "county" ? "county" : "state"} profile</Hint>
    </>
  )
}

export function FeatureTooltip({ feature }: { feature: HoveredFeature }) {
  return (
    <div
      role="tooltip"
      className="max-w-64 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
    >
      {feature.kind === "crash" && <CrashTooltip properties={feature.properties} />}
      {feature.kind === "crash-cell" && <CellTooltip properties={feature.properties} />}
      {feature.kind === "area" && <AreaTooltip properties={feature.properties} />}
    </div>
  )
}
