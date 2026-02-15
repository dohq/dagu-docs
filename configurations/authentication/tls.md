# TLS/HTTPS Configuration

Enable encrypted connections for Boltbase.

## Configuration

### YAML Configuration

```yaml
# ~/.config/boltbase/config.yaml
tls:
  cert_file: /path/to/server.crt
  key_file: /path/to/server.key
  ca_file: /path/to/ca.crt  # Optional
```

### Environment Variables

```bash
export BOLTBASE_CERT_FILE=/path/to/server.crt
export BOLTBASE_KEY_FILE=/path/to/server.key

boltbase start-all
```

## Generate Certificates

### Self-Signed Certificate

```bash
# Generate a self-signed certificate for testing
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt \
  -days 365 -nodes -subj "/CN=localhost"
```

### Production Certificate

```bash
# Generate private key
openssl genrsa -out server.key 4096

# Generate certificate signing request
openssl req -new -key server.key -out server.csr \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=boltbase.example.com"

# Submit CSR to your CA and get signed certificate
```

## Usage

### Access HTTPS Server

```bash
# With self-signed certificate
curl -k https://localhost:8080/api/v1/dags

# With CA-signed certificate
curl https://boltbase.example.com/api/v1/dags
```

## Multi-Environment Setup

```bash
# Development (HTTP)
boltbase start-all

# Production (HTTPS)
export BOLTBASE_CERT_FILE=/etc/ssl/boltbase.crt
export BOLTBASE_KEY_FILE=/etc/ssl/boltbase.key
boltbase start-all
```

## Notes

- Both cert_file and key_file must be provided to enable TLS
- Server will listen on HTTPS when TLS is configured
- Self-signed certificates require clients to skip verification
- Use proper CA-signed certificates in production
