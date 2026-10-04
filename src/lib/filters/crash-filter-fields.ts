import {
  LIGHT_OPTIONS,
  ROAD_CLASSES,
  ROAD_USERS,
  SETTINGS,
  type CrashFilters,
} from "@/lib/filters/crash-filters"

type MultiSelectKey = {
  [K in keyof CrashFilters]: CrashFilters[K] extends string[] ? K : never
}[keyof CrashFilters]

/** A filter control the panel can render without knowing the dataset. */
export type FilterField =
  | { type: "year-range"; label: string }
  | {
      type: "multi-select"
      key: MultiSelectKey
      label: string
      hint: string
      options: { value: string; label: string }[]
    }

function options<const T extends readonly string[]>(def: {
  values: T
  labels: Record<T[number], string>
}) {
  return def.values.map((value) => ({ value, label: def.labels[value as T[number]] }))
}

export const CRASH_FILTER_FIELDS: FilterField[] = [
  { type: "year-range", label: "Years" },
  {
    type: "multi-select",
    key: "roadUsers",
    label: "Road users involved",
    hint: "Crashes involving any selected road user",
    options: options(ROAD_USERS),
  },
  {
    type: "multi-select",
    key: "light",
    label: "Light condition",
    hint: "Lighting at the time of the crash",
    options: options(LIGHT_OPTIONS),
  },
  {
    type: "multi-select",
    key: "settings",
    label: "Setting",
    hint: "Census urban/rural classification of the road",
    options: options(SETTINGS),
  },
  {
    type: "multi-select",
    key: "roadClasses",
    label: "Road type",
    hint: "Federal functional classification",
    options: options(ROAD_CLASSES),
  },
]
