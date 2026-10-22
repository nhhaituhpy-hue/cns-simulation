# ────────────────────────────────────────────────
# CNS Simulator — Multi-stage Dockerfile
# Target: Oracle VM ARM64 (Dokploy / Docker)
# ────────────────────────────────────────────────

# ── Base image ──────────────────────────────────
FROM node:24-slim AS base
WORKDIR /app

# ── Dependencies ────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── Builder ─────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Skip telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Production runner ───────────────────────────
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy standalone server + static assets + public files
COPY --from=builder /app/public                        ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder /app/scripts/verify-image-runtime.mjs ./scripts/verify-image-runtime.mjs

USER nextjs
# Fail the image build if standalone tracing omitted native image libraries.
RUN node scripts/verify-image-runtime.mjs /app

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Runtime secrets such as DATABASE_URL are injected through Dokploy and are
# never baked into the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]


# Dedicated durable AI worker. Dokploy web keeps the default runner above;
# the worker application selects this explicit target and has no public domain.
FROM deps AS ai-worker-build
COPY . .
RUN npm run ai:worker:build

FROM base AS ai-worker
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
RUN npm prune --omit=dev --ignore-scripts
COPY --from=ai-worker-build --chown=nextjs:nodejs /app/dist-ai-worker ./dist-ai-worker
USER nextjs
CMD ["node", "dist-ai-worker/entry.mjs"]

# Preserve the existing application's default final target.
FROM runner AS web
