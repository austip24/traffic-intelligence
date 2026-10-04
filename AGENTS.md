# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

## Project Overview

This project is a modern geospatial web application for exploring and analyzing transportation, traffic, mobility, and related geographic data.

The application should provide an interactive map-first experience where users can explore geographic datasets, inspect individual features, filter data spatially, and view analytical summaries.

The project is intended to demonstrate production-quality frontend engineering, geospatial visualization, data handling, performance optimization, and thoughtful UX.

The application should remain generic enough to support multiple public transportation and mobility datasets, including:

- Road networks
- Traffic volumes
- Traffic counts
- Crash data
- Public transportation
- Census and demographic data
- Pedestrian and bicycle infrastructure
- Geographic boundaries
- Historical transportation data

Do not assume a specific city, state, or dataset unless explicitly requested.

---

## Core Technology

Use the following technologies unless there is a strong technical reason to deviate:

- **Next.js 16**
- **React**
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui**
- **mapcn**
- **MapLibre GL JS**
- **Zod**
- **React Hook Form**, when forms become sufficiently complex
- **Lucide React** for icons

Use the App Router and modern Next.js 16 conventions.

Prefer server components by default. Use client components only when browser APIs, interactivity, map functionality, stateful UI, or event handlers require them.

---

## Map

The map is a primary application surface, not merely a decorative component.

Use **mapcn** for map UI and map-related components whenever an appropriate component exists.

Mapcn documentation:

https://www.mapcn.dev/llms.txt

Use MapLibre-compatible functionality through mapcn rather than introducing another mapping library unless a specific requirement cannot reasonably be satisfied.

Do not introduce Leaflet, OpenLayers, Google Maps, Mapbox GL JS, or another mapping framework unless explicitly requested.

### Map Principles

- Keep map rendering performant.
- Avoid rendering unnecessarily large datasets directly in React.
- Prefer server-side filtering, aggregation, vector tiles, or other appropriate spatial data strategies for large datasets.
- Do not send hundreds of thousands of unnecessary records to the browser.
- Keep geographic coordinate systems explicit.
- Document coordinate reference system assumptions.
- Use GeoJSON only when the amount of data is appropriate for client-side rendering.
- For large datasets, investigate vector tiles, server-side aggregation, clustering, or spatial database queries.
- Avoid unnecessary rerenders of the map.
- Keep map state separate from unrelated UI state when practical.

### Map UX

The map should support:

- Pan and zoom
- Layer visibility
- Feature selection
- Hover states where useful
- Tooltips
- Popovers/details panels
- Filtering
- Legends
- Loading states
- Empty states
- Error states
- Responsive behavior

Map interactions should feel immediate.

---

## Application Architecture

Prefer a clear separation between:

```text
UI
↓
Application State
↓
Data Access
↓
Geospatial Processing
↓
Database / External Data
```

Do not place data-fetching logic, spatial calculations, and complex business logic directly inside UI components.

Recommended conceptual structure:

```text
app/
  (routes)/
  api/

components/
  map/
  charts/
  filters/
  layout/
  ui/

lib/
  data/
  geo/
  maps/
  validation/
  utils/

types/
```

The exact directory structure may evolve as the application grows.

---

## Next.js

Use the App Router.

Prefer:

- Server Components
- Server-side data fetching
- Route Handlers where appropriate
- Server Actions where appropriate
- Streaming/loading UI where beneficial
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- Metadata APIs

Avoid turning large portions of the application into client components unnecessarily.

Use `"use client"` only when required.

Examples of appropriate client components:

- Interactive maps
- Map controls
- Interactive charts
- Complex filters
- Browser-only APIs
- Components requiring local interactive state

---

## TypeScript

Use strict TypeScript.

Do not use `any` unless there is a compelling reason and the usage is documented.

Prefer:

- Explicit domain types
- Discriminated unions
- Type-safe API responses
- Zod validation at external boundaries
- Narrow types instead of broad object types

Do not duplicate types across unrelated files.

Create shared domain types for important entities such as:

```ts
RoadSegment
TrafficCount
Crash
TransitStop
TransitRoute
GeographicArea
MapFeature
MobilityMetric
```

Use appropriate names based on the actual data model.

---

## Data Validation

External data should be considered untrusted.

Validate external API responses, uploaded datasets, query parameters, and user-controlled input.

Use Zod where runtime validation is appropriate.

Do not assume external datasets always conform perfectly to their documented schema.

Handle:

- Missing values
- Null values
- Invalid coordinates
- Invalid geometries
- Unexpected categorical values
- Invalid timestamps
- Duplicate records

---

## Geospatial Data

Treat geographic data as a first-class domain.

Be explicit about:

- CRS
- Latitude/longitude order
- Units
- Distances
- Areas
- Bounding boxes
- Geometry types
- Precision

Never silently assume coordinate systems.

When converting between coordinate systems, use a well-established geospatial library rather than implementing projection mathematics manually.

Be especially careful with:

```text
latitude vs longitude
x vs y
longitude vs latitude
EPSG:4326
Web Mercator
meters vs degrees
```

---

## Performance

Performance is a major project requirement.

Assume datasets may eventually contain hundreds of thousands or millions of records.

Never solve a large-data problem by simply increasing the amount of data sent to the browser.

Prefer:

1. Spatial filtering
2. Server-side aggregation
3. Database indexing
4. Bounding-box queries
5. Clustering
6. Vector tiles
7. Simplified geometries
8. Pagination
9. Progressive loading
10. Appropriate caching

Avoid:

```ts
data.map(...)
```

over extremely large datasets inside frequently rendered React components.

Do not store massive datasets in React state.

Avoid unnecessary serialization between server and client.

Measure before implementing complicated optimizations, but assume geospatial data can become large.

---

## Map Data Strategy

Choose the representation based on dataset size.

### Small dataset

GeoJSON may be appropriate.

### Medium dataset

Consider:

- Server-side filtering
- Bounding-box queries
- Clustering
- Simplified geometry
- Pagination

### Large dataset

Prefer:

- Vector tiles
- Server-side aggregation
- Spatial database queries
- Tile-based loading

Do not load an entire national road network into the browser simply because it is technically possible.

---

## UI / shadcn

Use **shadcn/ui** for application UI primitives.

Documentation: https://ui.shadcn.com/llms.txt

Prefer existing shadcn components before creating custom equivalents.

Common components include:

- Button
- Card
- Chart
- Dialog
- Sheet
- Tabs
- Select
- Command
- Dropdown Menu
- Tooltip
- Popover
- Badge
- Table
- Input
- Slider
- Checkbox
- Separator
- Skeleton

Use composition rather than creating monolithic components.

Keep UI visually consistent.

Do not introduce another component library without a specific reason.

---

## Styling

Use Tailwind CSS v4.

Prefer Tailwind utilities and shadcn conventions over custom CSS.

Avoid excessive one-off CSS.

Use CSS variables/design tokens for application-wide colors and theming.

The application should support dark mode unless explicitly disabled.

For map-specific styling, keep map styling separate from general application styling.

---

## Design Direction

The application should feel like a modern professional analytics platform.

Prioritize:

- Clean layouts
- Strong information hierarchy
- Dense but readable data presentation
- Clear map controls
- Subtle borders
- Consistent spacing
- Useful empty states
- Responsive layouts
- Accessible interactions

Avoid:

- Excessive gradients
- Excessive animations
- Decorative UI that does not improve usability
- Giant hero sections inside the primary application
- Excessively rounded interfaces
- Dashboard-card overload

The map should remain visually dominant.

---

## Application Layout

A typical desktop layout may resemble:

```text
┌──────────────────────────────────────────────────────────────┐
│ Header                                                       │
├───────────────┬──────────────────────────────────────────────┤
│               │                                              │
│ Filters       │                                              │
│               │                    MAP                       │
│ Layers        │                                              │
│               │                                              │
│ Analytics     │                                              │
│               │                                              │
├───────────────┴──────────────────────────────────────────────┤
│ Optional status / timeline / analytics                      │
└──────────────────────────────────────────────────────────────┘
```

Do not rigidly follow this layout if the application's actual UX benefits from another structure.

---

## Responsive Design

The application must work on:

- Desktop
- Tablet
- Mobile

The map should remain usable on small screens.

On mobile, consider:

- Bottom sheets
- Collapsible filters
- Floating controls
- Full-screen map mode
- Swipeable detail panels

Do not simply shrink the desktop layout.

---

## State Management

Use local React state when state is local.

Do not introduce global state without a clear need.

For shared application state, prefer a small, clearly defined state layer.

Map state may include:

- Viewport
- Zoom
- Active layers
- Selected feature
- Filters
- Time range

Do not put every piece of application state into one global store.

URL state should be considered for shareable/filterable views.

For example:

```text
/map?lat=...&lng=...&zoom=...&layer=traffic&year=2025
```

Use URL state when it provides meaningful deep-linking or sharing benefits.

---

## API Design

API endpoints should have clear responsibilities.

Prefer resource-oriented APIs.

Example:

```text
/api/traffic
/api/crashes
/api/transit
/api/roads
/api/areas
```

Spatial queries should support appropriate parameters such as:

```text
bbox
zoom
from
to
limit
offset
layer
```

Validate all query parameters.

Do not expose database credentials or internal implementation details.

---

## Error Handling

Errors should be explicit and actionable.

Provide:

- Loading states
- Empty states
- Error states
- Retry functionality where appropriate

Do not silently swallow errors.

Avoid exposing sensitive server-side error details to users.

Log useful diagnostic information server-side.

---

## Accessibility

Follow WCAG-oriented accessibility practices.

Ensure:

- Keyboard navigation
- Visible focus states
- Semantic HTML
- Accessible labels
- Appropriate ARIA attributes
- Sufficient contrast
- Screen-reader-friendly controls

Do not rely exclusively on color to communicate map meaning.

For example, a traffic severity layer should use a legend and/or additional visual distinctions rather than color alone.

---

## Charts and Analytics

Charts should complement the map rather than compete with it.

Use charts for:

- Time-series traffic volume
- Crash trends
- Traffic composition
- Mobility metrics
- Comparisons between areas
- Historical changes

Charts should respond to the current geographic selection where appropriate.

Example:

```text
Select road
      ↓
Map highlights road
      ↓
Analytics panel updates
      ↓
Traffic trend + crash statistics + related metrics
```

Avoid creating charts merely to fill dashboard space.

---

## Data Sources

The application should be designed to support public datasets.

Potential sources include:

- OpenStreetMap
- Federal Highway Administration
- National Highway Traffic Safety Administration
- State Departments of Transportation
- Census Bureau
- GTFS feeds
- Local government open-data portals

Store metadata about datasets where practical:

```text
source
dataset
retrievedAt
version
license
attribution
```

Respect the license and attribution requirements of every dataset.

Do not scrape websites when an official API or downloadable dataset is available.

---

## Security

Never expose:

- API keys
- Database credentials
- Private tokens
- Service credentials
- Environment secrets

Use environment variables for secrets.

Client-exposed environment variables should only contain values intentionally made public.

Validate and sanitize user-controlled input.

Do not construct raw SQL queries from untrusted strings.

---

## Environment Variables

Use:

```text
.env.local
```

for local secrets.

Provide:

```text
.env.example
```

containing variable names but never actual credentials.

Example:

```env
DATABASE_URL=
MAP_STYLE_URL=
PUBLIC_DATA_API_URL=
```

Use `NEXT_PUBLIC_` only when the value genuinely needs to be exposed to the browser.

---

## Database

If a database is introduced, prefer a spatially capable database such as PostgreSQL + PostGIS.

Use spatial indexes for frequently queried geometries.

Examples include:

- GiST indexes
- Bounding-box queries
- Geometry indexes
- Appropriate attribute indexes

Do not retrieve unnecessary columns from large tables.

Prefer aggregation in the database when practical.

---

## Code Quality

Keep components focused.

Avoid components that simultaneously:

- Fetch data
- Transform geospatial data
- Manage application state
- Render complex UI
- Perform analytics

Separate responsibilities.

Prefer small reusable functions for:

- Spatial calculations
- Data transformations
- Formatting
- Validation
- API access

---

## Comments

Write comments explaining **why**, not what.

Good:

```ts
// Simplify road geometry at lower zoom levels to prevent
// unnecessary client-side rendering of dense geometries.
```

Avoid:

```ts
// Loop through roads
roads.map(...)
```

Do not add comments for obvious code.

---

## Dependencies

Before adding a dependency:

1. Determine whether the functionality already exists in the project.
2. Check whether Next.js, React, shadcn, mapcn, or an existing utility can solve the problem.
3. Prefer small, focused dependencies.
4. Avoid redundant libraries.
5. Consider bundle size and client-side impact.

Do not add dependencies merely for convenience.

---

## Git

Make focused commits.

Do not modify unrelated files.

Do not revert user changes unless explicitly requested.

Before modifying an existing implementation, understand the surrounding code.

Do not overwrite configuration files blindly.

---

## Claude Code Workflow

When working on a task:

1. Inspect the relevant project structure.
2. Read existing implementation before changing it.
3. Identify the smallest appropriate change.
4. Reuse existing components and utilities.
5. Implement the change.
6. Run relevant type checks/lint/tests.
7. Fix issues introduced by the change.
8. Review the final diff.

Do not rewrite functioning architecture simply because another approach is personally preferred.

---

## Verification

Before considering a feature complete, verify:

- TypeScript passes
- Lint passes
- Tests pass when available
- Production build succeeds when appropriate
- Map renders correctly
- Map interactions work
- Loading states work
- Empty states work
- Error states work
- Mobile layout works
- Dark mode works
- No secrets are exposed
- No unnecessary large client payloads are introduced

---

## Important Principle

The application is a **geospatial analytics product**, not simply a map.

Every major feature should answer:

> **What useful question does this geographic data allow the user to answer?**

Prefer features that transform raw geographic data into meaningful information, comparisons, trends, and decisions.

The map should help users understand the data rather than merely display it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
