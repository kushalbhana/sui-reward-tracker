# ============================================================
# Base stage — shared across all apps
# ============================================================
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ============================================================
# Install dependencies (full monorepo)
# ============================================================
FROM base AS deps
COPY package.json package-lock.json turbo.json .npmrc ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/docs/package.json ./apps/docs/package.json
COPY apps/indexer/package.json ./apps/indexer/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/rpc/package.json ./packages/rpc/package.json
COPY packages/schema/package.json ./packages/schema/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
RUN npm ci

# ============================================================
# Builder — copies full source and builds everything
# ============================================================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules 2>/dev/null || true
COPY --from=deps /app/apps/docs/node_modules ./apps/docs/node_modules 2>/dev/null || true
COPY --from=deps /app/apps/indexer/node_modules ./apps/indexer/node_modules 2>/dev/null || true
COPY --from=deps /app/packages ./packages
COPY . .

# Build all apps via turbo
RUN npx turbo run build

# ============================================================
# Web — Next.js standalone production server
# ============================================================
FROM base AS web

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Next.js standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]

# ============================================================
# Docs — Next.js standalone production server
# ============================================================
FROM base AS docs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/docs/.next/standalone ./
COPY --from=builder /app/apps/docs/.next/static ./apps/docs/.next/static
COPY --from=builder /app/apps/docs/public ./apps/docs/public

USER nextjs
EXPOSE 3001

CMD ["node", "apps/docs/server.js"]

# ============================================================
# Indexer — Node.js long-running service
# ============================================================
FROM base AS indexer

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 indexer

# Copy the compiled indexer output and its dependencies
COPY --from=builder /app/apps/indexer/dist ./apps/indexer/dist
COPY --from=builder /app/apps/indexer/package.json ./apps/indexer/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json

USER indexer
WORKDIR /app/apps/indexer

CMD ["node", "dist/index.js"]
