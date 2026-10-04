import { ArrowLeft, ExternalLink } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"

import { AppBrand } from "@/components/layout/app-brand"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"
import { getDatasets } from "@/lib/data/datasets"
import {
  CRASH_FINAL_YEAR,
  CRASH_YEAR_MAX,
  CRASH_YEAR_MIN,
} from "@/lib/filters/crash-filters"
import { formatInteger } from "@/lib/format"
import { MIN_DEATHS_FOR_STABLE_RATE } from "@/lib/metrics/area-metrics"

export const metadata: Metadata = {
  title: "About the data",
  description:
    "Sources, licenses, methods and limitations behind the Traffic Intelligence fatal crash map.",
}

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" })

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  )
}

async function Sources() {
  const datasets = await getDatasets()
  return (
    <ul className="flex flex-col gap-4">
      {datasets.map((d) => (
        <li key={d.id} className="flex flex-col gap-1.5 rounded-md border p-4">
          <p className="font-medium text-foreground">{d.name}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            <dt>Publisher</dt>
            <dd className="text-foreground">{d.publisher}</dd>
            <dt>Version</dt>
            <dd className="text-foreground">{d.version}</dd>
            <dt>Records</dt>
            <dd className="text-foreground tabular-nums">{formatInteger(d.rowCount)}</dd>
            <dt>Retrieved</dt>
            <dd className="text-foreground">{dateFormat.format(new Date(d.retrievedAt))}</dd>
            <dt>License</dt>
            <dd className="text-foreground">{d.license}</dd>
            <dt>Credit</dt>
            <dd className="text-foreground">{d.attribution}</dd>
          </dl>
          {d.notes && <p className="text-xs">{d.notes}</p>}
          <a
            href={d.sourceUrl}
            className="inline-flex items-center gap-1 self-start text-xs text-foreground underline underline-offset-4"
            rel="noreferrer"
            target="_blank"
          >
            Source files
            <ExternalLink className="size-3" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

export default function AboutPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="flex h-12 items-center gap-2 border-b px-3">
        <AppBrand />
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-10">
        <div className="flex flex-col gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 self-start"
            nativeButton={false}
            render={<Link href="/map" />}
          >
            <ArrowLeft />
            Back to the map
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">About the data</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Traffic Intelligence maps every fatal traffic crash in the United States from{" "}
            {CRASH_YEAR_MIN} to {CRASH_YEAR_MAX}, so you can see where they concentrate, how places
            compare and how that has changed. All data comes from public U.S. government sources.
          </p>
        </div>

        <Section title="What's counted">
          <p>
            A fatal crash is a crash on a public road in which at least one person died within 30
            days, as recorded in NHTSA&apos;s Fatality Analysis Reporting System (FARS). Crashes
            that injured people but killed no one are not included. The 50 states and the District
            of Columbia are covered; Puerto Rico and the territories are not.
          </p>
          <p>
            {CRASH_FINAL_YEAR + 1} data comes from NHTSA&apos;s preliminary Annual Report File and
            may be revised when the final file is released. Earlier years are final.
          </p>
        </Section>

        <Section title="Locations and places">
          <p>
            Crashes are drawn where FARS reports them. About 0.6% of crashes have no usable
            coordinates; they count toward national and state totals but don&apos;t appear on the
            map or in county figures.
          </p>
          <p>
            Each located crash is assigned to the county that contains it, using 2024 Census
            boundaries for every year so places are comparable over time. Crashes reported just
            outside their state&apos;s coastline or border are assigned to the nearest county in
            that state, if one is within 10 km. Connecticut is shown by its nine planning regions,
            which replaced its counties in Census geography in 2022.
          </p>
          <p>
            Zoomed out, crashes are grouped into grid cells and shown as fatal crashes per 1,000
            km² per year, measured on true ground area so a color means the same thing at every
            latitude and zoom level.
          </p>
        </Section>

        <Section title="Rates and comparisons">
          <p>
            Death rates are deaths per 100,000 residents per year, using Census population
            estimates for each year selected. They describe where crashes happen, not where victims
            lived, and they don&apos;t account for how much people drive: a county on a busy
            interstate corridor can have a high rate with few residents. Rates per mile driven need
            traffic volume data, which isn&apos;t loaded yet.
          </p>
          <p>
            Rates based on fewer than {MIN_DEATHS_FOR_STABLE_RATE} deaths swing widely by chance
            and are hatched on the map, left out of the color breaks and not ranked. Areas without a
            population estimate for every selected year (Connecticut&apos;s planning regions before
            2020) have no rate.
          </p>
          <p>
            Map colors use quantile classes: each class holds about the same number of areas, so
            colors show how an area ranks rather than absolute differences. Read the legend for the
            values behind each color.
          </p>
        </Section>

        <Section title="Categories">
          <p>
            Road user, alcohol and speeding flags come from the FARS person and vehicle records. A
            crash involving several road users is counted once on the map, under the first that
            applies: pedestrian, then bicyclist, then motorcyclist. FARS changed how it codes road
            types in 2015; major and minor collectors are merged so every year uses the same
            categories.
          </p>
        </Section>

        <Section title="Sources and licenses">
          <Sources />
          <p className="text-xs">
            Basemap © CARTO, © OpenStreetMap contributors (ODbL). Government data is in the public
            domain; credit to the publishers is given as a courtesy.
          </p>
        </Section>
      </main>
    </div>
  )
}
