# ─────────────────────────────────────────────────────────────
#   Stage 1 — Builder & Prisma Generator
#   Installs all dependencies (including dev tools) and generates
#   the Prisma Client in an isolated build layer.
# ─────────────────────────────────────────────────────────────
FROM oven/bun:1-slim AS builder

WORKDIR /app

# Install system certificates and OpenSSL required by Prisma & TLS connections
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests first for optimal Docker layer caching
COPY package.json bun.lock ./

# Copy Prisma schema and configuration before install
COPY prisma ./prisma
COPY prisma7.config.ts ./

# Install all dependencies (including devDependencies like prisma CLI)
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# Copy application source code and TypeScript config
COPY tsconfig.json ./
COPY src ./src

# Generate type-safe Prisma Client (outputs to src/generated/prisma)
RUN bun run prisma:generate

# ─────────────────────────────────────────────────────────────
#   Stage 2 — Production Dependencies (Pruner)
#   Installs only production dependencies to minimize image size.
# ─────────────────────────────────────────────────────────────
FROM oven/bun:1-slim AS pruner

WORKDIR /app

COPY package.json bun.lock ./

# Install strictly production dependencies (cached from builder stage)
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

# ─────────────────────────────────────────────────────────────
#   Stage 3 — Runtime
#   Ultra-lightweight production image containing only production
#   modules, generated code, and source files.
# ─────────────────────────────────────────────────────────────
FROM oven/bun:1-slim AS runtime

WORKDIR /app

# Install runtime utilities:
# - curl: for container healthchecks
# - ca-certificates & openssl: for secure SSL/TLS connections to Neon PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Production environment variables
ARG APP_VERSION=1.0.0
ENV NODE_ENV=production \
    PORT=5000 \
    APP_VERSION=${APP_VERSION}

# Copy runtime files directly with non-root ownership (avoids duplicate layer bloat from chown -R)
COPY --chown=bun:bun --from=pruner /app/node_modules ./node_modules
COPY --chown=bun:bun --from=builder /app/prisma ./prisma
COPY --chown=bun:bun --from=builder /app/prisma7.config.ts ./prisma7.config.ts
COPY --chown=bun:bun --from=builder /app/src/generated ./src/generated
COPY --chown=bun:bun --from=builder /app/src ./src
COPY --chown=bun:bun --from=builder /app/package.json ./package.json
COPY --chown=bun:bun --from=builder /app/tsconfig.json ./tsconfig.json
COPY --chown=bun:bun public ./public

# Expose default port (Render will override $PORT dynamically at runtime)
EXPOSE 5000

# Health check to ensure the container is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

# Run container as non-root user
USER bun

# Launch server
CMD ["bun", "run", "start"]
