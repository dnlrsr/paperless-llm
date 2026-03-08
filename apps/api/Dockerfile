# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /repo

# Copy manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all dependencies (including devDeps for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/
COPY default_prompts/ ./default_prompts/

# Build shared + api
RUN pnpm --filter @paperless-llm/shared build
RUN pnpm --filter @paperless-llm/api build


# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy production manifests
COPY --from=builder /repo/package.json ./
COPY --from=builder /repo/pnpm-workspace.yaml ./
COPY --from=builder /repo/pnpm-lock.yaml ./
COPY --from=builder /repo/packages/shared/package.json ./packages/shared/
COPY --from=builder /repo/apps/api/package.json ./apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output
COPY --from=builder /repo/packages/shared/dist/ ./packages/shared/dist/
COPY --from=builder /repo/apps/api/dist/ ./apps/api/dist/
COPY --from=builder /repo/default_prompts/ ./default_prompts/
COPY --from=builder /repo/packages/shared/src/locales/ ./packages/shared/src/locales/

# Create writable dirs
RUN mkdir -p /app/data /app/prompts && chown -R appuser:appgroup /app

USER appuser

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    DB_PATH=/app/data/db.sqlite \
    PROMPTS_DIR=/app/prompts \
    DEFAULT_PROMPTS_DIR=/app/default_prompts

EXPOSE 8080

CMD ["node", "apps/api/dist/main.js"]
