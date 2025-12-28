# Special Environment Variables

Dagu injects a small set of read-only environment variables whenever it runs a workflow. These variables carry metadata about the current DAG run (name, run identifier, log locations, status) and are available for interpolation inside commands, arguments, lifecycle handlers, and most other places where you can reference environment variables.

## Availability

- **Step execution** – Every step receives the run-level variables plus a step-specific name and log file paths while it executes.
- **Lifecycle handlers** – `onExit`, `onSuccess`, `onFailure`, and `onCancel` handlers inherit the same variables. They additionally receive the final `DAG_RUN_STATUS` so that post-run automation can branch on success or failure.
- **Nested contexts** – When a step launches a sub DAG through the `dagu` CLI, the sub run gets its own identifiers and log locations; the parent identifiers remain accessible in the parent process for chaining or notifications.

Values are refreshed for each step, so `DAG_RUN_STEP_NAME`, `DAG_RUN_STEP_STDOUT_FILE`, and `DAG_RUN_STEP_STDERR_FILE` always point at whichever step (or handler) is currently running.

## Reference

| Variable | Provided In | Description | Example |
|----------|-------------|-------------|---------|
| `DAG_NAME` | All steps & handlers | Name of the DAG definition being executed. | `daily-backup` |
| `DAG_RUN_ID` | All steps & handlers | Unique identifier for the current run. Combines timestamp and a short suffix. | `20241012_040000_c1f4b2` |
| `DAG_RUN_LOG_FILE` | All steps & handlers | Absolute path to the aggregated DAG run log. Useful for attaching to alerts. | `/var/log/dagu/daily-backup/20241012_040000.log` |
| `DAG_RUN_STEP_NAME` | Current step or handler only | Name field of the step that is currently executing. | `upload-artifacts` |
| `DAG_RUN_STEP_STDOUT_FILE` | Current step or handler only | File path backing the step's captured stdout stream. | `/var/log/dagu/daily-backup/upload-artifacts.stdout.log` |
| `DAG_RUN_STEP_STDERR_FILE` | Current step or handler only | File path backing the step's captured stderr stream. | `/var/log/dagu/daily-backup/upload-artifacts.stderr.log` |
| `DAG_RUN_STATUS` | Lifecycle handlers only | Canonical completion status (`succeeded`, `partially_succeeded`, `failed`, `aborted`). | `failed` |
| `WEBHOOK_PAYLOAD` | Webhook-triggered runs only | JSON string containing the payload from the webhook request body. Only available when the DAG was triggered via a webhook. | `{"branch":"main","commit":"abc123"}` |

## Webhook Payload

When a DAG is triggered via a [webhook](/configurations/authentication/webhooks), the request payload is made available through the `WEBHOOK_PAYLOAD` environment variable. This allows your DAG steps to receive and process data from the triggering system.

### Example Usage

Access payload fields directly using Dagu's JSON field access syntax:

```yaml
name: webhook-triggered-dag
steps:
  - name: deploy
    command: |
      echo "Deploying branch ${WEBHOOK_PAYLOAD.branch}"
      echo "Commit: ${WEBHOOK_PAYLOAD.commit}"
      ./scripts/deploy.sh

  - name: notify
    command: echo "Deployed by ${WEBHOOK_PAYLOAD.sender.login}"
    depends:
      - deploy
```

For complex payloads with nested structures:

```yaml
steps:
  - name: process-github-push
    command: |
      echo "Repository: ${WEBHOOK_PAYLOAD.repository.full_name}"
      echo "Pusher: ${WEBHOOK_PAYLOAD.pusher.name}"
      echo "First commit message: ${WEBHOOK_PAYLOAD.commits.0.message}"
```

### Notes

- Dagu automatically parses the JSON payload and allows direct field access using dot notation.
- For arrays, use numeric indices (e.g., `${WEBHOOK_PAYLOAD.commits.0}` for the first element).
- Maximum payload size is 1MB.
- The variable is empty when the DAG is triggered by other means (scheduler, API, CLI).
- Always validate the payload contents in your DAG before processing.
