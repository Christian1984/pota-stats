# Architecture

## Monorepo

pnpm workspaces + Turborepo. Three packages:

- `apps/web` — Next.js 15 dashboard (frontend + API)
- `apps/poller` — Node.js cron service
- `packages/db` — shared Drizzle schema and client

## Data flow

```
POTA API (api.pota.app/v1/spots)
  → poller: upsert by spot_id (ON CONFLICT DO UPDATE last_seen_at = NOW())
  → PostgreSQL (single `spots` table)
  → tRPC procedures (raw SQL via Drizzle)
  → Next.js page (React Query cache)
  → Recharts / Leaflet
```

## Backend

- **Database**: PostgreSQL via `postgres.js` driver
- **ORM**: Drizzle ORM — schema in `packages/db/src/schema.ts`, migrations via `drizzle-kit`
- **API layer**: tRPC v11 mounted at `/api/[trpc]`, procedures in `apps/web/src/server/routers/spots.ts`
- **Serialization**: superjson transformer on the tRPC client (handles Date objects)
- **Poller**: plain Node.js + `setInterval`, polls every `POLL_INTERVAL_MINUTES` (default 10). Runs DB migrations on startup via Drizzle.

Key SQL patterns:

- Band is derived at query time from `frequency` via a CASE expression (not stored)
- Hour/weekday queries use `timezone()` in SQL, with the browser timezone passed from the client
- Spot deduplication groups by `(activator, reference)` to count unique activations
- Cross-chart filtering uses `BOOL_OR(<filter_expr>)` over grouped rows to compute a `filteredCount` alongside the total `count`

## Frontend

- **Framework**: Next.js 15 App Router, single page (`app/page.tsx`), all client-side state
- **Styling**: Tailwind CSS v3
- **Data fetching**: tRPC + TanStack Query v5 (`useQuery` hooks)

### Charts

- **Library**: Recharts v2
- **Component**: `BarChartCard` (`src/components/BarChartCard.tsx`)
- Three rendering modes driven by `isOwner` / `filterActive` props:
  - **plain** — single cyan bar per category
  - **owner** — single bar with per-Cell coloring (active = cyan, others = grey); this chart owns the active filter
  - **stacked** — two stacked bars: cyan `filteredCount` (bottom) + grey `remainingCount` (top); shown on all non-owner charts when a filter is active

### Map

- **Library**: Leaflet v1 (imperative, managed via `useRef` + `useEffect`)
- **Tiles**: OpenStreetMap
- **Clustering**: `leaflet.markercluster` — groups nearby park markers into clusters that expand on zoom
- **Component**: `SpotMap` (`src/components/SpotMap.tsx`), loaded via `next/dynamic` with `ssr: false`
- Map responds to the active date range and drill-down filter (same `from`/`to`/`filter` inputs as chart queries)

## Deployment

- Docker images built by GitHub Actions on push to `main`, pushed to `ghcr.io`
- Production: `docker-compose.prod.yml` — web + poller + postgres + Cloudflare Tunnel
- No separate migration step: poller runs `db:migrate` on startup
