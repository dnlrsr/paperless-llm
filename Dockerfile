# syntax=docker/dockerfile:1

# ─── Stage: Download s6-overlay ───────────────────────────────────────────────
FROM alpine:3.21 AS s6-dl
ARG S6_VERSION=3.2.0.2
ARG TARGETARCH
RUN arch=$([ "$TARGETARCH" = "arm64" ] && echo "aarch64" || echo "x86_64") \
 && wget -qO /tmp/s6-noarch.tar.xz \
      "https://github.com/just-containers/s6-overlay/releases/download/v${S6_VERSION}/s6-overlay-noarch.tar.xz" \
 && wget -qO /tmp/s6-arch.tar.xz \
      "https://github.com/just-containers/s6-overlay/releases/download/v${S6_VERSION}/s6-overlay-${arch}.tar.xz" \
 && tar -C / -Jxpf /tmp/s6-noarch.tar.xz \
 && tar -C / -Jxpf /tmp/s6-arch.tar.xz

# ─── Stage: Build API ─────────────────────────────────────────────────────────
FROM node:22-alpine AS api-builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json          ./apps/api/
RUN pnpm install --frozen-lockfile
COPY packages/shared/ ./packages/shared/
COPY apps/api/         ./apps/api/
COPY default_prompts/  ./default_prompts/
RUN pnpm --filter @paperless-llm/shared build \
 && pnpm --filter @paperless-llm/api   build

# ─── Stage: Build Web ─────────────────────────────────────────────────────────
FROM node:22-alpine AS web-builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json         ./apps/web/
RUN pnpm install --frozen-lockfile
COPY packages/shared/ ./packages/shared/
COPY apps/web/         ./apps/web/
RUN pnpm --filter @paperless-llm/shared build \
 && pnpm --filter @paperless-llm/web   build

# ─── Stage: Runtime ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# nginx
RUN apk add --no-cache nginx

# s6-overlay
COPY --from=s6-dl /command      /command
COPY --from=s6-dl /package      /package
COPY --from=s6-dl /etc/s6-overlay /etc/s6-overlay
COPY --from=s6-dl /init         /init
RUN chmod +x /init

# Unprivileged user for the API
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# ─── Production Node.js deps ──────────────────────────────────────────────────
WORKDIR /app
COPY --from=api-builder /repo/package.json          ./
COPY --from=api-builder /repo/pnpm-workspace.yaml   ./
COPY --from=api-builder /repo/pnpm-lock.yaml        ./
COPY --from=api-builder /repo/packages/shared/package.json ./packages/shared/
COPY --from=api-builder /repo/apps/api/package.json        ./apps/api/
RUN corepack enable && corepack prepare pnpm@latest --activate \
 && pnpm install --frozen-lockfile --prod

# ─── API compiled output ──────────────────────────────────────────────────────
COPY --chown=appuser:appgroup --from=api-builder /repo/packages/shared/dist/       ./packages/shared/dist/
COPY --chown=appuser:appgroup --from=api-builder /repo/apps/api/dist/              ./apps/api/dist/
COPY --chown=appuser:appgroup --from=api-builder /repo/default_prompts/            ./default_prompts/
COPY --chown=appuser:appgroup --from=api-builder /repo/packages/shared/src/locales/ ./packages/shared/src/locales/
RUN mkdir -p /app/data /app/prompts && chown appuser:appgroup /app/data /app/prompts

# ─── Web static files ─────────────────────────────────────────────────────────
COPY --from=web-builder /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx-combined.conf /etc/nginx/http.d/default.conf

# ─── s6 services ──────────────────────────────────────────────────────────────
COPY s6-services/api   /etc/s6-overlay/s6-rc.d/api
COPY s6-services/nginx /etc/s6-overlay/s6-rc.d/nginx
RUN chmod +x /etc/s6-overlay/s6-rc.d/api/run \
             /etc/s6-overlay/s6-rc.d/nginx/run \
 && mkdir -p /etc/s6-overlay/s6-rc.d/user/contents.d \
 && touch /etc/s6-overlay/s6-rc.d/user/contents.d/api \
          /etc/s6-overlay/s6-rc.d/user/contents.d/nginx

# ─── cont-init: fix volume ownership before services start ────────────────────
COPY s6-services/cont-init.d/ /etc/cont-init.d/
RUN chmod +x /etc/cont-init.d/01-fix-perms

EXPOSE 80

ENTRYPOINT ["/init"]
