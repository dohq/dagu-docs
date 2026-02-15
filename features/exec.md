# Migrating from Cron

## Add Logging, Dashboard, and Notifications to Your Cron Jobs

If your cron jobs look like this:

```bash
0 2 * * * /usr/bin/python /home/user/backup.py >> /var/log/backup.log 2>&1
```

Run them through Boltbase instead and get:
- Persistent logs with automatic rotation
- Web dashboard showing all runs (status, duration, exit codes)
- Notifications on failure (email, webhooks)
- Run history and status tracking
- No need to change your scripts

**Boltbase** is a single binary workflow engine. No database, no dependencies. Runs on Linux/macOS/Windows. [Install →](/getting-started/installation)

## Basic Usage

Run a command:

```bash
boltbase exec -- echo "Hello World!"
```

Start the web UI and open `http://localhost:8080`:

```bash
boltbase start-all
```

You'll see the execution log, status, and timing in the dashboard.

For your actual scripts:

```bash
boltbase exec -- python /home/user/backup.py
```

## Why Use This?

### Migrate from Cron Without Rewriting

```bash
# Your existing crontab:
# 0 2 * * * /usr/bin/python /home/user/backup.py

# Run through Boltbase instead:
boltbase exec -- python /home/user/backup.py
```

You get:
- Persistent logs in `~/.local/share/boltbase/logs/`
- Run history visible in the Web UI
- Execution metadata (start time, duration, exit code)
- Notifications on success/failure (via `base.yaml` handlers)

### Track Ad-hoc Commands

```bash
boltbase exec --name db-migration-20250102 -- psql -f migrate.sql
```

Check status later:
```bash
boltbase status db-migration-20250102
```

View in UI at `http://localhost:8080`.

## Command Reference

### Syntax

```bash
boltbase exec [flags] -- <command> [args...]
```

The `--` separator is optional. Everything after flags is treated as the command.

### Flags

**Naming:**
- `--name, -N <name>` - DAG name (default: `exec-<command>`)
- `--run-id, -r <id>` - Custom run ID (default: auto-generated)

**Environment:**
- `--env KEY=VALUE` - Set environment variable (repeatable)
- `--dotenv <path>` - Load dotenv file relative to working directory (repeatable)
- `--workdir <path>` - Working directory (default: current directory)
- `--shell <path>` - Shell binary for command execution
- `--base <file>` - Custom base config file (default: `~/.config/boltbase/base.yaml`)

**Execution Control:**
- `--worker-label key=value` - Set worker selector labels (repeatable)

## Examples

### Environment Variables

```bash
boltbase exec \
  --env DATABASE_URL=postgres://localhost/mydb \
  --env LOG_LEVEL=debug \
  -- python etl.py
```

### Dotenv Files

```bash
boltbase exec \
  --dotenv .env.production \
  --workdir /opt/app \
  -- node index.js
```

Loads environment from `/opt/app/.env.production` before execution.

### With Worker Labels

```bash
boltbase exec \
  --worker-label gpu=true \
  --worker-label memory=32G \
  -- python train_model.py
```

This sets worker selector labels on the generated DAG. To run this on a distributed worker, use `boltbase enqueue` instead of `boltbase exec`.

## Behavior Details

### Generated DAG Name

Without `--name`, the DAG name is derived from the command:

```bash
boltbase exec -- python script.py
# DAG name: exec-python

boltbase exec -- /usr/local/bin/backup
# DAG name: exec-backup
```

Names are truncated to 40 characters and sanitized to alphanumeric + hyphens.

### Run History

Every execution creates a persistent record in `~/.local/share/boltbase/data/dag-runs/<dag-name>/`:

```
exec-python/
├── dag-run_20250102_143022_01JGHQR8K4/
│   ├── status.json       # Execution metadata
│   ├── boltbase.log          # Step output
│   └── spec.yaml         # Generated YAML snapshot
```

The Web UI displays these runs under the DAG name. The generated YAML is stored so you can see exactly what was executed.

The command runs locally and the CLI waits for completion and shows progress.

For distributed execution, use `boltbase enqueue` instead:
```bash
boltbase enqueue my-workflow.yaml
```

## Generated YAML Format

For `boltbase exec -- python script.py --arg=value`:

```yaml
name: exec-python
type: chain
working_dir: /current/directory
steps:
  - name: main
    command: ["python", "script.py", "--arg=value"]
```

With flags:

```bash
boltbase exec \
  --env FOO=bar \
  -- python script.py
```

Generates:

```yaml
name: exec-python
type: chain
working_dir: /current/directory
env:
  - FOO=bar
steps:
  - name: main
    command: ["python", "script.py"]
```

This YAML is stored in the run history but **not** written to the DAGs directory. It exists only as run metadata.

## Using Secrets (Avoiding Log Leakage)

Environment variables passed via `--env` are stored in run history and visible in logs. For sensitive data, use the `secrets` block in `base.yaml`:

```yaml
# ~/.config/boltbase/base.yaml
secrets:
  - name: API_TOKEN
    provider: env
    key: PROD_API_TOKEN
  - name: DB_PASSWORD
    provider: file
    key: /run/secrets/db-password
```

Every `boltbase exec` command inherits these secrets and they are **automatically scrubbed from logs**:

```bash
# API_TOKEN is available to the script but masked in logs
boltbase exec -- python deploy.py
```

You can use different base configs for different environments:

```bash
# Production environment with prod secrets
boltbase exec --base ~/configs/prod-base.yaml -- ./deploy.sh

# Staging environment with staging secrets
boltbase exec --base ~/configs/staging-base.yaml -- ./deploy.sh
```

Secrets are resolved at runtime and never persisted to disk or run history. See [Secrets](/writing-workflows/secrets) for provider details.

## Lifecycle Hooks via Base Configuration

While `boltbase exec` doesn't support lifecycle hook flags, you can define handlers in `base.yaml` that apply to all exec commands:

```yaml
# ~/.config/boltbase/base.yaml
handler_on:
  failure:
    command: 'curl -X POST https://alerts.example.com/webhook -d "dag ${DAG_NAME} failed"'
  success:
    command: 'echo "Success: ${DAG_NAME}" >> /var/log/boltbase-exec.log'
  exit:
    command: 'rm -f /tmp/${DAG_RUN_ID}.lock'
```

Every `boltbase exec` command inherits these handlers automatically:

```bash
boltbase exec -- python risky_script.py
# If this fails, the failure handler runs
# The exit handler always runs regardless of success/failure
```

Handlers receive the standard environment provided by Boltbase, including variables such as `${DAG_NAME}`, `${DAG_RUN_ID}`, and `${DAG_RUN_LOG_FILE}`.

See [Lifecycle Handlers](/writing-workflows/lifecycle-handlers) for complete documentation.

## Technical Details

`boltbase exec` generates an in-memory DAG from the command and flags, then executes it through the same runtime as `boltbase start`. This means:

- Logs are stored in the same location as file-based DAGs
- Run history appears in the Web UI
- Base configuration (`~/.config/boltbase/base.yaml`) is automatically applied
- All lifecycle handlers, secrets, and environment variables are inherited
