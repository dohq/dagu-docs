# Operations

Production deployment and monitoring.

## Running as a Service

### systemd

Create `/etc/systemd/system/boltbase.service`:

```ini
[Unit]
Description=Boltbase Workflow Engine
Documentation=https://docs.boltbase.ai/
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=boltbase
Group=boltbase
WorkingDirectory=/opt/boltbase

# Main process
ExecStart=/usr/local/bin/boltbase start-all

# Graceful shutdown
ExecStop=/bin/kill -TERM $MAINPID
TimeoutStopSec=30
KillMode=mixed
KillSignal=SIGTERM

# Restart policy
Restart=always
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/boltbase/data /opt/boltbase/logs

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

# Environment
EnvironmentFile=-/etc/boltbase/environment
Environment="BOLTBASE_HOME=/opt/boltbase"

[Install]
WantedBy=multi-user.target
```

Create `/etc/boltbase/environment`:
```bash
BOLTBASE_HOST=0.0.0.0
BOLTBASE_PORT=8080
BOLTBASE_TZ=America/New_York
BOLTBASE_LOG_FORMAT=json
```

Setup:
```bash
# Create user and directories
sudo useradd -r -s /bin/false boltbase
sudo mkdir -p /opt/boltbase/{dags,data,logs}
sudo chown -R boltbase:boltbase /opt/boltbase

# Enable and start
sudo systemctl enable boltbase
sudo systemctl start boltbase

# Check status
sudo systemctl status boltbase
sudo journalctl -u boltbase -f
```

### Docker Compose

`compose.yml`:

```yaml
version: '3.8'

services:
  boltbase:
    image: ghcr.io/dagu-org/boltbase:latest
    container_name: boltbase
    restart: unless-stopped
    
    # Health check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    # Port mapping
    ports:
      - "8080:8080"
    
    # Environment variables
    environment:
      # Server configuration
      - BOLTBASE_PORT=8080
      - BOLTBASE_HOST=0.0.0.0
      - BOLTBASE_TZ=America/New_York
      
      # Logging
      - BOLTBASE_LOG_FORMAT=json
      
      # Authentication (optional)
      # - BOLTBASE_AUTH_BASIC_USERNAME=admin
      # - BOLTBASE_AUTH_BASIC_PASSWORD=your-secure-password
      
      # User/Group IDs (optional)
      # - PUID=1000
      # - PGID=1000
      
      # Docker-in-Docker support (optional)
      # - DOCKER_GID=999
    
    # Volume mounts
    volumes:
      - boltbase:/var/lib/boltbase
      
      # Docker socket for Docker executor (optional)
      # - /var/run/docker.sock:/var/run/docker.sock
    
    # Logging configuration
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

volumes:
  boltbase-data:
  boltbase-logs:
```

```bash
# Start
docker compose up -d

# Logs
docker compose logs -f

# Stop
docker compose down
```

With authentication (`.env` file):
```bash
BOLTBASE_AUTH_BASIC_USERNAME=admin
BOLTBASE_AUTH_BASIC_PASSWORD=secure-password
```

### Resource Monitoring

Boltbase provides built-in resource monitoring that tracks CPU, memory, disk, and load average. The data is displayed in the System Status page of the web UI.

**Configuration:**
```yaml
# config.yaml
monitoring:
  retention: "24h"    # How long to keep history (default: 24h)
  interval: "5s"      # Collection frequency (default: 5s)
```

```bash
# Or via environment variables
export BOLTBASE_MONITORING_RETENTION=12h
export BOLTBASE_MONITORING_INTERVAL=10s
```

**Metrics collected:**
- **CPU Usage** - Overall CPU utilization percentage
- **Memory Usage** - RAM utilization percentage
- **Disk Usage** - Disk space utilization for the data directory
- **Load Average** - 1-minute system load average

**API Endpoint:**
```bash
# Get resource history (last hour by default)
curl http://localhost:8080/api/v1/services/resources/history

# Get last 30 minutes
curl http://localhost:8080/api/v1/services/resources/history?duration=30m
```

**Memory Usage:**
Resource history is stored in memory. With default settings (5s interval, 24h retention), memory usage is approximately 1.1MB for all 4 metrics.

### Prometheus Metrics

Metrics available at `/api/v1/metrics`:

**System:**
- `boltbase_info` - Build information
- `boltbase_uptime_seconds` - Uptime
- `boltbase_scheduler_running` - Scheduler status

**DAGs:**
- `boltbase_dags_total` - Total DAGs
- `boltbase_dag_runs_currently_running` - Running DAGs
- `boltbase_dag_runs_queued_total` - Queued DAGs
- `boltbase_dag_runs_total` - DAG runs by status (24h)

**Standard:**
- Go runtime metrics
- Process metrics

### Logging

```yaml
# config.yaml
log_format: json    # text or json
debug: true       # Debug mode
paths:
  log_dir: /var/log/boltbase
```

```bash
# Or via environment
export BOLTBASE_LOG_FORMAT=json
export BOLTBASE_DEBUG=true
export BOLTBASE_LOG_DIR=/var/log/boltbase
```

JSON log example:
```json
{
  "time": "2024-03-15T12:00:00Z",
  "level": "INFO",
  "msg": "DAG execution started",
  "dag": "data-pipeline",
  "run_id": "20240315_120000_abc123"
}
```

#### Log Cleanup

Automatic cleanup based on `hist_retention_days`:

```yaml
# Per-DAG
hist_retention_days: 7  # Keep 7 days

# Or global in base.yaml
hist_retention_days: 30  # Default
```

Special values:
- `0` - Delete after each run
- `-1` - Keep forever

Deletes:
- Execution logs
- Step output (.out, .err)
- Status files (.jsonl)
- Sub DAG logs

#### Viewing Run History

Before cleaning up logs, review execution history with `boltbase history`:

```bash
# Preview what cleanup would affect
boltbase history my-workflow --limit 100

# Check run status before deletion
boltbase history my-workflow --from 2025-01-01 --to 2025-12-31
```

The `history` command helps:
- Identify which runs to keep/delete
- Verify cleanup results
- Export run metadata before cleanup: `boltbase history --format json`

See [`history` CLI reference](/reference/cli#history) and [`cleanup` command](/reference/cli#cleanup).

### Alerting

#### Email

```yaml
# base.yaml
smtp:
  host: "smtp.gmail.com"
  port: "587"
  username: "notifications@company.com"
  password: "${SMTP_PASSWORD}"

error_mail:
  from: "boltbase@company.com"
  to: "ops-team@company.com"
  prefix: "[ERROR]"
  attach_logs: true

mail_on:
  failure: true
  success: false
```

Per-step notification:
```yaml
steps:
  - name: critical-task
    command: echo "Processing"
    mail_on_error: true
```

#### Webhooks

**Slack:**
```yaml
handler_on:
  failure:
    type: http
    config:
      url: "${SLACK_WEBHOOK_URL}"
      method: POST
      body: |
        {
          "text": "Workflow Failed: ${DAG_NAME}",
          "blocks": [{
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Run ID:* ${DAG_RUN_ID}"
            }
          }]
        }
```

**PagerDuty:**
```yaml
handler_on:
  failure:
    type: http
    config:
      url: https://events.pagerduty.com/v2/enqueue
      body: |
        {
          "routing_key": "${PAGERDUTY_KEY}",
          "event_action": "trigger",
          "payload": {
            "summary": "Failed: ${DAG_NAME}",
            "severity": "error"
          }
        }
```

## Security

### Environment Variable Filtering

Boltbase implements environment variable filtering to prevent accidental exposure of sensitive data to step processes and sub DAGs.

**How It Works:**

System environment variables are available for variable expansion (`${VAR}`) when parsing the DAG configuration, but only filtered variables are passed to the actual step execution environment and sub DAG processes.

**Filtered Variables (passed to step processes):**

Only these system environment variables are automatically passed to step processes and sub DAGs:

- **Whitelisted:** `PATH`, `HOME`, `LANG`, `TZ`, `SHELL`
- **Allowed Prefixes:** `BOLTBASE_*`, `LC_*`, `DAG_*`

**Note:** Boltbase automatically sets special variables with the `DAG_*` prefix for every step execution:
- `DAG_NAME`, `DAG_RUN_ID`, `DAG_RUN_STEP_NAME`
- `DAG_RUN_LOG_FILE`, `DAG_RUN_STEP_STDOUT_FILE`, `DAG_RUN_STEP_STDERR_FILE`

You can still use `${SYSTEM_VAR}` in your DAG YAML for variable expansion during configuration parsing, but the variable itself won't be in the step process environment unless it's whitelisted or explicitly defined in the `env` section.

**Using Sensitive Variables:**

The recommended approach is to use `.env` files to provide sensitive credentials to workflows:

```yaml
# workflow.yaml
dotenv: .env.secrets  # Load from .env file (not tracked in git)

steps:
  - name: deploy
    command: aws s3 sync ./build s3://my-bucket
```

```bash
# .env.secrets (add to .gitignore)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
DATABASE_PASSWORD=secure-password
```

Alternatively, if you need to pass through system environment variables, you must explicitly reference them:

```yaml
# workflow.yaml
env:
  - AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}      # Explicit reference
  - AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}

steps:
  - name: deploy
    command: aws s3 sync ./build s3://my-bucket
```

### Process Isolation

```bash
# systemd security features
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/boltbase/data /opt/boltbase/logs
```

## See Also

- [Server Configuration](/configurations/server) - Configure server settings
- [Deployment](/configurations/deployment) - Installation and deployment guides
- [Reference](/configurations/reference) - Complete configuration reference
- [Variables Reference](/reference/variables) - Environment variable usage
