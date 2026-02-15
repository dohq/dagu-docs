# Linux Systemd Service

## Install Boltbase

```bash
# Install to /usr/local/bin (system-wide)
curl -L https://raw.githubusercontent.com/dagu-org/dagu/main/scripts/installer.sh | \
  bash -s -- --install-dir /usr/local/bin

# Create user and directories
sudo useradd -r -s /bin/false boltbase
sudo mkdir -p /var/lib/boltbase
sudo chown -R boltbase:boltbase /var/lib/boltbase
```

## Create Service

Create `/etc/systemd/system/boltbase.service`:

```ini
[Unit]
Description=Boltbase Workflow Engine
After=network.target

[Service]
Type=simple
User=boltbase
Group=boltbase
WorkingDirectory=/var/lib/boltbase
ExecStart=/usr/local/bin/boltbase start-all
Restart=always
RestartSec=10

Environment="BOLTBASE_HOST=0.0.0.0"
Environment="BOLTBASE_PORT=8525"
Environment="BOLTBASE_HOME=/var/lib/boltbase"

[Install]
WantedBy=multi-user.target
```

## Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start
sudo systemctl enable boltbase

# Start service
sudo systemctl start boltbase

# Check status
sudo systemctl status boltbase

# View logs
sudo journalctl -u boltbase -f
```

## Access

Open http://your-server:8525 in your browser.
