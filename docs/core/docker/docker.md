# Hex Core — Docker Engine Architecture

> This document defines how Hex Core manages and interacts with Docker on the host system.

---

## 1. Overview

Hex Core communicates directly with the Docker Engine using the official Docker Go SDK (`github.com/docker/docker/client`).
- **Transport:** Local Unix socket `/var/run/docker.sock`
- **Security:** Core runs as a privileged host system service. Docker is **never** exposed directly to clients or over the network.
- **Client Access:** Browsers and mobile clients never touch Docker. All requests flow through `node` BFF $\rightarrow$ `core` $\rightarrow$ Docker Engine.

---

## 2. Container Management

### Container Lifecycle
- **Listing:** `GET /docker/containers` (queries Docker daemon directly via `ContainerList`)
- **Lifecycle Actions:** `POST /docker/action`
  - `start`: Starts an existing container by ID
  - `stop`: Gracefully stops container with timeout
  - `restart`: Restarts container
  - `kill`: Immediately terminates container
  - `remove`: Deletes container and optionally associated anonymous volumes
- **Creation:** `POST /docker/create`
  - Defines image name, environment variables, port bindings, volume mounts, and restart policy.
  - Pulls image automatically if not cached locally.

### Container Adoption
Hex supports adopting pre-existing containers on the VPS:
- Any container created outside Hex is automatically detected and listed.
- Hex tracks container metadata in its internal database (`hex.db`) without altering container state.

---

## 3. Compose & Deployments

- **Compose Support:** `GET /docker/compose` and `POST /docker/compose`
- Core invokes the Docker Compose plugin or engine API to deploy multi-container stacks.
- Environment variables and secrets are injected into Compose files securely at runtime.

---

## 4. Resource & Stats Monitoring

- Core uses the Docker Engine API `ContainerStats` endpoint to stream live per-container CPU, Memory, and Network I/O.
- Disk usage is calculated using `cli.DiskUsage(ctx, types.DiskUsageOptions{})` avoiding slow shell commands.

---

## 5. Security Safeguards

1. Docker socket is never mounted into user containers without explicit configuration.
2. Input sanitization is enforced on container names and actions to prevent command injection.
3. Node enforces RBAC permissions (`docker.manage`, `docker.view`) before forwarding any Docker command to Core.
