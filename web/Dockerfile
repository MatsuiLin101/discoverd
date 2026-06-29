FROM node:22-bookworm-slim AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_GTM_ID

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL=$NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_GTM_ID=$NEXT_PUBLIC_GTM_ID

COPY . .

# The real DATABASE_URL / DIRECT_URL are deliberately NOT build args, so the
# connection string never lands in a build cache layer nor leaks into the migrator
# image (which is `FROM builder`). prisma.config.ts and the Prisma client validate
# these vars via env() at load time but never connect during the build, so we feed
# throwaway placeholders scoped to just these RUN steps (not image ENV). The real
# URLs arrive at runtime via env_file.
ARG BUILD_PLACEHOLDER_DB_URL=postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder
RUN DATABASE_URL="$BUILD_PLACEHOLDER_DB_URL" DIRECT_URL="$BUILD_PLACEHOLDER_DB_URL" npx prisma generate
RUN DATABASE_URL="$BUILD_PLACEHOLDER_DB_URL" DIRECT_URL="$BUILD_PLACEHOLDER_DB_URL" npm run build

# Reuse the builder so migrations AND `npm run db:seed` work: seed.ts imports the
# generated client from src/generated/prisma and needs tsx + the full source tree,
# none of which exist in a bare `deps` stage.
FROM builder AS migrator

CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
