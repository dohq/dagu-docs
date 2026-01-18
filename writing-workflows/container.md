# Container Field

Run workflow steps in Docker containers for consistent, isolated execution environments.

The `container` field supports two modes:
- **Image mode**: Create a new container from an image
- **Exec mode**: Execute commands in an existing running container

## Basic Usage

### Image Mode (Create New Container)

```yaml
container:
  image: python:3.11

steps:
  - command: pip install pandas numpy  # Install dependencies
  - command: python process.py          # Process data
```

All steps run in the same container instance, sharing the filesystem and installed packages.

### Exec Mode (Use Existing Container)

Execute commands in a container that's already running (e.g., started by Docker Compose or another process):

```yaml
# Simple string form - exec with container's default settings
container: my-running-container

steps:
  - command: php artisan migrate
  - command: php artisan cache:clear
```

Or with overrides for user, working directory, and environment:

```yaml
# Object form with exec field
container:
  exec: my-running-container
  user: root
  workingDir: /app
  env:
    - DEBUG=true

steps:
  - command: chown -R app:app /data
```

Exec mode is ideal for:
- Running commands in application containers started by Docker Compose
- Interacting with long-running service containers
- Development workflows where containers are already running

## With Volume Mounts

```yaml
container:
  image: node:24
  volumes:
    - ./src:/app
    - ./data:/data
  workingDir: /app

steps:
  - command: npm install    # Install dependencies
  - command: npm run build  # Build the application
  - command: npm test       # Run tests
```

## With Environment Variables

```yaml
container:
  image: postgres:16
  env:
    - POSTGRES_PASSWORD=secret
    - POSTGRES_DB=myapp

steps:
  - command: pg_isready -U postgres
    retryPolicy:
      limit: 10
      
  - command: psql -U postgres myapp -f schema.sql
```

## Private Registry Authentication

```yaml
# For private images
registryAuths:
  ghcr.io:
    username: ${GITHUB_USER}
    password: ${GITHUB_TOKEN}

container:
  image: ghcr.io/myorg/private-app:latest

steps:
  - command: ./app
```

Or use `DOCKER_AUTH_CONFIG` environment variable (same format as `~/.docker/config.json`).

## Shell Wrapper

Wraps step commands with a shell interpreter to enable pipes, redirects, and command chaining.

```yaml
container:
  image: alpine:latest
  shell: ["/bin/sh", "-c"]

steps:
  - command: cat data.csv | cut -d',' -f2 | sort | uniq > unique.txt
  - command: npm install && npm test
  - command: npm run build || exit 1
```

**Format:** Array where the first element is the shell path, remaining elements are flags, and the step command is appended as the final argument. The command array is joined with spaces.

**Examples:**
```yaml
shell: ["/bin/sh", "-c"]
shell: ["/bin/bash", "-o", "errexit", "-o", "pipefail", "-c"]
```

**Exec mode:**
```yaml
container:
  exec: my-running-container
  shell: ["/bin/bash", "-c"]
```

**Notes:**
- Only affects step commands, not container startup commands
- Without `shell`, commands use Docker exec form without shell interpretation

## Configuration Options

The container field accepts either a string (exec mode) or an object (exec or image mode).

### String Form (Exec Mode)

```yaml
container: my-running-container  # Exec into existing container with defaults
```

### Object Form

```yaml
# Image mode - create new container
container:
  name: my-workflow-container # Custom container name (optional)
  image: ubuntu:22.04        # Required for image mode
  pullPolicy: missing        # always | missing | never
  volumes:                   # Volume mounts
    - /host:/container
  env:                       # Environment variables
    - KEY=value
  workingDir: /app           # Working directory
  user: "1000:1000"          # User/group
  platform: linux/amd64      # Platform
  ports:                     # Port mappings
    - "8080:8080"
  network: host              # Network mode
  startup: keepalive         # keepalive | entrypoint | command
  command: ["sh", "-c", "my-daemon"] # when startup: command
  waitFor: running           # running | healthy
  logPattern: "Ready"        # optional regex; wait for log pattern
  restartPolicy: unless-stopped  # optional Docker restart policy (no|always|unless-stopped)
  keepContainer: true        # Keep after workflow
  shell: ["/bin/bash", "-c"] # Shell wrapper for step commands
```

```yaml
# Exec mode - use existing container
container:
  exec: my-running-container  # Required for exec mode
  user: root                  # Optional: override user
  workingDir: /app            # Optional: override working directory
  env:                        # Optional: additional environment variables
    - DEBUG=true
  shell: ["/bin/sh", "-c"]    # Shell wrapper for step commands
```

### Field Availability by Mode

| Field | String Mode | Exec Mode | Image Mode |
|-------|-------------|-----------|------------|
| `exec` | N/A (implicit) | **Required** | Not allowed |
| `image` | Not allowed | Not allowed | **Required** |
| `user` | N/A | Optional | Optional |
| `workingDir` | N/A | Optional | Optional |
| `env` | N/A | Optional | Optional |
| `shell` | N/A | Optional | Optional |
| `name` | N/A | Not allowed | Optional |
| `pullPolicy` | N/A | Not allowed | Optional |
| `volumes` | N/A | Not allowed | Optional |
| `ports` | N/A | Not allowed | Optional |
| `network` | N/A | Not allowed | Optional |
| `platform` | N/A | Not allowed | Optional |
| `startup` | N/A | Not allowed | Optional |
| `command` | N/A | Not allowed | Optional |
| `waitFor` | N/A | Not allowed | Optional |
| `logPattern` | N/A | Not allowed | Optional |
| `restartPolicy` | N/A | Not allowed | Optional |
| `keepContainer` | N/A | Not allowed | Optional |

### Validation and Errors

**Common rules:**
- `exec` and `image` are mutually exclusive; specifying both causes an error.
- Either `exec` or `image` must be specified (or use string form for exec).

**Image mode:**
- `image` is required.
- `name` is optional; if specified, must be unique. If a container with the same name already exists (running or stopped), the workflow fails.
- `volumes` must use `source:target[:ro|rw]` format; relative paths are resolved from the DAG `workingDir`; invalid formats fail.
- `ports` accept `"80"`, `"8080:80"`, `"127.0.0.1:8080:80"`; container port may have `/tcp|udp|sctp` (default tcp); invalid formats fail.
- `network` accepts `bridge`, `host`, `none`, `container:<name|id>`, or a custom network name.
- `restartPolicy` supports `no`, `always`, or `unless-stopped`; other values fail.
- `startup` must be one of `keepalive` (default), `entrypoint`, `command`; invalid values fail.
- `waitFor` must be `running` (default) or `healthy`; if `healthy` is chosen but no healthcheck exists, Dagu falls back to `running` with a warning.
- `logPattern` must be a valid regex; readiness waits up to 120s (including `logPattern`), then errors with the last known state.

**Exec mode:**
- The container must exist and be running; Dagu waits up to 120 seconds for the container to be running.
- Fields like `volumes`, `ports`, `network`, `pullPolicy`, etc. cannot be used with `exec` (they're only valid when creating a new container).
- Only `user`, `workingDir`, `env`, and `shell` can override the container's defaults.

**Shell field:**
- Non-empty array: first element is shell path, last element is command flag (e.g., `-c`)
- Available in both image and exec modes

## Multiple Commands

Multiple commands share the same step configuration, including the container config:

```yaml
steps:
  - name: build-and-test
    container:
      image: node:24
      volumes:
        - ./src:/app
      workingDir: /app
    command:
      - npm install
      - npm run build
      - npm test
```

Instead of duplicating the `container`, `env`, `retryPolicy`, `preconditions`, etc. across multiple steps, combine commands into one step. All commands run in the same container instance, sharing the filesystem state (e.g., `node_modules` from `npm install`).

## Key Benefits

- **Shared Environment**: All steps share the same filesystem and installed dependencies
- **Performance**: No container startup overhead between steps
- **Consistency**: Guaranteed same environment for all steps
- **Simplicity**: No need to configure Docker executor for each step

## Execution Model and Entrypoint Behavior

- **How it runs:** When you set a DAG‑level `container`, Dagu starts one
  long‑lived container for the workflow. By default (`startup: keepalive`),
  it runs a lightweight keepalive process (or sleep) so the container stays
  up. Each step then runs inside that container via `docker exec`.
- **Entrypoint/CMD not used for steps:** Because steps are executed with
  `docker exec`, your image’s `ENTRYPOINT` or `CMD` are not invoked for step
  commands. Steps run directly in the running container process context.
- **Implication:** If your image’s entrypoint is a dispatcher that expects a
  subcommand (for example, `my-entrypoint sendConfirmationEmails` which then
  calls `npm run sendConfirmationEmails`), the step command must invoke that
  dispatcher explicitly.

### Startup Modes

Choose how the DAG‑level container starts:

```yaml
container:
  image: servercontainers/samba:latest
  startup: entrypoint   # keepalive | entrypoint | command
  waitFor: healthy      # running | healthy (default running)
```

```yaml
container:
  image: alpine:latest
  startup: command
  command: ["sh", "-c", "my-daemon --flag"]
  restartPolicy: unless-stopped   # optional
```

- `keepalive` (default): preserves current behavior using an embedded
  keepalive binary or `sh -c 'while true; sleep 86400; done'` in DinD.
- `entrypoint`: honors the image’s `ENTRYPOINT`/`CMD` with no overrides.
- `command`: runs a user‑provided `command` array instead of image defaults.

Readiness before steps run:

- `waitFor: running` (default): continue once the container is running.
- `waitFor: healthy`: if image defines a Docker healthcheck, wait for healthy;
  if not defined, Dagu falls back to `running` and logs a warning.
- `logPattern`: optional regex; when set, steps start only after this pattern
  appears in container logs (after the selected `waitFor` condition passes).

Readiness timeout and errors:

- Dagu waits up to 120 seconds for readiness (`running`/`healthy` and any
  `logPattern`). On timeout, it fails the run and reports the mode and last
  known state (for example, `status=exited, exitCode=1`).

### Examples

Image entrypoint expects a job name as its first argument:

```yaml
container:
  image: myorg/myimage:latest

steps:
  # This will NOT pass through the image ENTRYPOINT automatically.
  # Explicitly call the entrypoint script or the underlying command.
  - command: my-entrypoint sendConfirmationEmails
  # Or call the underlying command directly, if appropriate
  - command: npm run sendConfirmationEmails
```

If your step needs a shell to interpret operators (like `&&`, redirects,
or environment expansion), wrap it explicitly:

```yaml
steps:
  - command: sh -c "npm run prep && npm run sendConfirmationEmails"
```

### Step-Level Container

If you want each step to run in its own container (as with a fresh `docker run`
per step), use the step-level `container` field:

```yaml
steps:
  - name: send-confirmation-emails
    container:
      image: myorg/myimage:latest
    # The container is automatically created and removed after execution
    command: sendConfirmationEmails
```

You can also use different containers for different steps:

```yaml
steps:
  - name: build
    container:
      image: node:24
      volumes:
        - ./src:/app
      workingDir: /app
    command: npm run build

  - name: test
    container:
      image: node:24
      volumes:
        - ./src:/app
      workingDir: /app
    command: npm test

  - name: deploy
    container:
      image: python:3.11
      env:
        - AWS_DEFAULT_REGION=us-east-1
    command: python deploy.py
```

#### Step-Level Exec Mode

Steps can also exec into existing containers using the same syntax as DAG-level:

```yaml
steps:
  # String form - exec with defaults
  - name: run-migration
    container: my-app-container
    command: php artisan migrate

  # Object form with overrides
  - name: clear-cache
    container:
      exec: my-app-container
      user: www-data
      workingDir: /var/www
    command: php artisan cache:clear

  # Mix exec and image modes in the same workflow
  - name: run-tests
    container:
      image: node:24
    command: npm test
```

::: warning
When using step-level `container`, you cannot use `executor` or `script` fields on the same step.
:::

Note: When a DAG‑level `container:` is set, step-level `container` fields are ignored. The step runs inside the shared DAG container via `docker exec`. To use step-specific container settings, remove the DAG‑level `container`.

## See Also

- [Docker Executor](/features/executors/docker) - Step-level container execution
- [Registry Authentication](/features/executors/docker#registry-authentication) - Private registry setup
