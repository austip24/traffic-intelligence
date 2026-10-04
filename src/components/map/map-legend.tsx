"use client"

import { ChevronDown } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

import { useLayers } from "@/components/explorer/explorer-provider"
import { useMap } from "@/components/ui/map"
import { useAreaMetrics } from "@/hooks/use-explorer-data"
import { LAYERS } from "@/lib/layers/registry"
import type { LayerDefinition, LegendContext, LegendSpec } from "@/lib/layers/types"
import { cn } from "@/lib/utils"

function activeLegend(
  layer: LayerDefinition,
  zoom: number,
  ctx: LegendContext
): LegendSpec | null {
  const spec = layer.legends.find(
    (l) => zoom >= (l.minzoom ?? 0) && zoom < (l.maxzoom ?? Infinity)
  )?.spec
  if (!spec) return null
  return typeof spec === "function" ? spec(ctx) : spec
}

/** Matches the map's hatch pattern (see choropleth.ts) for flagged areas. */
const HATCH_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(-45deg, currentColor 0 1px, transparent 1px 5px)",
}

/** Zoom as a stable key: legends only change when crossing a band boundary. */
function useLegendBand(): number {
  const { map } = useMap()
  const [zoom, setZoom] = useState(() => map?.getZoom() ?? 0)
  useEffect(() => {
    if (!map) return
    const update = () => setZoom(map.getZoom())
    update()
    map.on("zoomend", update)
    return () => {
      map.off("zoomend", update)
    }
  }, [map])
  return zoom
}

function LegendBody({ spec }: { spec: LegendSpec }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium">{spec.title}</p>
      <ul className="flex flex-col gap-1">
        {spec.type === "categorical" &&
          spec.items.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full ring-1 ring-background"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </li>
          ))}
        {spec.type === "line" &&
          spec.items.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span
                aria-hidden
                className="w-4 shrink-0"
                style={{ height: item.width, backgroundColor: item.color }}
              />
              {item.label}
            </li>
          ))}
        {spec.type === "fill" &&
          spec.items.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span
                aria-hidden
                className="relative size-3 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-foreground/15"
                style={{ backgroundColor: item.color }}
              >
                {item.hatched && (
                  <span className="absolute inset-0 text-foreground/70" style={HATCH_STYLE} />
                )}
              </span>
              {item.label}
            </li>
          ))}
        {spec.type === "classes" &&
          spec.items.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              {/* Fixed-width slot so labels align while circle sizes vary. */}
              <span aria-hidden className="flex w-4 shrink-0 justify-center">
                <span
                  className="rounded-full"
                  style={{
                    width: item.radius * 2,
                    height: item.radius * 2,
                    backgroundColor: item.color,
                  }}
                />
              </span>
              {item.label}
            </li>
          ))}
      </ul>
    </div>
  )
}

/**
 * Legend for every visible layer, matching the current zoom band. Rendered
 * inside <Map> for context access but portaled outside the MapLibre container.
 */
export function MapLegend({ portalTo }: { portalTo: HTMLElement }) {
  const zoom = useLegendBand()
  const { resolvedTheme } = useMap()
  const { layers, areaMetric } = useLayers()
  const { data: areaMetrics } = useAreaMetrics()
  const ctx: LegendContext = { theme: resolvedTheme, areaMetric, areaMetrics }
  // Open by default only where there's room; on phones it would cover the map.
  // (The map renders client-only, so window is available here.)
  const [open, setOpen] = useState(
    () => window.matchMedia("(min-width: 48rem)").matches
  )

  const entries = LAYERS.toReversed()
    .filter((layer) => layers[layer.id]?.visible)
    .map((layer) => ({ layer, spec: activeLegend(layer, zoom, ctx) }))
    .filter((e): e is { layer: LayerDefinition; spec: LegendSpec } => !!e.spec)

  if (entries.length === 0) return null

  return createPortal(
    <section
      aria-label="Map legend"
      className="pointer-events-auto absolute top-2 left-2 z-10 max-w-[min(18rem,calc(100%-1rem))] rounded-md border bg-background/95 shadow-sm backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 rounded-md px-3 py-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Legend
        <ChevronDown
          className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
        />
      </button>
      {open && (
        <div className="flex max-h-[min(24rem,50svh)] flex-col gap-3 overflow-y-auto border-t px-3 py-2.5">
          {entries.map(({ layer, spec }) => (
            <LegendBody key={layer.id} spec={spec} />
          ))}
        </div>
      )}
    </section>,
    portalTo
  )
}
