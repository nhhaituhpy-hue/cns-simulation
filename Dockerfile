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

# Next.js inlines NEXT_PUBLIC_* at build time, so they must be
# available as build args. Do NOT pass secrets here.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

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

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Runtime env vars (SUPABASE_SECRET_KEY, etc.) are injected
# via Dokploy environment variables — not baked into the image.
CMD ["node", "server.js"]
