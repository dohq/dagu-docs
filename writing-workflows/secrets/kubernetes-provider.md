# Kubernetes Provider

The `kubernetes` provider reads one data key from a Kubernetes Secret resource and injects the decoded value as a secret environment variable.

```yaml
secrets:
  - name: DB_PASSWORD
    provider: kubernetes
    key: app-secrets/db-password
    options:
      namespace: production
```

`key` and `options` values are literal strings. They are not expanded through DAG variables, params, or dotenv values.

## Client Settings

Global defaults are configured in Dagu `config.yaml`:

```yaml
secrets:
  kubernetes:
    namespace: production
    kubeconfig: /etc/dagu/kubeconfig
    context: prod-cluster
```

The same fields can be set with Dagu config environment variables:

```bash
export DAGU_SECRETS_KUBERNETES_NAMESPACE=production
export DAGU_SECRETS_KUBERNETES_KUBECONFIG=/etc/dagu/kubeconfig
export DAGU_SECRETS_KUBERNETES_CONTEXT=prod-cluster
```

Per-secret options override the global defaults for that secret:

```yaml
secrets:
  - name: API_TOKEN
    provider: kubernetes
    key: app-secrets/api-token
    options:
      namespace: staging
      kubeconfig: /etc/dagu/staging-kubeconfig
      context: staging-cluster
```

If no kubeconfig is configured, the provider uses normal Kubernetes client-go discovery: `KUBECONFIG`, `~/.kube/config`, then in-cluster configuration. If no namespace is configured, it uses `default`.

## Key Parsing

The provider needs both a Kubernetes Secret object name and a data key.

Use `secret-name/data-key` in `key`:

```yaml
secrets:
  - name: DB_PASSWORD
    provider: kubernetes
    key: app-secrets/db-password
```

Dagu reads Secret `app-secrets` and returns data key `db-password`.

You can also put the Secret object name in `options.secret_name` and use `key` for the data key:

```yaml
secrets:
  - name: DB_PASSWORD
    provider: kubernetes
    key: db-password
    options:
      secret_name: app-secrets
```

For parity with the Vault provider, `options.field` is accepted as an alias for the data key when `key` is the Secret object name:

```yaml
secrets:
  - name: DB_PASSWORD
    provider: kubernetes
    key: app-secrets
    options:
      field: db-password
```

## Permissions

The Dagu process that resolves the DAG must be allowed to `get` Secret resources in the target namespace. In distributed execution, that is the worker process.

Example minimal RBAC:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dagu-secret-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
```

## Value Handling

Kubernetes Secret data is stored as bytes. The provider converts the selected data value directly to a string without trimming whitespace or newlines.

If the Secret or data key is missing, resolution fails before any step starts.
