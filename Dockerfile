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

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Runtime secrets such as DATABASE_URL are injected through Dokploy and are
# never baked into the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
