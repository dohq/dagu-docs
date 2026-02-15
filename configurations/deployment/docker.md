# Docker

See [Docker Images](./docker-images.md) to choose between the standard, alpine, and dev tags.

## Quick Start

```bash
docker run -d \
  --name boltbase \
  -p 8525:8080 \
  -v boltbase-data:/var/lib/boltbase \
  ghcr.io/dagu-org/boltbase:latest
```

## With Custom DAGs Directory

```bash
docker run -d \
  --name boltbase \
  -p 8525:8080 \
  -v ./dags:/var/lib/boltbase/dags \
  -v boltbase-data:/var/lib/boltbase \
  -e BOLTBASE_HOST=0.0.0.0 \
  -e BOLTBASE_PORT=8080 \
  ghcr.io/dagu-org/boltbase:latest
```

## With Docker Executor Support

```bash
docker run -d \
  --name boltbase \
  -p 8525:8080 \
  -v boltbase-data:/var/lib/boltbase \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --user 0:0 \
  ghcr.io/dagu-org/boltbase:latest
```

## Environment Variables

```bash
docker run -d \
  --name boltbase \
  -p 8525:8080 \
  -v boltbase-data:/var/lib/boltbase \
  -e BOLTBASE_HOST=0.0.0.0 \
  -e BOLTBASE_PORT=8080 \
  -e BOLTBASE_TZ=America/New_York \
  -e BOLTBASE_AUTH_BASIC_USERNAME=admin \
  -e BOLTBASE_AUTH_BASIC_PASSWORD=password \
  ghcr.io/dagu-org/boltbase:latest
```

## Container Management

```bash
# View logs
docker logs -f boltbase

# Stop container
docker stop boltbase

# Start container
docker start boltbase

# Remove container
docker rm -f boltbase
```

## Access

Open http://localhost:8080 in your browser.
