# Shared Filesystem Mode

In shared filesystem mode, workers share storage access with the coordinator. This is the traditional deployment model where all nodes have access to the same filesystem.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Dagu Instance                           │
│  (Scheduler + Web UI + Coordinator)                         │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │ File-based Service Registry  │ gRPC Task Dispatch
         │                              │
         ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Shared Storage                           │
│  ┌───────────────┬─────────────────┬─────────────────────┐  │
│  │ service-      │   dag-runs/     │      logs/          │  │
│  │ registry/     │   (status)      │   (execution logs)  │  │
│  └───────────────┴─────────────────┴─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         ▲                              ▲
         │                              │
         │  Direct File Access          │
         │                              │
┌────────┴───────────┐        ┌────────┴───────────┐
│     Worker 1       │        │     Worker N       │
└────────────────────┘        └────────────────────┘
```

## How It Works

### Service Discovery

Workers automatically register themselves in a file-based service registry:

```
{data}/service-registry/
├── coordinator/
│   └── coordinator-primary-host1-50055.json
└── worker/
    ├── worker-gpu-01-host2-1234.json
    └── worker-cpu-02-host3-5678.json
```

Workers discover coordinators by scanning the registry directory. No manual coordinator address configuration is required.

### Status Persistence

Workers write execution status directly to the shared filesystem:

```
{data}/dag-runs/
└── my-workflow/
    └── dag-runs/
        └── 2024/03/15/
            └── dag-run_20240315_120000Z_abc123/
                └── attempt_20240315_120001_123Z_def456/
                    └── status.jsonl
```

### Log Storage

Workers write execution logs directly to the shared log directory:

```
{logs}/dags/
└── my-workflow/
    └── 20240315_120000_abc123/
        ├── step1.stdout.log
        ├── step1.stderr.log
        └── status.yaml
```

## Requirements

**Shared storage must be mounted at the same path on all nodes**, or configured via `DAGU_HOME` to point to the shared location.

Required shared directories:
- `{data}/service-registry/` - Worker registration and discovery
- `{data}/dag-runs/` - Execution status
- `{logs}/` - Execution logs (required for Web UI log display)

> [!NOTE]
> DAG definitions (`dags/`) do **not** need to be shared. Workers receive DAG definitions via gRPC when tasks are dispatched.

## Configuration

### Coordinator

```bash
# Start coordinator on the main server
dagu start-all --coordinator.host=0.0.0.0 --port=8080

# Or start coordinator separately
dagu coordinator --coordinator.host=0.0.0.0 --coordinator.port=50055
```

### Workers

```bash
# Workers auto-discover coordinators via service registry
dagu worker --worker.labels gpu=true,memory=64G
```

### Configuration File

```yaml
# config.yaml (same on all nodes)
paths:
  dataDir: "/shared/dagu/data"        # Must be shared
  logDir: "/shared/dagu/logs"         # Must be shared
  serviceRegistryDir: "/shared/dagu/service-registry"  # Must be shared

worker:
  id: "worker-gpu-01"
  labels:
    gpu: "true"
    memory: "64G"

coordinator:
  host: 0.0.0.0
  port: 50055
```

## Docker Compose Example

```yaml
version: '3.8'

services:
  dagu-main:
    image: dagu:latest
    command: start-all --host=0.0.0.0 --coordinator.host=0.0.0.0
    ports:
      - "8080:8080"
      - "50055:50055"
    volumes:
      - ./dags:/etc/dagu/dags           # DAG definitions (only main instance)
      - shared-data:/var/lib/dagu       # Shared: data + logs + service registry

  worker-gpu:
    image: dagu:latest
    command: worker --worker.labels=gpu=true,cuda=11.8
    volumes:
      - shared-data:/var/lib/dagu       # Shared storage (no dags needed)
    deploy:
      replicas: 2
      resources:
        reservations:
          devices:
            - capabilities: [gpu]

  worker-cpu:
    image: dagu:latest
    command: worker --worker.labels=cpu-only=true
    volumes:
      - shared-data:/var/lib/dagu       # Shared storage (no dags needed)
    deploy:
      replicas: 5

volumes:
  shared-data:
    driver: local
```

## Kubernetes with NFS

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dagu-shared
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dagu-main
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: dagu
          image: dagu:latest
          args: ["start-all", "--host=0.0.0.0", "--coordinator.host=0.0.0.0"]
          volumeMounts:
            - name: shared
              mountPath: /var/lib/dagu
            - name: dags
              mountPath: /etc/dagu/dags
      volumes:
        - name: shared
          persistentVolumeClaim:
            claimName: dagu-shared
        - name: dags
          configMap:
            name: dagu-dags
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dagu-worker
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: worker
          image: dagu:latest
          args: ["worker", "--worker.labels=region=us-east-1"]
          volumeMounts:
            - name: shared
              mountPath: /var/lib/dagu
      volumes:
        - name: shared
          persistentVolumeClaim:
            claimName: dagu-shared
```

## Advantages

- **Simple setup**: No additional configuration for status/log synchronization
- **Real-time visibility**: Web UI immediately sees status and logs
- **Service discovery**: Workers automatically find coordinators

## Limitations

- **Requires shared storage**: NFS, EFS, Azure Files, or similar
- **Network dependency**: Shared storage must be reliably accessible
- **Single failure domain**: Storage issues affect all nodes

## When to Use

Use shared filesystem mode when:

- Running Docker Compose locally or on a single host
- Kubernetes cluster with available `ReadWriteMany` storage
- Infrastructure already has NFS or equivalent shared filesystem
- Simplicity is preferred over storage independence
