# Harness

Run coding agent CLIs as workflow steps. The harness executor spawns a coding agent as a subprocess in non-interactive mode, captures its stdout/stderr, and reports its exit code.

The CLI binary must be pre-installed and available in `PATH`. If the binary is not found, the step fails at setup time before execution begins.

## Basic Usage

```yaml
steps:
  - name: generate-tests
    type: harness
    command: "Write unit tests for the auth module"
    config:
      provider: claude
      model: sonnet
      bare: true
```

The `command` field is the prompt sent to the coding agent. The `config.provider` field is required. All other config keys are passed directly as CLI flags (`--key value` for strings/numbers, `--key` for booleans).

## Providers

Each provider maps to a specific CLI tool and its non-interactive invocation mode:

| Provider | Binary | Invocation |
|----------|--------|------------|
| `claude` | `claude` | `claude -p "<prompt>" [flags]` |
| `codex` | `codex` | `codex exec "<prompt>" [flags]` |
| `copilot` | `copilot` | `copilot -p "<prompt>" [flags]` |
| `opencode` | `opencode` | `opencode run "<prompt>" [flags]` |
| `pi` | `pi` | `pi -p "<prompt>" [flags]` |

## How Config Maps to CLI Flags

Config keys (except `provider`) are converted to CLI flags:

| YAML type | CLI output | Example |
|-----------|-----------|---------|
| `key: "value"` | `--key value` | `model: sonnet` → `--model sonnet` |
| `key: true` | `--key` | `bare: true` → `--bare` |
| `key: false` | *(omitted)* | `bare: false` → *(nothing)* |
| `key: 123` | `--key 123` | `max-turns: 20` → `--max-turns 20` |
| `key: [a, b]` | `--key a --key b` | *(repeated flag)* |

Config keys are the exact CLI flag names without the `--` prefix. Refer to each provider's CLI documentation for available flags.

## Stdin Piping

If the step has a `script` field, its content is piped to the CLI's stdin:

```yaml
steps:
  - name: review-code
    type: harness
    command: "Review this code for security issues"
    script: |
      func handleLogin(w http.ResponseWriter, r *http.Request) {
          username := r.FormValue("username")
          query := fmt.Sprintf("SELECT * FROM users WHERE name = '%s'", username)
          db.Query(query)
      }
    config:
      provider: claude
      model: sonnet
```

## Examples

### Claude Code

```yaml
steps:
  - name: analyze
    type: harness
    command: "Analyze the codebase and list all public API endpoints as JSON"
    config:
      provider: claude
      model: sonnet
      output-format: json
      bare: true
      permission-mode: plan
      max-turns: 10
      max-budget-usd: 1.00
      allowedTools: "Bash,Read,Edit"
    output: API_ENDPOINTS
```

### Codex

```yaml
steps:
  - name: fix-tests
    type: harness
    command: "Run the test suite, identify failures, and fix them"
    config:
      provider: codex
      model: gpt-5-codex
      full-auto: true
      sandbox: workspace-write
      ephemeral: true
      skip-git-repo-check: true
    dir: ./src
```

### Copilot

```yaml
steps:
  - name: refactor
    type: harness
    command: "Refactor the database layer to use connection pooling"
    config:
      provider: copilot
      autopilot: true
      yolo: true
      silent: true
      no-ask-user: true
      no-auto-update: true
    timeout_sec: 300
```

### OpenCode

```yaml
steps:
  - name: refactor
    type: harness
    command: "Refactor the database layer to use connection pooling"
    config:
      provider: opencode
      format: json
```

### Pi

```yaml
steps:
  - name: design
    type: harness
    command: "Design a rate limiting middleware for the API gateway"
    config:
      provider: pi
      thinking: high
      tools: read,bash
```

### With Timeout and Retry

Dagu's standard step-level `timeout_sec` and `retry_policy` work with harness steps:

```yaml
steps:
  - name: generate
    type: harness
    command: "Generate integration tests for the payment service"
    config:
      provider: claude
      model: opus
      effort: max
      max-turns: 30
    timeout_sec: 300
    retry_policy:
      limit: 2
      interval_sec: 10
```

### Variable Substitution in Config

Config values support `${VAR}` expansion:

```yaml
env:
  - MODEL: sonnet
  - PROVIDER: claude

steps:
  - name: task
    type: harness
    command: "Implement the feature described in ${SPEC_FILE}"
    config:
      provider: "${PROVIDER}"
      model: "${MODEL}"
      effort: high
```

## Exit Codes

| Exit Code | Meaning |
|-----------|---------|
| 0 | CLI completed successfully |
| 1 | CLI reported an error (check stderr in step logs) |
| 124 | Step timed out (Dagu killed the process) |

On non-zero exit, the last 1KB of stderr is included in the error message.
