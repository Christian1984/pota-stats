# POTA Stats

Self-hosted dashboard for [Parks on the Air](https://parksontheair.com/) spot analytics. Polls the POTA API every 5 minutes and visualises historical patterns by hour, weekday, band, and region.

## Stack

| Layer    | Tech                                                |
| -------- | --------------------------------------------------- |
| Frontend | Next.js 15, tRPC, Recharts, react-leaflet, Tailwind |
| Backend  | Next.js API routes (tRPC), Node.js poller           |
| Database | PostgreSQL 16                                       |
| Monorepo | pnpm workspaces                                     |

## Project structure

```
apps/
  web/      Next.js app — dashboard UI + tRPC API routes
  poller/   Cron job — fetches api.pota.app/v1/spots every 5 min
packages/
  db/       Drizzle schema + shared DB client
```

---

## Local development

**Prerequisites:** Docker, Docker Compose, Node.js 22+, pnpm

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp .env.example .env          # already has dev credentials pre-filled

# 3. Start the database
docker compose -f docker-compose.local.yml up -d

# 4. Start the apps (in separate terminals, or use a tab-capable terminal)
pnpm --filter @pota-stats/poller dev
pnpm --filter @pota-stats/web dev
```

Open [http://localhost:3000](http://localhost:3000). Charts populate after the first poll (within a few seconds of starting the poller).

---

## Deploying to your home server

GitHub Actions builds both Docker images on every push to `main` and pushes them to `ghcr.io`.

### One-time setup

1. Grant the Actions workflow package write access:  
   **GitHub repo → Settings → Actions → General → Workflow permissions → Read and write**

2. Log in to ghcr.io on the server:

   ```bash
   echo <your-github-pat> | docker login ghcr.io -u <your-github-username> --password-stdin
   ```

3. Copy the prod compose file to the server and create a `.env`:

   ```bash
   scp docker-compose.prod.yml user@homeserver:~/pota-stats/docker-compose.prod.yml
   ```

   Then on the server, create `~/pota-stats/.env`:

   ```env
   POSTGRES_PASSWORD=a_strong_password
   GITHUB_REPOSITORY_OWNER=your-github-username
   CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token
   ```

4. In the Cloudflare Zero Trust dashboard, configure the tunnel to route your hostname to `http://web:3000`.

### Deploy after a push

```bash
cd ~/pota-stats
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## Environment variables

| Variable                  | Where        | Description                                |
| ------------------------- | ------------ | ------------------------------------------ |
| `DATABASE_URL`            | local `.env` | Connection string for local dev            |
| `POSTGRES_PASSWORD`       | prod `.env`  | DB password (prod only)                    |
| `GITHUB_REPOSITORY_OWNER` | prod `.env`  | Your GitHub username, for image names      |
| `CLOUDFLARE_TUNNEL_TOKEN` | prod `.env`  | Token from Cloudflare Zero Trust dashboard |
