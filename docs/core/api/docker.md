# Advanced Docker Engine API

The Hex Core exposes an extensive REST API for Docker daemon management.

## Containers

- `GET /docker/containers` - List all containers.
- `POST /docker/create` - Create and start a container.
- `POST /docker/action?id=<id>&action=<action>` - Lifecycle actions (start, stop, restart, kill, delete).

## Images

- `GET /docker/images` - List all images.
- `DELETE /docker/images?id=<id>` - Force delete an image.

## Networks

- `GET /docker/networks` - List all Docker networks.
- `DELETE /docker/networks?id=<id>` - Delete a network.

## Volumes

- `GET /docker/volumes` - List all volumes.
- `DELETE /docker/volumes?id=<id>` - Delete a volume.

## Docker Compose

- `POST /docker/compose?dir=<path>` - Runs `docker compose up -d` in the specified directory.
- `DELETE /docker/compose?dir=<path>` - Runs `docker compose down`.
- `GET /docker/compose?dir=<path>` - Retrieves the latest logs for the stack.
