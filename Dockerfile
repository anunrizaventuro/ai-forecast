# syntax=docker/dockerfile:1

# ============================================================================
# Build & run:  docker compose up -d --build
# (manual:      docker build -t venturo-web . && docker run --env-file .env.prod -p 80:80 venturo-web)
#
# Env dibaca dari .env.prod DUA kali:
#   1. Saat BUILD — di-copy jadi .env.production supaya NEXT_PUBLIC_* ter-inline
#      ke bundle JS. Nilai ini dibekukan di image: ganti .env.prod ⇒ rebuild.
#   2. Saat RUN   — env_file di docker-compose.yml untuk var server-only
#      (API_URL, REVALIDATE_TOKEN) yang dibaca dari process.env saat runtime.
# ============================================================================

FROM node:22-alpine AS deps
WORKDIR /app
# HUSKY=0: skip git hooks di script `prepare` — tidak ada .git di dalam image
ENV HUSKY=0
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    BUILD_STANDALONE=true \
    HUSKY=0
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* wajib tersedia SAAT build (bukan runtime) — lihat catatan atas.
# Validasi zod di src/lib/env.ts menggagalkan build bila ada var wajib kosong.
RUN cp .env.prod .env.production && yarn build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=80 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
# Output standalone berisi server.js + hasil trace dependency minimum;
# .next/static dan public TIDAK ikut otomatis — harus di-copy manual.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 80
# Non-root bind port 80 aman di Docker >= 20.10 (ip_unprivileged_port_start=0).
# Di runtime lain (mis. k8s tanpa sysctl itu), override PORT ke >= 1024.
CMD ["node", "server.js"]
