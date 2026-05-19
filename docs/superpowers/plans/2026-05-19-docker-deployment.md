# Docker Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production Docker deployment for the Next.js app with host-mounted plugin data and localhost-only network exposure.

**Architecture:** Enable Next.js standalone output, build a multi-stage Docker image, and run the app from the generated standalone server. Compose mounts an operator-provided host plugin directory at `/app/plugins` and publishes the app only to `127.0.0.1:3000`.

**Tech Stack:** Next.js 16, TypeScript, Node 20, Docker, Docker Compose.

---

### Task 1: Enable Standalone Output

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Add standalone output**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true
};

export default nextConfig;
```

- [ ] **Step 2: Verify Next config typechecks**

Run: `npm run typecheck`
Expected: command exits with status 0.

### Task 2: Add Docker Build Files

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Create multi-stage Dockerfile**

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV AF_PLUGINS_DIR=/app/plugins
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /app/plugins \
  && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/config ./config

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Create dockerignore**

```dockerignore
.git
.next
.turbo
.vercel
.cache
coverage
dist
build
out
node_modules
plugins
.test-tmp*
*.log
*.err.log
.env
.env.*
!.env.example
Dockerfile
docker-compose*.yml
```

### Task 3: Add Compose Runtime

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create compose file**

```yaml
services:
  af-item-admin:
    build:
      context: .
    image: af-item-admin:local
    restart: unless-stopped
    ports:
      - "127.0.0.1:${APP_PORT:-3000}:3000"
    environment:
      AF_PLUGINS_DIR: /app/plugins
      NODE_ENV: production
      NEXT_TELEMETRY_DISABLED: "1"
    volumes:
      - type: bind
        source: ${HOST_PLUGINS_DIR:?Set HOST_PLUGINS_DIR to the host plugins directory}
        target: /app/plugins
      - type: bind
        source: ./config
        target: /app/config
        read_only: true
    user: "${APP_UID:-1001}:${APP_GID:-1001}"
```

- [ ] **Step 2: Validate compose config**

Run: `HOST_PLUGINS_DIR=/tmp docker compose config`
Expected: command exits with status 0 and includes `127.0.0.1:3000:3000`.

### Task 4: Document Operation

**Files:**
- Create: `docs/docker.md`

- [ ] **Step 1: Add Docker deployment docs**

Document `HOST_PLUGINS_DIR`, `APP_UID`, `APP_GID`, localhost-only port publishing, build and run commands, and verification commands.

### Task 5: Verify

**Files:**
- No file changes.

- [ ] **Step 1: Run static checks**

Run: `npm run typecheck`
Expected: command exits with status 0.

Run: `npm run lint`
Expected: command exits with status 0.

Run: `npm run build`
Expected: command exits with status 0 and creates `.next/standalone/server.js`.

- [ ] **Step 2: Run Docker checks**

Run: `HOST_PLUGINS_DIR=/tmp docker compose config`
Expected: command exits with status 0.

Run: `docker compose build`
Expected: command exits with status 0.
