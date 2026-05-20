# Docker Deployment

This deployment keeps Minecraft plugin data outside the image. The container sees the host plugin directory at `/app/plugins`, and the app reads it through `AF_PLUGINS_DIR=/app/plugins`.

## Build

```bash
docker compose build
```

## Run

Set `HOST_PLUGINS_DIR` to the real plugin directory on the Docker host:

```bash
HOST_PLUGINS_DIR=/srv/minecraft/plugins docker compose up -d
```

The compose file publishes the app only on localhost:

```text
127.0.0.1:3000 -> container:3000
```

Use the host VPN, firewall, SSH tunnel, or a localhost-facing reverse proxy to control who can reach the app. Do not change the port binding to `0.0.0.0` unless another layer restricts access.

To expose the app only on a Tailscale address, set `APP_BIND_ADDR` to the host's Tailscale IP:

```bash
HOST_PLUGINS_DIR=/srv/minecraft/plugins APP_BIND_ADDR=100.x.y.z docker compose up -d
```

## File Permissions

The container runs as UID/GID `1001` by default. If the host plugin directory is owned by a different user, pass matching IDs:

```bash
HOST_PLUGINS_DIR=/srv/minecraft/plugins APP_UID=1000 APP_GID=1000 docker compose up -d
```

The mounted directory must allow read access for ItemsAdder assets and read/write access for AnimalFarm item YAML files.

## Custom Port

```bash
HOST_PLUGINS_DIR=/srv/minecraft/plugins APP_PORT=3100 docker compose up -d
```

The app will then listen at `127.0.0.1:3100` on the host.

## Verify Configuration

```bash
HOST_PLUGINS_DIR=/srv/minecraft/plugins docker compose config
npm run typecheck
npm run lint
npm run build
```
