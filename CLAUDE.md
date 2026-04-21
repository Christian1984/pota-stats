# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (run from repo root)
pnpm install
pnpm dev                    # Start all apps via Turbo

# Run apps individually
pnpm --filter @pota-stats/web dev
pnpm --filter @pota-stats/poller dev

# Build & lint
pnpm build
pnpm lint

# Database
pnpm db:generate            # Generate Drizzle migration files
pnpm db:migrate             # Apply migrations

# Local infra (PostgreSQL)
docker compose -f docker-compose.local.yml up -d
```

There are no automated tests in this project.

## Architecture

Pnpm monorepo with Turbo. Three packages:

- **`apps/web`** — Next.js 15 full-stack dashboard. tRPC router at `src/server/routers/spots.ts` handles all data queries. API handler mounted at `src/app/api/[trpc]/route.ts`. Charts rendered with Recharts; map with react-leaflet.
- **`apps/poller`** — Node.js cron service (`src/index.ts`). Polls `https://api.pota.app/v1/spots` on a configurable interval, upserts into PostgreSQL. Also runs DB migrations on startup.
- **`packages/db`** — Shared Drizzle ORM schema and client. Single `spots` table with 4 indices. All apps import from here.

### Data flow

`POTA API → poller (upsert by spotId) → PostgreSQL → tRPC queries → Next.js UI`

### Key patterns

- **Band assignment** happens at query time via SQL `CASE` on raw frequency (not stored).
- **Timezone-aware** hour/weekday queries use `timezone()` in SQL with the browser's timezone passed from the client.
- **Spot deduplication** in analytics groups by `(activator, reference)` to count unique activations.
- tRPC uses superjson transformer for Date serialization.

## Environment Variables

| Variable                  | Where used     | Notes                        |
| ------------------------- | -------------- | ---------------------------- |
| `DATABASE_URL`            | web, poller    | PostgreSQL connection string |
| `POLL_INTERVAL_MINUTES`   | poller         | Default: 10                  |
| `POSTGRES_PASSWORD`       | docker compose | Prod only                    |
| `CLOUDFLARE_TUNNEL_TOKEN` | docker compose | Prod only                    |
| `GITHUB_REPOSITORY_OWNER` | docker compose | For ghcr.io image tags       |

Copy `.env.example` to `.env` — it's pre-filled for local dev.

## Git

- Commit messages must be single-line only — no body, no bullet points.
- Never include "Co-authored-by" or any Anthropic/Claude attribution in commits.
- Never run `git push` — always leave pushing to the user.

## Deployment

CI/CD builds both Docker images and pushes to `ghcr.io` on push to `main` (`.github/workflows/build.yml`).

Production uses `docker-compose.prod.yml` with a Cloudflare Tunnel for external access. The poller service handles DB migrations on startup, so no separate migration step is needed.
