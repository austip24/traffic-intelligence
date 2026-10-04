# Traffic Intelligence

A map-first app for exploring US traffic safety and mobility data.

Built with Next.js 16 (App Router, Cache Components), React 19, TypeScript,
Tailwind CSS v4, shadcn/ui (Base UI), [mapcn](https://www.mapcn.dev) and
MapLibre GL JS.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # add DATABASE_URL (+ DATABASE_URL_UNPOOLED)
pnpm db:migrate              # create tables (enables postgis + pg_trgm)
pnpm etl:all                 # download public data and load it (~10–20 min)
pnpm dev                     # http://localhost:3000 → /map
```

## Data

Everything is built from public, unauthenticated downloads, so the database
can be reproduced from scratch with `pnpm etl:all`.

| Dataset | Source | Years | Used for |
| ------- | ------ | ----- | -------- |
| Fatal crashes, people | [NHTSA FARS](https://www.nhtsa.gov/crash-data-systems/fatality-analysis-reporting-system) | 2010–2024 (2024 preliminary) | Crash points, trends, filters |
| State + county boundaries | [Census cartographic boundaries](https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html) 1:500k | 2024 | Choropleths, spatial joins |
| Population | [Census Population Estimates](https://www.census.gov/programs-surveys/popest.html) | 2010–2024 | Per-capita rates |

All three are U.S. Government works in the public domain; attribution is
recorded in the `datasets` table.

### ETL steps

| Command               | What it does                                                 |
| --------------------- | ------------------------------------------------------------ |
| `pnpm etl:download`   | Fetch source files into `.data/raw` (cached, ~400 MB)         |
| `pnpm etl:boundaries` | Load the 50 states + DC and their counties into `areas`      |
| `pnpm etl:population` | Load yearly population estimates into `area_population`      |
| `pnpm etl:fars`       | Load crashes and people, one year per transaction            |
| `pnpm etl:report`     | Print data-quality metrics; exits non-zero if a check fails  |

`pnpm etl:fars --years 2020-2024` reloads a range; `--dry-run` parses and
validates without a database.

Data-handling rules worth knowing:

- **FARS codes are normalized** to stable categories (`src/lib/domain/crash.ts`)
  via per-era mappings in `scripts/etl/fars/codes.ts`. For example, 2010–2014
  `ROAD_FNC` and 2015+ `FUNC_SYS`/`RUR_URB` become one functional class.
- **Crashes without usable coordinates are kept** (`geom` is null) and counted,
  never dropped silently.
- **Counties are assigned spatially**, not from FARS county codes, so every
  year uses the same 2024 county definitions (including Connecticut's planning
  regions). Points just outside the generalized coastline are matched to the
  nearest county within 2 km.
- **Population gaps are reported, not filled.** Connecticut has no county-level
  estimates for 2010–2019 under its current planning regions.

### Why the ETL runs one process per year

On some Windows Node 22 installs, parsing several hundred MB of CSV in one
process intermittently segfaults inside V8. `etl:fars` runs each year in a
child process and retries a crashed year. That's safe because each year is a
single transaction. The scripts also pass `--single-threaded-gc`, which made
crashes much rarer. Upgrading Node may make both unnecessary.

## Database

Schema lives in `src/lib/db/schema.ts` (Drizzle). Change it, then run
`pnpm db:generate` and commit the SQL in `drizzle/`. Geometry is stored in
EPSG:4326 with generated EPSG:3857 copies (`geom_3857`) for vector tiles.

## API

All endpoints are `GET`, validate their parameters with Zod and return
generic errors (details are logged server-side). Crash filters use the same
parameters as the map URL (`from`, `to`, `user`, `light`, `setting`, `road`).
Adding `v=<dataVersion>` makes a response cacheable as immutable.

| Endpoint                         | Returns                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `/api/tiles/{crashes,areas}/z/x/y` | Mapbox Vector Tiles (density cells below z11, crashes above) |
| `/api/crashes/summary`           | National totals and crashes per year                           |
| `/api/crashes/viewport?bbox=`    | Totals, road users and top counties inside a bbox              |
| `/api/crashes/{id}`              | One crash and the people involved                              |
| `/api/areas/metrics?metric=`     | `rate`, `deaths` or `crashes` for every state and county       |
| `/api/areas/{geoid}`             | Name, bbox and simplified outline                              |
| `/api/areas/{geoid}/profile`     | Totals, rate, ranking, trend and breakdowns vs. the nation     |
| `/api/search?q=`                 | States and counties by name (`cook il` works)                  |

Bounding boxes are `minLng,minLat,maxLng,maxLat` in EPSG:4326.

## Scripts

| Command          | What it does                                  |
| ---------------- | --------------------------------------------- |
| `pnpm dev`       | Start the dev server                          |
| `pnpm build`     | Production build                              |
| `pnpm typecheck` | TypeScript check                              |
| `pnpm lint`      | ESLint                                        |
| `pnpm test`      | Unit tests (Vitest, `src` and `scripts`)      |
| `pnpm test:e2e`  | End-to-end tests (Playwright, `tests/e2e`)    |

Run `pnpm exec playwright install chromium` once before the first e2e run.

## Conventions

- **Coordinates:** everything the client sees is WGS84 (EPSG:4326) in GeoJSON
  order, `[longitude, latitude]`. See `src/types/geo.ts`.
- **Shareable state lives in the URL.** The map viewport is written to
  `?lng=&lat=&z=` with `history.replaceState`, so panning never triggers a
  server round trip. Filters, layers (`?layers=`), the area metric
  (`?metric=`) and the selection (`?sel=crash-<id>` or `?sel=area-<geoid>`)
  work the same way.
- **The map is client-only.** `MapLoader` loads MapLibre with
  `next/dynamic({ ssr: false })` to keep it out of the server bundle and the
  initial JS.
- **shadcn components use Base UI**, so composition uses the `render` prop
  rather than `asChild`.

## Basemap

The default basemap is CARTO Positron / Dark Matter (© OpenStreetMap
contributors © CARTO). Set `NEXT_PUBLIC_MAP_STYLE_LIGHT` and
`NEXT_PUBLIC_MAP_STYLE_DARK` to any MapLibre style URL to replace it.
