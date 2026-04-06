# Secrets

The `secrets` block defines environment variables whose values are resolved by a secret provider at execution time.

```yaml
secrets:
  - name: API_TOKEN
    provider: env
    key: PROD_API_TOKEN
  - name: DB_PASSWORD
    provider: file
    key: /run/secrets/db-password

steps:
  - command: ./deploy.sh
    env:
      - DATABASE_URL: postgres://app:${DB_PASSWORD}@db/prod
      - AUTH_HEADER: "Bearer ${API_TOKEN}"
```

## Schema

Each item in `secrets:` has these fields:

- `name`: environment variable name exposed to the DAG runtime and step processes
- `provider`: resolver name
- `key`: provider-specific lookup key
- `options`: optional map of string keys and string values

At spec build time, Dagu validates:

- `name` is present
- `provider` is present
- `key` is present
- secret names are unique within the DAG

`dagu validate` checks that schema only. It does not contact secret providers and does not verify that the secret exists.

## Execution Behavior

When a DAG run starts, Dagu resolves each secret and adds it to the execution environment.

Precedence in the execution scope is:

1. Step `env`
2. Step outputs
3. `secrets`
4. DAG `env`, `dotenv`, runtime-managed DAG variables, and params
5. Filtered OS environment

If a secret and a DAG-level variable use the same name, the secret wins. A step-level `env` entry can still override that name for that step.

## Masking Behavior

Resolved secret values are masked with `*******` in Dagu-managed outputs that use the runtime masker:

- step stdout/stderr log files
- captured step outputs (`output:` values and `outputs.json`)
- agent outputs
- chat step messages sent to external LLM providers

Dagu does not stop your workflow code from writing a secret to arbitrary files, remote APIs, databases, or other systems. The masking only applies to the Dagu-managed sinks above.

## `env` Provider

The `env` provider resolves `key` in this order:

1. values already present in the DAG evaluation scope
   This includes DAG `env:` entries and values loaded through `dotenv:`
2. an internal `_DAGU_PRESOLVED_SECRET_<KEY>` transport variable used for subprocess handoff
3. the process environment visible to the Dagu process

If the variable is unset, resolution fails. If the variable exists and is empty, the empty string is accepted. Values are returned as-is; whitespace is not trimmed.

Example using the process environment:

```yaml
secrets:
  - name: SLACK_TOKEN
    provider: env
    key: PROD_SLACK_TOKEN
```

Example using `dotenv` as the source for the `env` provider:

```yaml
working_dir: /srv/app
dotenv: .env

secrets:
  - name: DATABASE_URL
    provider: env
    key: DATABASE_URL

steps:
  - command: ./migrate.sh
```

## `file` Provider

The `file` provider reads the contents of a file and returns them unchanged.

- Absolute paths are used as-is.
- Relative paths are searched in this order:
  1. `working_dir`
  2. the directory containing the DAG file
- If the path does not exist, resolution fails.
- If the path points to a directory, resolution fails.
- The provider does not trim trailing newlines or surrounding whitespace.

Example:

```yaml
working_dir: /srv/app

secrets:
  - name: DB_PASSWORD
    provider: file
    key: secrets/db-password

steps:
  - command: ./deploy.sh
    env:
      - STRICT_MODE: "1"
      - DATABASE_URL: postgres://app:${DB_PASSWORD}@db/prod
```

## `vault` Provider

The `vault` provider reads from HashiCorp Vault.

Client settings are resolved in this order:

1. Vault defaults in Dagu config:
   - `secrets.vault.address`
   - `secrets.vault.token`
2. per-secret overrides in `options`:
   - `vault_address`
   - `vault_token`

Field selection works like this:

- If `options.field` is set, Dagu reads `key` as the Vault path and `options.field` as the field name.
- Otherwise Dagu splits `key` on the last `/`:
  - path = everything before the last slash
  - field = everything after the last slash
- If `key` has no slash, the field name defaults to `value`

If the Vault response contains a top-level `data` object, Dagu unwraps it before field lookup. This is how KV v2 responses are handled.

For KV v2, the path must include `/data/`.

Example using the default "last path segment is the field name" rule:

```yaml
secrets:
  - name: SLACK_TOKEN
    provider: vault
    key: kv/data/integrations/slack/token
```

That reads path `kv/data/integrations/slack` and field `token`.

Example with an explicit field:

```yaml
secrets:
  - name: SSH_PASSWORD
    provider: vault
    key: kv/data/ops/ssh
    options:
      field: password
```
