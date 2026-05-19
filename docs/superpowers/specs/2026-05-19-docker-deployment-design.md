# Docker Deployment Design

## Goal

Package the Next.js admin app as a production Docker deployment while keeping Minecraft plugin data outside the image and restricting app exposure to localhost for VPN or reverse-proxy access control.

## Architecture

The app builds with Next.js standalone output so the runtime image contains only the server bundle, static assets, public assets, and production dependencies needed by Next. Runtime plugin data is mounted from a host path into `/app/plugins`, and the app reads it through `AF_PLUGINS_DIR=/app/plugins`.

The container publishes port `3000` only on `127.0.0.1`, so it is not directly reachable from external interfaces. VPN, firewall rules, or a local reverse proxy are responsible for deciding who can reach the host-local service.

## Components

- `next.config.ts`: enables `output: "standalone"` for minimal production runtime packaging.
- `Dockerfile`: builds dependencies, runs `npm run build`, and creates a runtime image that runs `server.js`.
- `.dockerignore`: keeps local dependencies, build output, logs, git metadata, and local plugin data out of the build context.
- `docker-compose.yml`: binds `127.0.0.1:3000:3000`, mounts `${HOST_PLUGINS_DIR}` to `/app/plugins`, and sets production environment variables.
- `docs/docker.md`: documents build, run, host path permissions, and VPN-facing deployment expectations.

## Data Flow

1. The host provides the real plugin directory through `HOST_PLUGINS_DIR`.
2. Docker Compose mounts that directory at `/app/plugins`.
3. The app resolves AnimalFarm and ItemsAdder files through `AF_PLUGINS_DIR=/app/plugins`.
4. Browser traffic reaches the app only through localhost-bound port `3000` unless the host VPN or proxy exposes it.

## Error Handling

Compose variable interpolation requires `HOST_PLUGINS_DIR`; startup fails early if it is missing. If the mounted directory permissions do not allow the container user to read or write item files, the app will return filesystem errors from existing API handlers. The run documentation explains setting `APP_UID` and `APP_GID` to match the host plugin owner.

## Testing

Run the existing project checks and a Docker image build:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `docker compose build`
