# Self-Upgrade

Boltbase includes a built-in upgrade command that allows you to update to the latest version directly from the command line.

## Overview

The `boltbase upgrade` command downloads and installs the latest version of Boltbase, with built-in checksum verification for security.

## Basic Usage

```bash
# Upgrade to latest version
boltbase upgrade

# Check if update is available (no installation)
boltbase upgrade --check

# Upgrade to specific version
boltbase upgrade --version v1.30.0

# Preview changes without installing
boltbase upgrade --dry-run

# Skip confirmation prompt
boltbase upgrade -y
```

## Command Options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--check` | | Check for updates without installing | `false` |
| `--version` | `-v` | Upgrade to specific version | latest |
| `--dry-run` | | Preview changes without installing | `false` |
| `--backup` | | Create backup before upgrading | `false` |
| `--yes` | `-y` | Skip confirmation prompt | `false` |
| `--pre-release` | | Include pre-release versions | `false` |

## Installation Methods

The upgrade command automatically detects how Boltbase was installed:

| Method | Self-Upgrade | Recommended Action |
|--------|--------------|-------------------|
| Binary download | Yes | `boltbase upgrade` |
| Go install | No | `go install github.com/dagu-org/dagu@latest` |
| Homebrew | No | `brew upgrade boltbase` |
| Snap | No | `snap refresh boltbase` |
| Docker | No | Pull latest image |

## How It Works

1. **Version Check**: Fetches latest release from GitHub API
2. **Download**: Downloads platform-specific archive with retry logic
3. **Verification**: Validates SHA256 checksum
4. **Backup** (optional): Creates `.bak` file of current binary
5. **Installation**: Atomically replaces the binary

## Supported Platforms

- **macOS**: amd64, arm64
- **Linux**: 386, amd64, arm64, armv6, armv7, ppc64le, s390x
- **FreeBSD**: 386, amd64, arm64, armv6, armv7
- **OpenBSD**: 386, amd64, arm64, armv6, armv7
- **Windows**: 386, amd64, arm64, armv6, armv7

## Update Notifications

Boltbase caches update check results for 24 hours. When an update is available, you'll see a notification in the web UI.

## Examples

### Check for Updates

```bash
boltbase upgrade --check
```

Output:
```
Current version: v1.30.0
Latest version:  v1.30.3

An update is available. Run 'boltbase upgrade' to update.
```

### Dry Run

```bash
boltbase upgrade --dry-run
```

Output:
```
Dry run - no changes will be made

Current version: v1.30.0
Target version:  v1.30.3

The following changes will be made:
  - Download: boltbase_1.30.3_darwin_arm64.tar.gz (25.3 MB)
  - Verify:   SHA256 checksum
  - Replace:  /usr/local/bin/boltbase
```

### Upgrade with Backup

```bash
boltbase upgrade --backup
```

Creates `/usr/local/bin/boltbase.bak` before replacing.

### Upgrade to Specific Version

```bash
boltbase upgrade --version v1.30.0
```

### Include Pre-releases

```bash
boltbase upgrade --pre-release
```

## Security

- All downloads are verified using SHA256 checksums from `checksums.txt`
- Archives are validated to prevent path traversal attacks
- Binary replacement is atomic to prevent corruption
