"use client"

import { ArrowDown, ArrowUp, Info, LocateFixed } from "lucide-react"

import {
  ComparisonBars,
  ShareBars,
  TrendChart,
  YearBars,
} from "@/components/charts/lazy-charts"
import {
  useCrashFilters,
  useMapHandle,
  useSelection,
} from "@/components/explorer/explorer-provider"
import {
  DataNote,
  IconAction,
  InspectorError,
  InspectorHeader,
  InspectorSkeleton,
  Stat,
} from "@/components/inspector/inspector-parts"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAreaInfo, useAreaProfile } from "@/hooks/use-explorer-data"
import { ApiError } from "@/lib/api/client"
import {
  AREA_FLAG_CODES,
  type AreaProfile,
  type BreakdownDimension,
  type ScopeTotals,
} from "@/lib/api/schemas"
import { areaLabel, STATES } from "@/lib/domain/area"
import { FUNCTIONAL_CLASS, ROAD_USER_CATEGORY, RURAL_URBAN } from "@/lib/domain/crash"
import {
  CRASH_FINAL_YEAR,
  describeCrashFilters,
  LIGHT_OPTIONS,
} from "@/lib/filters/crash-filters"
import { formatCompact, formatInteger } from "@/lib/format"
import { AREA_FLAG_LABELS, AREA_METRIC_INFO } from "@/lib/metrics/area-metrics"
import { compareRate, describeRatio, type RateComparison } from "@/lib/metrics/severity"
import { cn } from "@/lib/utils"

const BREAKDOWN_TITLES: Record<BreakdownDimension, string> = {
  road_user: "Road users involved",
  light: "Light condition",
  road_class: "Road type",
  setting: "Setting",
}

const BREAKDOWN_LABELS: Record<BreakdownDimension, Record<string, string>> = {
  road_user: ROAD_USER_CATEGORY.labels,
  light: { ...LIGHT_OPTIONS.labels, other: "Other or unknown" },
  road_class: FUNCTIONAL_CLASS.labels,
  setting: RURAL_URBAN.labels,
}

const formatRate = AREA_METRIC_INFO.rate.format

/** This area's rate against the U.S., or null when it can't be judged. */
function nationalComparison(profile: AreaProfile): RateComparison | null {
  return compareRate(profile.totals.rate, profile.national.rate, {
    stable: profile.totals.flag === 0,
  })
}

function RateComparisonChart({ profile }: { profile: AreaProfile }) {
  const stateName = STATES[profile.stateFips]?.name ?? "State"
  const comparison = nationalComparison(profile)
  return (
    <section className="flex flex-col gap-2">
      <ComparisonBars
        title="Deaths per 100,000 residents per year"
        format={formatRate}
        rows={[
          {
            label: profile.level === "county" ? profile.name : stateName,
            value: profile.totals.rate,
            emphasis: comparison?.severity ?? "typical",
          },
          ...(profile.state ? [{ label: stateName, value: profile.state.rate }] : []),
          { label: "United States", value: profile.national.rate },
        ]}
      />
      <RankSentence profile={profile} />
    </section>
  )
}

/** The rate KPI, colored and described relative to the U.S. rate. */
function RateStat({ profile }: { profile: AreaProfile }) {
  const comparison = nationalComparison(profile)
  const rate = profile.totals.rate
  const Arrow =
    comparison?.severity === "low" ? ArrowDown : comparison && comparison.severity !== "typical" ? ArrowUp : null
  return (
    <Stat
      label="Per 100k / year"
      value={rate === null ? "—" : formatRate(rate)}
      tone={comparison?.severity}
      note={
        comparison ? (
          <span className="inline-flex items-center gap-0.5">
            {Arrow && <Arrow className="size-3 shrink-0" aria-hidden />}
            {describeRatio(comparison, "U.S.")}
          </span>
        ) : profile.totals.flag === 1 ? (
          "Unstable rate"
        ) : undefined
      }
    />
  )
}

function rankPhrase(percentile: number, peers: string) {
  if (percentile === 1) return `the highest of ${peers}`
  if (percentile === 0) return `the lowest of ${peers}`
  const pct = Math.round(percentile * 100)
  return percentile >= 0.5
    ? `higher than ${pct}% of ${peers}`
    : `lower than ${100 - pct}% of ${peers}`
}

function RankSentence({ profile }: { profile: AreaProfile }) {
  const { rank } = profile
  if (!rank) return null
  const stateName = STATES[profile.stateFips]?.name
  const parts = [rankPhrase(rank.national, `U.S. ${rank.peers}`)]
  if (rank.inState !== null && rank.inStatePeers > 1 && stateName) {
    parts.push(rankPhrase(rank.inState, `counties in ${stateName}`))
  }
  // The U.S. rate is population-weighted, so it sits below the typical
  // county's (most counties are rural, with higher rates). Explain when the
  // comparison with the U.S. and the ranking point in different directions.
  const comparison = nationalComparison(profile)
  const conflicting =
    profile.level === "county" &&
    comparison !== null &&
    (((comparison.severity === "high" || comparison.severity === "elevated") &&
      rank.national < 0.5) ||
      (comparison.severity === "low" && rank.national > 0.5))
  return (
    <p className="text-xs text-muted-foreground">
      This rate is {parts.join(", and ")}.
      {conflicting &&
        " The U.S. rate counts every resident, so it's lower than most counties' rates: the many rural counties have fewer residents and higher rates."}
      <span className="sr-only">
        {" "}
        Ranked among {rank.nationalPeers} {rank.peers} with enough deaths for a stable rate.
      </span>
    </p>
  )
}

function FlagNotice({ totals }: { totals: ScopeTotals }) {
  const flag = AREA_FLAG_CODES[totals.flag]
  if (!flag) return null
  return (
    <p className="flex gap-2 rounded-md bg-amber-500/10 px-2.5 py-2 text-xs text-amber-800 dark:text-amber-300">
      <Info className="mt-px size-3.5 shrink-0" />
      <span>
        {AREA_FLAG_LABELS[flag]}.{" "}
        {flag === "unstable"
          ? "Small numbers swing a lot from year to year; compare counts or widen the years."
          : "Rates can't be computed for these years (e.g. Connecticut's planning regions before 2020)."}
      </span>
    </p>
  )
}

function ProfileBody({ profile }: { profile: AreaProfile }) {
  const { filters } = useCrashFilters()
  const { select } = useSelection()
  const range: [number, number] = [filters.from, filters.to]
  const hasRates = profile.trend.some((t) => t.rate !== null)

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{describeCrashFilters(filters)}</p>
        {profile.population && (
          <p className="text-xs text-muted-foreground">
            {formatCompact(profile.population.value)} residents ({profile.population.year})
          </p>
        )}
      </div>

      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Fatal crashes" value={formatInteger(profile.totals.crashes)} />
        <Stat label="Deaths" value={formatInteger(profile.totals.deaths)} />
        <RateStat profile={profile} />
      </dl>

      <FlagNotice totals={profile.totals} />
      <RateComparisonChart profile={profile} />

      {hasRates && (
        <TrendChart
          title="Death rate by year"
          data={profile.trend.map((t) => ({ year: t.year, value: t.rate, compare: t.nationalRate }))}
          range={range}
          format={formatRate}
          valueLabel={profile.level === "county" ? "This county" : "This state"}
          compareLabel="United States"
        />
      )}
      <YearBars
        title="Deaths by year"
        label="Deaths"
        data={profile.trend.map((t) => ({ year: t.year, value: t.deaths }))}
        range={range}
      />

      {profile.breakdowns.map((breakdown) => (
        <ShareBars
          key={breakdown.dimension}
          title={`${BREAKDOWN_TITLES[breakdown.dimension]} (share of fatal crashes)`}
          valueLabel={profile.level === "county" ? "This county" : "This state"}
          compareLabel="U.S."
          hideEmpty
          items={breakdown.items.map((item) => ({
            label: BREAKDOWN_LABELS[breakdown.dimension][item.key] ?? item.key,
            count: item.crashes,
            compareShare: item.nationalShare,
          }))}
        />
      ))}

      {profile.level === "county" && (
        <button
          type="button"
          className="self-start text-xs underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => select({ type: "area", geoid: profile.stateFips })}
        >
          View {STATES[profile.stateFips]?.name ?? "state"} profile
        </button>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
          About these numbers
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <DataNote>
            Fatal crashes from NHTSA FARS: crashes on public roads where someone died within 30
            days. {profile.level === "county"
              ? "Crashes are assigned to counties by their reported location; crashes without usable coordinates aren't counted here."
              : "State totals use the state FARS reports, including crashes without usable coordinates."}
          </DataNote>
          <DataNote>
            Rates are deaths per 100,000 residents per year, using Census population estimates.
            They reflect where crashes happen, not where victims live, and don&apos;t account for
            how much people drive. Shares compare categories of fatal crashes, not risk.
          </DataNote>
          {filters.to > CRASH_FINAL_YEAR && (
            <DataNote>
              {CRASH_FINAL_YEAR + 1} data is preliminary and may be revised by NHTSA.
            </DataNote>
          )}
        </div>
      </details>
    </div>
  )
}

export function AreaProfilePanel({ geoid }: { geoid: string }) {
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useAreaProfile(geoid)
  const info = useAreaInfo(geoid)
  const { fitBBox } = useMapHandle()

  const title = data ? areaLabel(data) : info.data ? areaLabel(info.data) : "Loading…"
  const eyebrow = data
    ? data.level === "county"
      ? `County · ${STATES[data.stateFips]?.name ?? ""}`
      : "State"
    : undefined

  return (
    <div className="flex h-full min-h-0 flex-col">
      <InspectorHeader
        eyebrow={eyebrow}
        title={title}
        actions={
          info.data && (
            <IconAction label="Zoom to area" onClick={() => fitBBox(info.data.bbox)}>
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
              error instanceof ApiError && error.status === 404
                ? "This area isn't in the dataset."
                : "Couldn't load this area's profile."
            }
            onRetry={error instanceof ApiError && error.status === 404 ? undefined : () => refetch()}
          />
        ) : (
          <div
            aria-busy={isPlaceholderData}
            className={cn("transition-opacity", isPlaceholderData && "opacity-60")}
          >
            <ProfileBody profile={data} />
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
