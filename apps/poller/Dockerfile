FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/package.json
COPY apps/poller/package.json ./apps/poller/package.json
RUN pnpm install --frozen-lockfile

FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/poller/node_modules ./apps/poller/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/package.json
COPY apps/poller/package.json ./apps/poller/package.json
COPY tsconfig.base.json ./
COPY packages/db/src ./packages/db/src
COPY packages/db/tsconfig.json ./packages/db/tsconfig.json
COPY apps/poller/src ./apps/poller/src
COPY apps/poller/tsconfig.json ./apps/poller/tsconfig.json
CMD ["pnpm", "--filter", "@pota-stats/poller", "start"]
