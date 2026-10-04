"use client"

import { LocateFixed } from "lucide-react"

import { SEVERITY_TEXT } from "@/components/charts/chart-parts"
import { useMapHandle, useSelection } from "@/components/explorer/explorer-provider"
import {
  DataNote,
  IconAction,
  InspectorError,
  InspectorHeader,
  InspectorSkeleton,
  Stat,
} from "@/components/inspector/inspector-parts"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCrashDetail } from "@/hooks/use-explorer-data"
import { ApiError } from "@/lib/api/client"
import type { CrashDetail } from "@/lib/api/schemas"
import { STATES } from "@/lib/domain/area"
import {
  COUNTY_MATCH,
  FUNCTIONAL_CLASS,
  INJURY_SEVERITY,
  type InjurySeverity,
  LIGHT_CONDITION,
  PERSON_TYPE,
  ROAD_USER_CATEGORY,
  RURAL_URBAN,
  SEX,
  WEATHER,
} from "@/lib/domain/crash"
import { CRASH_FINAL_YEAR } from "@/lib/filters/crash-filters"
import { formatInteger } from "@/lib/format"
import { ROAD_USER_COLORS } from "@/lib/layers/palette"
import { crashSeverity, type Severity } from "@/lib/metrics/severity"
import { cn } from "@/lib/utils"

/** KABCO-style grouping: fatal and serious injuries are called out. */
const INJURY_TONE: Partial<Record<InjurySeverity, Severity>> = {
  fatal: "high",
  died_prior: "high",
  suspected_serious: "elevated",
}

// Contributing factors: amber with their name in text, never color alone.
const FACTOR_BADGE =
  "border-severity-elevated/30 bg-severity-elevated/10 text-severity-elevated"

// FARS dates and times are local to the crash site with no time zone, so
// they're formatted as given (in UTC) rather than shifted to the viewer's zone.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})
const monthFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

function crashWhen(crash: CrashDetail): string {
  const day = crash.date
    ? dateFormat.format(new Date(`${crash.date}T00:00:00Z`))
    : monthFormat.format(Date.UTC(crash.year, crash.month - 1, 1))
  if (crash.hour === null) return day
  const time = new Date(Date.UTC(2000, 0, 1, crash.hour, crash.minute ?? 0))
  return `${day} · ${time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })}`
}

function CrashBody({ crash }: { crash: CrashDetail }) {
  const { select } = useSelection()
  const preliminary = crash.year > CRASH_FINAL_YEAR
  const state = STATES[crash.stateFips]
  const seriouslyInjured = crash.people.filter((p) => p.injurySeverity === "suspected_serious").length

  const facts: [string, string][] = [
    ["Light", LIGHT_CONDITION.labels[crash.lightCondition]],
    ["Weather", WEATHER.labels[crash.weather]],
    ["Road type", FUNCTIONAL_CLASS.labels[crash.functionalClass]],
    ["Setting", RURAL_URBAN.labels[crash.ruralUrban]],
  ]
  if (crash.location) {
    facts.push(["Location", `${crash.location[1].toFixed(5)}, ${crash.location[0].toFixed(5)}`])
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: ROAD_USER_COLORS[crash.roadUser] }}
          />
          {ROAD_USER_CATEGORY.labels[crash.roadUser]}
        </Badge>
        {crash.alcoholInvolved && (
          <Badge variant="outline" className={FACTOR_BADGE}>
            Alcohol involved
          </Badge>
        )}
        {crash.speedingInvolved && (
          <Badge variant="outline" className={FACTOR_BADGE}>
            Speeding involved
          </Badge>
        )}
        {preliminary && <Badge variant="outline">Preliminary data</Badge>}
      </div>

      <div className="flex flex-col gap-1 text-sm">
        {crash.county ? (
          <button
            type="button"
            className="self-start text-left underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => select({ type: "area", geoid: crash.county!.geoid })}
          >
            {crash.county.name}, {state?.abbr ?? crash.stateFips}
          </button>
        ) : (
          <span>{state?.name ?? "Unknown state"}</span>
        )}
        {crash.county?.match === "nearest" && (
          <DataNote>{COUNTY_MATCH.labels.nearest}: the reported location is just outside it.</DataNote>
        )}
        {!crash.location && <DataNote>No usable coordinates were reported for this crash.</DataNote>}
      </div>

      <dl className="grid grid-cols-3 gap-3">
        <Stat
          label="Deaths"
          value={formatInteger(crash.fatalities)}
          tone={crashSeverity(crash.fatalities)}
          note={crash.fatalities > 1 ? "Multiple fatalities" : undefined}
        />
        <Stat
          label="People"
          value={formatInteger(crash.persons)}
          note={seriouslyInjured > 0 ? `${seriouslyInjured} seriously injured` : undefined}
          tone={seriouslyInjured > 0 ? "elevated" : "typical"}
        />
        <Stat label="Vehicles" value={formatInteger(crash.vehicles)} />
      </dl>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {crash.people.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium">People involved</h3>
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="py-1 pr-2 font-normal">Person</th>
                <th scope="col" className="py-1 pr-2 font-normal">Age</th>
                <th scope="col" className="py-1 pr-2 font-normal">Sex</th>
                <th scope="col" className="py-1 font-normal">Injury</th>
              </tr>
            </thead>
            <tbody>
              {crash.people.map((p) => {
                const tone = INJURY_TONE[p.injurySeverity]
                return (
                  <tr key={`${p.vehicleNumber}-${p.personNumber}`} className="border-b last:border-b-0">
                    <td className="py-1.5 pr-2">
                      {PERSON_TYPE.labels[p.personType]}
                      {p.vehicleNumber > 0 && (
                        <span className="text-muted-foreground"> · veh. {p.vehicleNumber}</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums">{p.age ?? "—"}</td>
                    <td className="py-1.5 pr-2">{SEX.labels[p.sex]}</td>
                    <td
                      className={cn(
                        "py-1.5",
                        tone ? cn("font-medium", SEVERITY_TEXT[tone]) : "text-muted-foreground"
                      )}
                    >
                      {INJURY_SEVERITY.labels[p.injurySeverity]}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      <DataNote>
        NHTSA FARS {crash.year}, case {crash.id % 1_000_000}. Times are local to the crash
        site.{preliminary && " This year's data is preliminary and may be revised."}
      </DataNote>
    </div>
  )
}

export function CrashDetailPanel({ id }: { id: number }) {
  const { data, isPending, isError, error, refetch } = useCrashDetail(id)
  const { mapRef } = useMapHandle()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <InspectorHeader
        eyebrow="Fatal crash"
        title={data ? crashWhen(data) : "Loading…"}
        actions={
          data?.location && (
            <IconAction
              label="Zoom to crash"
              onClick={() =>
                mapRef.current?.flyTo({
                  center: data.location!,
                  zoom: Math.max(mapRef.current.getZoom(), 14),
                })
              }
            >
              <LocateFixed />
            </IconAction>
          )
        }
      />
      <ScrollArea className="min-h-0 flex-1">
        {isPending ? (
          <InspectorSkeleton />
        ) : isError ? (
          <InspectorError
            message={
              error instanceof ApiError && error.status < 500
                ? "This crash isn't in the dataset."
                : "Couldn't load this crash."
            }
            onRetry={error instanceof ApiError && error.status < 500 ? undefined : () => refetch()}
          />
        ) : (
          <CrashBody crash={data} />
        )}
      </ScrollArea>
    </div>
  )
}
