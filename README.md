# Traffic Intelligence

A map-first app for exploring US traffic safety and mobility data.

Built with Next.js 16 (App Router, Cache Components), React 19, TypeScript,
Tailwind CSS v4, shadcn/ui (Base UI), [mapcn](https://www.mapcn.dev) and
MapLibre GL JS.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # optional: custom basemap styles
pnpm dev                     # http://localhost:3000 → /map
```

## Scripts

| Command          | What it does                                  |
| ---------------- | --------------------------------------------- |
| `pnpm dev`       | Start the dev server                          |
| `pnpm build`     | Production build                              |
| `pnpm typecheck` | TypeScript check                              |
| `pnpm lint`      | ESLint                                        |
| `pnpm test`      | Unit tests (Vitest, `src/**/*.test.ts`)       |
| `pnpm test:e2e`  | End-to-end tests (Playwright, `tests/e2e`)    |

Run `pnpm exec playwright install chromium` once before the first e2e run.

## Conventions

- **Coordinates:** everything the client sees is WGS84 (EPSG:4326) in GeoJSON
  order, `[longitude, latitude]`. See `src/types/geo.ts`.
- **Shareable state lives in the URL.** The map viewport is written to
  `?lng=&lat=&z=` with `history.replaceState`, so panning never triggers a
  server round trip.
- **The map is client-only.** `MapLoader` loads MapLibre with
  `next/dynamic({ ssr: false })` to keep it out of the server bundle and the
  initial JS.
- **shadcn components use Base UI**, so composition uses the `render` prop
  rather than `asChild`.

## Basemap

The default basemap is CARTO Positron / Dark Matter (© OpenStreetMap
contributors © CARTO). Set `NEXT_PUBLIC_MAP_STYLE_LIGHT` and
`NEXT_PUBLIC_MAP_STYLE_DARK` to any MapLibre style URL to replace it.
