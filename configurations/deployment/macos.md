# macOS Service

## Install Boltbase via Homebrew

```bash
# Install Boltbase
brew update && brew install boltbase

# Update Boltbase
brew update && brew upgrade boltbase
```


## Create Config File

Create `~/.config/boltbase/config.yaml`:

```yaml
host: 127.0.0.1
port: 8525
```

## Create LaunchAgent

Create `~/Library/LaunchAgents/local.boltbase.server.plist`:

```sh
vim ~/Library/LaunchAgents/local.boltbase.server.plist
```

Contents:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>local.boltbase.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/boltbase</string>
        <string>start-all</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/boltbase.out.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/boltbase.err.log</string>
</dict>
</plist>
```

## Start Service

```bash
# Load and start service
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/local.boltbase.server.plist

# Check status
launchctl list | grep boltbase

# Stop service
launchctl bootout gui/$(id -u)/local.boltbase.server

# Restart service
launchctl kickstart -k gui/$(id -u)/local.boltbase.server
```

## Uninstall

```bash
# Stop and unload service
launchctl bootout gui/$(id -u)/local.boltbase.server

# Remove plist file
rm ~/Library/LaunchAgents/local.boltbase.server.plist
```

## Access

Open http://localhost:8525 in your browser.
