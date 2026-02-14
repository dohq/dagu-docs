# Basic Authentication

Username and password authentication for Dagu.

## Configuration

### YAML Configuration

```yaml
# ~/.config/dagu/config.yaml
auth:
  basic:
    enabled: true
    username: admin
    password: secure-password
```

### Environment Variables

```bash
export DAGU_AUTH_BASIC_ENABLED=true
export DAGU_AUTH_BASIC_USERNAME=admin
export DAGU_AUTH_BASIC_PASSWORD=secure-password

dagu start-all
```

## Usage

### CLI Access

```bash
# Using environment variables
export DAGU_AUTH_BASIC_ENABLED=true
export DAGU_AUTH_BASIC_USERNAME=admin
export DAGU_AUTH_BASIC_PASSWORD=secure-password
dagu status
```

### API Access

```bash
# Basic auth header
curl -u admin:secure-password http://localhost:8080/api/v1/dags

# Or with Authorization header
curl -H "Authorization: Basic $(echo -n admin:secure-password | base64)" \
     http://localhost:8080/api/v1/dags
```

## Notes

- Basic authentication is enabled when `enabled: true` is set along with both username and password
- Set `enabled: false` or omit the `enabled` field to disable basic authentication
- Credentials are checked on every request