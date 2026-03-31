# Kubernetes

Run a workflow step as a Kubernetes Job.

The Kubernetes executor has two equivalent type aliases:

- `type: k8s`
- `type: kubernetes`

Dagu creates a single-container Kubernetes Job for the step, waits for the Job to finish, streams the Pod logs, and uses the terminated container exit code when available.

## Basic Usage

```yaml
steps:
  - id: hello
    type: k8s
    config:
      image: alpine:3.20
    command: echo "hello from kubernetes"
```

If you omit `command`, Dagu leaves the container command unset, so the image default command/entrypoint runs instead:

```yaml
steps:
  - id: run_image_default
    type: kubernetes
    config:
      image: ghcr.io/example/app:latest
```

## DAG-Level Defaults

Use the root `kubernetes:` block for defaults shared by explicit Kubernetes steps:

```yaml
kubernetes:
  kubeconfig: /etc/dagu/kubeconfig
  context: production
  namespace: batch
  service_account: dagu-runner
  resources:
    requests:
      cpu: "100m"
      memory: "128Mi"

steps:
  - id: report
    type: k8s
    config:
      image: alpine:3.20
    command: echo "generate report"

  - id: worker
    type: kubernetes
    config:
      image: ghcr.io/example/worker:1.2.3
      namespace: jobs
```

Important behavior:

- The root `kubernetes:` block applies only to steps with `type: k8s` or `type: kubernetes`.
- It does not change plain command steps into Kubernetes steps.
- Step `config` overrides DAG-level `kubernetes`.
- `image` is optional in DAG-level or `base.yaml` defaults, but it must be present in the effective step config after inheritance.

Merge behavior is Kubernetes-specific:

- Scalar values replace inherited values.
- Nested objects merge by key, with the step value winning.
- Arrays replace inherited arrays wholesale.
- Empty objects and empty arrays can clear inherited nested values.

The same `kubernetes:` block can also be set in `base.yaml`. Precedence is:

1. `base.yaml` `kubernetes`
2. DAG-level `kubernetes`
3. Step-level `config`

See [Base Configuration](/server-admin/base-config#kubernetes-configuration) for the `base.yaml` form.

## Cluster Resolution

Dagu resolves Kubernetes client configuration in this order:

1. Explicit `config.kubeconfig`
2. Default kubeconfig loading rules (`KUBECONFIG`, then the standard local kubeconfig locations)
3. In-cluster configuration

If you set `kubeconfig` or `context` explicitly and they are invalid, Dagu fails fast instead of silently falling back to in-cluster credentials.

## Command Behavior

The Kubernetes executor is intentionally narrow:

- Supports a single command only
- Does not support `script:`
- Does not support step-level `shell:`
- Does not support multi-command `command: [...]` lists where each item is a separate command

These are valid:

```yaml
steps:
  - id: string_command
    type: k8s
    config:
      image: alpine:3.20
    command: echo "hello"

  - id: argv_command
    type: k8s
    config:
      image: python:3.12-alpine
    command: [python3, -c, 'print("hello")']
```

These are not supported:

```yaml
steps:
  - id: bad_script
    type: k8s
    config:
      image: alpine:3.20
    script: |
      echo hello

  - id: bad_multi_command
    type: k8s
    config:
      image: alpine:3.20
    command:
      - echo one
      - echo two
```

## Logging and Cleanup

- Kubernetes exposes a merged container log stream, so stdout and stderr are streamed as a single log stream for this executor.
- `cleanup_policy` defaults to `delete`, which removes the Job after completion.
- `cleanup_policy: keep` keeps the Job after normal completion or job-reported failure.
- Cancellation, kill, and timeout paths still force cleanup even when `cleanup_policy` is `keep`.

## Configuration Reference

### Cluster and Runtime

| Field | Description | Default |
|-------|-------------|---------|
| `image` | Container image for the Job | Required in effective step config |
| `namespace` | Kubernetes namespace | `default` |
| `kubeconfig` | Explicit path to kubeconfig | - |
| `context` | Kubeconfig context name | current context |
| `working_dir` | Working directory inside the container | image default |
| `service_account` | Pod service account name | cluster default |
| `image_pull_policy` | Pull policy: `Always`, `IfNotPresent`, `Never` | unset |
| `image_pull_secrets` | Secret names for private registries | - |

`image_pull_policy` is case-insensitive. When omitted, Dagu leaves it unset.

### Environment

`env` sets explicit environment variables:

```yaml
config:
  env:
    - name: APP_ENV
      value: production
    - name: POD_NAME
      value_from:
        field_ref:
          field_path: metadata.name
```

Supported `value_from` sources:

- `secret_key_ref`
- `config_map_key_ref`
- `field_ref`

`env_from` imports whole ConfigMaps or Secrets:

```yaml
config:
  env_from:
    - config_map_ref:
        name: app-config
      prefix: APP_
    - secret_ref:
        name: app-secrets
```

### Resources, Scheduling, and Metadata

| Field | Description |
|-------|-------------|
| `resources.requests` | Resource requests map, typically `cpu` / `memory` |
| `resources.limits` | Resource limits map, typically `cpu` / `memory` |
| `node_selector` | Pod node selector labels |
| `tolerations` | Pod tolerations |
| `labels` | Labels applied to both the Job and Pod |
| `annotations` | Annotations applied to both the Job and Pod |

Resource quantities use Kubernetes quantity syntax such as `100m`, `128Mi`, or `1Gi`. Invalid quantities are rejected during config validation.

### Job Lifecycle

| Field | Description | Default |
|-------|-------------|---------|
| `active_deadline` | Kubernetes Job active deadline in seconds | - |
| `backoff_limit` | Kubernetes Job retry count | `0` |
| `ttl_after_finished` | Kubernetes TTL-after-finished in seconds | - |
| `cleanup_policy` | `delete` or `keep` | `delete` |

Notes:

- `active_deadline`, `backoff_limit`, and `ttl_after_finished` must be non-negative.
- `ttl_after_finished` matters only if the Job remains after completion, for example with `cleanup_policy: keep`.

### Volumes

Each volume entry must define exactly one source:

- `empty_dir`
- `host_path`
- `config_map`
- `secret`
- `persistent_volume_claim`

Example:

```yaml
config:
  volumes:
    - name: scratch
      empty_dir:
        medium: Memory
        size_limit: 256Mi
    - name: app-config
      config_map:
        name: my-config
    - name: data
      persistent_volume_claim:
        claim_name: shared-data
  volume_mounts:
    - name: scratch
      mount_path: /tmp/work
    - name: app-config
      mount_path: /etc/app
      read_only: true
    - name: data
      mount_path: /data
```

Supported source shapes:

- `empty_dir.medium`
- `empty_dir.size_limit`
- `host_path.path`
- `host_path.type`
- `config_map.name`
- `secret.secret_name`
- `persistent_volume_claim.claim_name`
- `persistent_volume_claim.read_only`

## Complete Example

```yaml
type: graph

kubernetes:
  context: production
  namespace: batch
  service_account: dagu-runner
  image_pull_secrets: [regcred]
  resources:
    requests:
      cpu: "100m"
      memory: "128Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
  labels:
    app: dagu
    team: platform

steps:
  - id: migrate
    type: k8s
    config:
      image: ghcr.io/example/migrator:2026-03-31
      cleanup_policy: keep
      ttl_after_finished: 3600
      env:
        - name: DATABASE_URL
          value_from:
            secret_key_ref:
              name: app-secrets
              key: database_url
    command: [app, migrate]

  - id: report
    type: kubernetes
    depends: [migrate]
    config:
      image: ghcr.io/example/report:2026-03-31
      annotations:
        batch.example.com/purpose: nightly-report
    command: [app, report, --date, "${DATE}"]
```

## See Also

- [YAML Specification](/writing-workflows/yaml-specification#kubernetes-configuration)
- [Base Configuration](/server-admin/base-config#kubernetes-configuration)
- [Distributed Execution](/server-admin/distributed/)
