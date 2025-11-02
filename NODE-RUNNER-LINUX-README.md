# 🐧 Ghost Whistle Node Runner - Linux

Run a Ghost Whistle privacy node on Linux without installing Node.js!

---

## 📥 Download

Download the latest Linux executable:

```bash
# Download (replace with your actual download URL)
wget https://github.com/YOUR-USERNAME/ghost-whistle/releases/latest/download/ghost-node-runner-linux

# Or use curl
curl -L -o ghost-node-runner-linux https://github.com/YOUR-USERNAME/ghost-whistle/releases/latest/download/ghost-node-runner-linux
```

---

## 🚀 Quick Start

### 1. Make it executable:
```bash
chmod +x ghost-node-runner-linux
```

### 2. Run the node:
```bash
./ghost-node-runner-linux
```

That's it! Your node is now running and participating in the Ghost Whistle network.

---

## ⚙️ Configuration

### Basic Configuration

Set environment variables before running:

```bash
export NODE_ID="my-linux-node"
export NODE_REGION="EU-West"
export SIGNALING_SERVER="wss://ghost-whistle-signaling.onrender.com"
./ghost-node-runner-linux
```

### Run with Custom Settings

```bash
NODE_ID="my-custom-node" NODE_REGION="US-East" ./ghost-node-runner-linux
```

---

## 🔧 Run as a System Service (systemd)

Create a service file to run your node automatically:

### 1. Create service file:
```bash
sudo nano /etc/systemd/system/ghost-node.service
```

### 2. Add configuration:
```ini
[Unit]
Description=Ghost Whistle Node Runner
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/ghost-whistle
ExecStart=/home/YOUR_USERNAME/ghost-whistle/ghost-node-runner-linux
Environment="NODE_ID=my-linux-node"
Environment="NODE_REGION=EU-West"
Environment="SIGNALING_SERVER=wss://ghost-whistle-signaling.onrender.com"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ghost-node
sudo systemctl start ghost-node
```

### 4. Check status:
```bash
sudo systemctl status ghost-node
```

### 5. View logs:
```bash
sudo journalctl -u ghost-node -f
```

---

## 🐳 Run with Docker (Alternative)

If you prefer Docker:

```bash
docker run -d \
  --name ghost-node \
  --restart unless-stopped \
  -e NODE_ID="my-docker-node" \
  -e NODE_REGION="US-East" \
  -e SIGNALING_SERVER="wss://ghost-whistle-signaling.onrender.com" \
  ghost-whistle/node-runner:latest
```

---

## 📊 Monitoring

### Check if node is running:
```bash
ps aux | grep ghost-node-runner
```

### Monitor network activity:
```bash
netstat -an | grep ESTABLISHED
```

### Check resource usage:
```bash
top -p $(pgrep -f ghost-node-runner)
```

---

## 🔄 Updates

### Manual Update:
```bash
# Download new version
wget https://github.com/YOUR-USERNAME/ghost-whistle/releases/latest/download/ghost-node-runner-linux -O ghost-node-runner-linux.new

# Stop the old version
pkill -f ghost-node-runner

# Replace
mv ghost-node-runner-linux.new ghost-node-runner-linux
chmod +x ghost-node-runner-linux

# Start new version
./ghost-node-runner-linux
```

### Auto-Update Script:
Create `update-node.sh`:

```bash
#!/bin/bash
echo "Checking for updates..."
wget -q https://github.com/YOUR-USERNAME/ghost-whistle/releases/latest/download/ghost-node-runner-linux -O /tmp/ghost-node-runner-linux.new

if [ -f "/tmp/ghost-node-runner-linux.new" ]; then
    echo "Update found, installing..."
    pkill -f ghost-node-runner
    mv /tmp/ghost-node-runner-linux.new ./ghost-node-runner-linux
    chmod +x ghost-node-runner-linux
    ./ghost-node-runner-linux &
    echo "Update complete!"
else
    echo "No update available"
fi
```

```bash
chmod +x update-node.sh
./update-node.sh
```

---

## 🛑 Stop the Node

### If running in terminal:
Press `Ctrl+C`

### If running as service:
```bash
sudo systemctl stop ghost-node
```

### Kill process:
```bash
pkill -f ghost-node-runner
```

---

## 🐛 Troubleshooting

### Permission denied
```bash
chmod +x ghost-node-runner-linux
```

### Port already in use
Check what's using the port:
```bash
sudo netstat -tulpn | grep :8080
```

### Can't connect to signaling server
Check your internet connection and firewall:
```bash
# Test connection
curl -I https://ghost-whistle-signaling.onrender.com

# Check firewall
sudo ufw status
```

### High CPU/Memory usage
```bash
# Check resource usage
top -p $(pgrep -f ghost-node-runner)

# Limit resources (if needed)
systemd-run --scope -p MemoryLimit=512M -p CPUQuota=50% ./ghost-node-runner-linux
```

---

## 📁 File Locations

- **Executable**: `./ghost-node-runner-linux`
- **Logs**: stdout/stderr (or systemd journal if using service)
- **Config**: Environment variables
- **Storage**: `./node-storage/` (created automatically)

---

## 🔒 Security Best Practices

1. **Run as non-root user**:
   ```bash
   # Never run as root!
   sudo useradd -m -s /bin/bash ghostnode
   sudo -u ghostnode ./ghost-node-runner-linux
   ```

2. **Firewall configuration**:
   ```bash
   sudo ufw allow 8080/tcp
   sudo ufw enable
   ```

3. **Keep updated**:
   ```bash
   # Check for updates regularly
   # Subscribe to GitHub releases
   ```

4. **Monitor logs**:
   ```bash
   # Watch for suspicious activity
   tail -f /var/log/ghost-node.log
   ```

---

## 💡 Tips & Tricks

### Run in background with nohup:
```bash
nohup ./ghost-node-runner-linux > node.log 2>&1 &
```

### Run in screen session:
```bash
screen -S ghost-node
./ghost-node-runner-linux
# Detach: Ctrl+A then D
# Reattach: screen -r ghost-node
```

### Run in tmux:
```bash
tmux new -s ghost-node
./ghost-node-runner-linux
# Detach: Ctrl+B then D
# Reattach: tmux attach -t ghost-node
```

---

## 📊 Performance Tuning

### Optimize for low-resource systems:
```bash
# Limit memory
systemd-run --scope -p MemoryLimit=256M ./ghost-node-runner-linux

# Set process priority
nice -n 10 ./ghost-node-runner-linux
```

### Optimize for high-performance:
```bash
# Use all CPU cores
taskset -c 0-3 ./ghost-node-runner-linux
```

---

## 🌐 Supported Linux Distributions

Tested and working on:
- ✅ Ubuntu 20.04+
- ✅ Debian 11+
- ✅ CentOS 8+
- ✅ Fedora 35+
- ✅ Arch Linux
- ✅ Alpine Linux
- ✅ Raspberry Pi OS (ARM builds coming soon)

---

## 📞 Support

- **Issues**: https://github.com/YOUR-USERNAME/ghost-whistle/issues
- **Discord**: [Your Discord Link]
- **Docs**: https://docs.ghostwhistle.com

---

## 🎉 Contributing

Help improve the Linux node runner:
1. Fork the repository
2. Make your changes
3. Submit a pull request

---

## 📜 License

MIT License - See LICENSE file for details

---

**Made with ❤️ for Linux users**

