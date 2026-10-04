import { boundariesLayer } from "@/lib/layers/boundaries"
import { choroplethLayer } from "@/lib/layers/choropleth"
import { crashesLayer } from "@/lib/layers/crashes"
import type { LayerDefinition } from "@/lib/layers/types"

/** Bottom-to-top draw order. Add a dataset by adding its definition here. */
export const LAYERS: readonly LayerDefinition[] = [choroplethLayer, boundariesLayer, crashesLayer]

export const LAYER_IDS = LAYERS.map((l) => l.id)

export function getLayer(id: string): LayerDefinition | undefined {
  return LAYERS.find((l) => l.id === id)
}

export const DEFAULT_VISIBLE_LAYERS = LAYERS.filter((l) => l.defaultVisible).map((l) => l.id)
