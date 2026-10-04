"use client"

import { RotateCcw } from "lucide-react"
import { useId } from "react"

import { useCrashFilters } from "@/components/explorer/explorer-provider"
import { CrashSummaryLine } from "@/components/filters/crash-summary-line"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { CRASH_FILTER_FIELDS, type FilterField } from "@/lib/filters/crash-filter-fields"
import {
  CRASH_YEAR_MAX,
  CRASH_YEAR_MIN,
  isDefaultCrashFilters,
} from "@/lib/filters/crash-filters"

export function YearRangeSlider({ label }: { label: string }) {
  const { filters, setFilters } = useCrashFilters()
  const id = useId()
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span id={id} className="text-sm font-medium">
          {label}
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {filters.from === filters.to ? filters.from : `${filters.from}–${filters.to}`}
        </span>
      </div>
      <Slider
        aria-labelledby={id}
        min={CRASH_YEAR_MIN}
        max={CRASH_YEAR_MAX}
        step={1}
        minStepsBetweenValues={0}
        value={[filters.from, filters.to]}
        onValueChange={(value) => {
          const [from, to] = value as number[]
          setFilters((f) => ({ ...f, from, to }))
        }}
      />
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{CRASH_YEAR_MIN}</span>
        <span>{CRASH_YEAR_MAX}</span>
      </div>
    </div>
  )
}

function MultiSelectField({ field }: { field: Extract<FilterField, { type: "multi-select" }> }) {
  const { filters, setFilters } = useCrashFilters()
  const selected = filters[field.key] as string[]
  const id = useId()

  const toggle = (value: string, checked: boolean) =>
    setFilters((f) => {
      const current = f[field.key] as string[]
      const next = checked ? [...current, value] : current.filter((v) => v !== value)
      // Keep canonical (definition) order so URLs and cache keys are stable.
      const ordered = field.options.map((o) => o.value).filter((v) => next.includes(v))
      return { ...f, [field.key]: ordered }
    })

  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-0.5 text-sm font-medium">{field.label}</legend>
      <p className="-mt-1 text-xs text-muted-foreground">
        {field.hint}
        {selected.length === 0 && " · showing all"}
      </p>
      {field.options.map((option) => {
        const optionId = `${id}-${option.value}`
        return (
          <div key={option.value} className="flex items-center gap-2">
            <Checkbox
              id={optionId}
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) => toggle(option.value, checked)}
            />
            <Label htmlFor={optionId} className="font-normal">
              {option.label}
            </Label>
          </div>
        )
      })}
    </fieldset>
  )
}

export function FilterPanel() {
  const { filters, resetFilters } = useCrashFilters()
  const isDefault = isDefaultCrashFilters(filters)

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-start justify-between gap-3">
        <CrashSummaryLine />
        <Button variant="ghost" size="sm" onClick={resetFilters} disabled={isDefault}>
          <RotateCcw />
          Reset
        </Button>
      </div>
      {CRASH_FILTER_FIELDS.map((field) =>
        field.type === "year-range" ? (
          <YearRangeSlider key="years" label={field.label} />
        ) : (
          <MultiSelectField key={field.key} field={field} />
        )
      )}
    </div>
  )
}
