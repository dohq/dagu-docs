# Command Line Interface

## Overview

The Boltbase CLI provides all the necessary commands to manage and execute DAGs (workflows) directly from the terminal. It allows you to start, stop, retry, and monitor workflows, as well as manage the underlying scheduler and web server.

::: tip Complete Reference
For the full CLI command reference, see [CLI Commands Reference](/reference/cli).
:::

## Basic Usage

```bash
boltbase [global options] command [command options] [arguments...]
```

### Getting Help

```bash
# General help
boltbase --help

# Command-specific help
boltbase start --help

# Show version
boltbase version
```

## Essential Commands

### Running Workflows

#### Start a Workflow
```bash
# Basic execution
boltbase start my-workflow.yaml

# Interactive DAG selection (when no file is specified)
boltbase start

# With named parameters (use -- separator)
boltbase start etl.yaml -- DATE=2024-01-01 ENV=prod

# With positional parameters
boltbase start my-workflow.yaml -- value1 value2 value3

# Override DAG name
boltbase start --name my_custom_name my-workflow.yaml

# Queue for later
boltbase enqueue my-workflow.yaml

# Remove a queued run (by queue name)
boltbase dequeue default
```

#### Stop a Running Workflow
```bash
# Stop currently running workflow
boltbase stop my-workflow

# Stop specific run
boltbase stop --run-id=20240101_120000 my-workflow

# Can also use file path
boltbase stop my-workflow.yaml
```

#### Restart a Workflow
```bash
# Restart latest run
boltbase restart my-workflow

# Restart specific run
boltbase restart --run-id=20240101_120000 my-workflow
```

#### Retry Failed Workflow
```bash
# Retry specific run (run-id is required)
boltbase retry --run-id=20240101_120000 my-workflow

# Can also use file path
boltbase retry --run-id=20240101_120000 my-workflow.yaml
```

### Monitoring Workflows

#### Check Status
```bash
# Check latest run status
boltbase status my-workflow

# Check specific run status
boltbase status --run-id=20240101_120000 my-workflow

# Can also use file path
boltbase status my-workflow.yaml
```

#### View Status of a DAG run
```bash
# Check detailed status and output
boltbase status my-workflow.yaml

# Note: For detailed logs, use the web UI at http://localhost:8080
# or check log files in the configured log directory
```

#### View Execution History

The `history` command displays past DAG executions with filtering and export capabilities:

```bash
# View recent runs
boltbase history my-workflow

# Debug recent failures
boltbase history my-workflow --status failed --last 7d

# Export to JSON for analysis
boltbase history --format json --limit 500 > history.json

# Export to CSV for spreadsheets
boltbase history --format csv > history.csv

# Filter by tags (AND logic)
boltbase history --tags "prod,critical"
```

**Key features:**
- Default: last 30 days, 100 results
- Date filters: absolute (`--from`/`--to`) or relative (`--last 7d`)
- Status filters: `succeeded`, `failed`, `running`, etc. (with aliases)
- Output: table (default), JSON, or CSV
- Run IDs never truncated

See [`history` reference](/reference/cli#history) for all options.

### Testing and Validation

#### Validate DAG Specification
```bash
# Validate DAG structure and references
boltbase validate my-workflow.yaml

# Returns human-readable validation errors if any
```

#### Dry Run
```bash
# Test DAG execution without running it
boltbase dry my-workflow.yaml

# With parameters
boltbase dry my-workflow.yaml -- DATE=2024-01-01

# Override DAG name
boltbase dry --name my_custom_name my-workflow.yaml
```

### Server Commands

#### Start Everything
```bash
# Start scheduler, web UI, and coordinator service (default: localhost:8080)
boltbase start-all

# Custom host and port
boltbase start-all --host=0.0.0.0 --port=9000

# Custom DAGs directory
boltbase start-all --dags=/path/to/directory
```

#### Start Scheduler Only
```bash
# Run just the scheduler (no UI)
boltbase scheduler

# Custom DAGs directory
boltbase scheduler --dags=/opt/workflows
```

#### Start Web UI Only
```bash
# Run just the web server (no scheduler)
boltbase server

# Custom host and port
boltbase server --host=0.0.0.0 --port=9000

# Custom DAGs directory
boltbase server --dags=/path/to/directory
```

### Distributed Execution Commands

#### Start Coordinator
```bash
# Start the coordinator gRPC server
boltbase coordinator

# Custom host and port
boltbase coordinator --coordinator.host=0.0.0.0 --coordinator.port=50055

# With TLS
boltbase coordinator \
  --peer.cert-file=server.pem \
  --peer.key-file=server-key.pem
```

The coordinator service manages task distribution to workers for distributed execution with automatic service registry and health monitoring.

#### Start Worker
```bash
# Start a worker that polls for tasks
boltbase worker

# With labels for capability matching
boltbase worker --worker.labels gpu=true,memory=64G,region=us-east-1

# With custom worker ID and concurrency
boltbase worker \
  --worker.id=gpu-worker-01 \
  --worker.max-active-runs=50
```

Workers automatically register in the service registry system and poll the coordinator for matching tasks based on their labels.

### Interactive DAG Selection

When you run `boltbase start` without specifying a DAG file, an interactive selector appears:

```bash
boltbase start
```

Features:
- Browse available DAGs with filtering
- Enter parameters interactively
- Confirm before execution

## Advanced Usage

### Queue Management

```bash
# Add to queue
boltbase enqueue my-workflow.yaml

# Add to queue with custom ID
boltbase enqueue --run-id=custom-001 my-workflow.yaml

# Add to queue with parameters
boltbase enqueue my-workflow.yaml -- KEY=value

# Add to queue using a specific queue (override)
boltbase enqueue --queue=high-priority my-workflow.yaml

# Override DAG name
boltbase enqueue --name my_custom_name my-workflow.yaml

# Remove next item from queue
boltbase dequeue default

# Remove specific run from queue
boltbase dequeue default --dag-run=my-workflow:custom-001
```

### Working with Parameters

Parameters can be passed in multiple ways:

```bash
# Positional parameters (use -- separator)
boltbase start my-workflow.yaml -- param1 param2 param3

# Named parameters (use -- separator)
boltbase start my-workflow.yaml -- KEY1=value1 KEY2=value2

# Mixed (use -- separator)
boltbase start my-workflow.yaml -- param1 KEY=value param2
```

## CLI Configuration

### Global Options

| Option | Description | Default |
|--------|-------------|---------|
| `--config` | Config file path | `~/.config/boltbase/config.yaml` |
| `--log-level` | Log verbosity | `info` |
| `--log-format` | Output format | `text` |
| `--quiet` | Suppress output | `false` |

## See Also

- [Explore the REST API](/overview/api) for programmatic access
- [Set up the Web UI](/overview/web-ui) for visual monitoring
- [Learn workflow syntax](/writing-workflows/) to build complex DAGs
- [Configure distributed execution](/features/distributed-execution) for scaling workflows
