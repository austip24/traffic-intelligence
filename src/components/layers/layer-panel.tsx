"use client"

import { RotateCw, TriangleAlert } from "lucide-react"
import { useId } from "react"

import { useLayers } from "@/components/explorer/explorer-provider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { LAYERS } from "@/lib/layers/registry"
import type { LayerDefinition } from "@/lib/layers/types"
import {
  AREA_METRIC_INFO,
  AREA_METRICS,
  isAreaMetric,
} from "@/lib/metrics/area-metrics"

const METRIC_ITEMS = Object.fromEntries(AREA_METRICS.map((m) => [m, AREA_METRIC_INFO[m].label]))

function AreaMetricSelect() {
  const { areaMetric, setAreaMetric } = useLayers()
  const id = useId()
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="w-14 shrink-0 text-xs text-muted-foreground">
        Measure
      </label>
      <Select
        items={METRIC_ITEMS}
        value={areaMetric}
        onValueChange={(value) => {
          if (isAreaMetric(value)) setAreaMetric(value)
        }}
      >
        <SelectTrigger id={id} size="sm" className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AREA_METRICS.map((metric) => (
            <SelectItem key={metric} value={metric}>
              {AREA_METRIC_INFO[metric].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function LayerRow({ layer }: { layer: LayerDefinition }) {
  const { layers, setVisible, setOpacity, errors, retry } = useLayers()
  const state = layers[layer.id]
  const error = errors[layer.id]
  const id = useId()

  return (
    <li className="flex flex-col gap-3 border-b px-4 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={id} className="text-sm font-medium">
            {layer.title}
          </label>
          <p className="text-xs text-muted-foreground">{layer.description}</p>
        </div>
        <Switch
          id={id}
          checked={state.visible}
          onCheckedChange={(checked) => setVisible(layer.id, checked)}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
        >
          <span className="flex items-center gap-1.5">
            <TriangleAlert className="size-3.5" />
            {error}
          </span>
          <Button variant="ghost" size="xs" onClick={() => retry(layer.id)}>
            <RotateCw />
            Retry
          </Button>
        </div>
      )}

      {state.visible && layer.controls === "area-metric" && <AreaMetricSelect />}

      {state.visible && (
        <div className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs text-muted-foreground">Opacity</span>
          <Slider
            aria-label={`${layer.title} opacity`}
            min={0.1}
            max={1}
            step={0.05}
            value={[state.opacity]}
            onValueChange={(value) => setOpacity(layer.id, (value as number[])[0])}
          />
          <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
            {Math.round(state.opacity * 100)}%
          </span>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/80">Source: {layer.attribution}</p>
    </li>
  )
}

export function LayerPanel() {
  // Top of the list = top of the map.
  return (
    <ul className="flex flex-col">
      {LAYERS.toReversed().map((layer) => (
        <LayerRow key={layer.id} layer={layer} />
      ))}
    </ul>
  )
}
