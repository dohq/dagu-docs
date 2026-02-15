# Docker Images

Boltbase publishes multiple container images to GitHub Container Registry at `ghcr.io/dagu-org/boltbase`. All images are multi-arch (`linux/amd64`, `linux/arm64`, `linux/arm/v7`) and ship with the same defaults: listen on `8080`, run `boltbase start-all`, and honor `PUID`/`PGID`/`BOLTBASE_*` environment variables.

## Image overview

| Tag(s) | Base | Package Manager | What's inside | Use when |
| --- | --- | --- | --- | --- |
| `latest`, `<version>` | Ubuntu 24.04 | `apt` | Core runtime + `sudo`, `tzdata`, `jq` | General deployments; closest to production defaults |
| `alpine`, `<version>-alpine` | Alpine 3.22 | `apk` | Musl-based image with `bash`, `sudo`, `jq`, `tzdata` | Minimal footprint, Alpine-only environments |
| `dev`, `<version>-dev` | Ubuntu 24.04 | `apt` | Adds build tools (`git`, `curl/wget`, `zip/unzip`, `build-essential`, `python3/pip`, `openjdk-17`, `nodejs/npm`, `jq`, `tzdata`) | Local development or workflows that need compilers/SDKs baked in |

> Prefer pinning to a specific version tag (`ghcr.io/dagu-org/boltbase:<version>`) for reproducible deployments.

## Examples

Standard image:
```bash
docker run -d -p 8525:8080 -v boltbase-data:/var/lib/boltbase ghcr.io/dagu-org/boltbase:latest
```

Alpine image:
```bash
docker run -d -p 8525:8080 -v boltbase-data:/var/lib/boltbase ghcr.io/dagu-org/boltbase:alpine
```

Dev image with extra tooling:
```bash
docker run -d -p 8525:8080 -v boltbase-data:/var/lib/boltbase ghcr.io/dagu-org/boltbase:dev
```

For Docker-in-Docker workflows, mount the host socket and run as root:
```bash
docker run -d -p 8525:8080 -v boltbase-data:/var/lib/boltbase -v /var/run/docker.sock:/var/run/docker.sock --user 0:0 ghcr.io/dagu-org/boltbase:latest
```

## Custom Images

If your workflows require additional tools (Python, Perl, Ruby, etc.) not included in the standard images, build a custom image based on Boltbase:

```dockerfile
FROM ghcr.io/dagu-org/boltbase:latest

# Install additional packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    perl \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages if needed
RUN pip3 install --break-system-packages requests pandas
```

Build and run:
```bash
docker build -t my-boltbase .
docker run -d -p 8080:8080 -v boltbase-data:/var/lib/boltbase my-boltbase
```
