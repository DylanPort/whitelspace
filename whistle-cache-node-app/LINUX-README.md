# WHISTLE Cache Node - Linux Installation Guide

<p align="center">
  <img src="assets/icon.svg" width="120" alt="WHISTLE Logo">
</p>

<p align="center">
  <strong>Earn SOL by running a WHISTLE Cache Node on Linux</strong>
</p>

---

## 📋 Overview

WHISTLE Cache Node is a desktop/server application that allows you to earn SOL cryptocurrency by caching and serving Solana RPC requests. This guide covers installation on Linux systems.

### Supported Distributions

- **Ubuntu** 20.04+ / **Debian** 10+
- **CentOS** 8+ / **RHEL** 8+ / **Rocky Linux** / **AlmaLinux**
- **Fedora** 34+
- **Arch Linux** / **Manjaro**
- Any Linux distribution with Docker support

### Available Formats

| Format | Best For |
|--------|----------|
| **AppImage** | Universal, no installation required |
| **.deb** | Ubuntu, Debian, Pop!_OS |
| **.rpm** | Fedora, CentOS, RHEL |
| **tar.gz** | Manual installation |
| **Docker** | Headless servers |

---

## 🚀 Quick Start

### Option 1: One-Line Docker Install (Fastest)

```bash
# Run the easy start script
curl -fsSL https://raw.githubusercontent.com/DylanPort/whitelspace/main/CACHE-NODE-EASY.sh | bash
```

Or download and run:

```bash
wget https://raw.githubusercontent.com/DylanPort/whitelspace/main/CACHE-NODE-EASY.sh
chmod +x CACHE-NODE-EASY.sh
./CACHE-NODE-EASY.sh YOUR_WALLET_ADDRESS
```

### Option 2: GUI Application (AppImage)

```bash
# Download the AppImage
wget https://github.com/DylanPort/whitelspace/releases/latest/download/WHISTLE-Cache-Node-1.0.0-linux-x64.AppImage

# Make it executable
chmod +x WHISTLE-Cache-Node-1.0.0-linux-x64.AppImage

# Run it
./WHISTLE-Cache-Node-1.0.0-linux-x64.AppImage
```

### Option 3: Package Installation

**Ubuntu/Debian (.deb):**
```bash
wget https://github.com/DylanPort/whitelspace/releases/latest/download/WHISTLE-Cache-Node-1.0.0-linux-x64.deb
sudo dpkg -i WHISTLE-Cache-Node-1.0.0-linux-x64.deb
sudo apt-get install -f  # Install dependencies if needed
```

**Fedora/CentOS (.rpm):**
```bash
wget https://github.com/DylanPort/whitelspace/releases/latest/download/WHISTLE-Cache-Node-1.0.0-linux-x64.rpm
sudo rpm -i WHISTLE-Cache-Node-1.0.0-linux-x64.rpm
# or
sudo dnf localinstall WHISTLE-Cache-Node-1.0.0-linux-x64.rpm
```

---

## 🖥️ Headless Server Setup (No GUI)

For VPS and servers without a display, use Docker with systemd:

### 1. Install Docker

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# CentOS/RHEL
sudo yum install -y docker docker-compose
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

### 2. Quick Docker Run

```bash
# Replace YOUR_WALLET with your Solana wallet address
docker run -d \
  --name whistle-cache \
  --restart unless-stopped \
  -e WALLET_ADDRESS=YOUR_WALLET_ADDRESS \
  -p 8546:8545 \
  -v whistle-cache-data:/data \
  whistlenet/cache-node:latest
```

### 3. Set Up Systemd Service (Recommended for Servers)

Create the service file:

```bash
sudo nano /etc/systemd/system/whistle-cache-node.service
```

Paste this content (replace `YOUR_WALLET_ADDRESS`):

```ini
[Unit]
Description=WHISTLE Cache Node - Earn SOL
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
Environment="WALLET_ADDRESS=YOUR_WALLET_ADDRESS"
Environment="NODE_PORT=8546"
Environment="CONTAINER_NAME=whistle-cache"
Environment="IMAGE_NAME=whistlenet/cache-node:latest"

ExecStartPre=-/usr/bin/docker stop ${CONTAINER_NAME}
ExecStartPre=-/usr/bin/docker rm ${CONTAINER_NAME}
ExecStartPre=/usr/bin/docker pull ${IMAGE_NAME}

ExecStart=/usr/bin/docker run \
    --name ${CONTAINER_NAME} \
    --rm \
    -e WALLET_ADDRESS=${WALLET_ADDRESS} \
    -p ${NODE_PORT}:8545 \
    -v whistle-cache-data:/data \
    ${IMAGE_NAME}

ExecStop=/usr/bin/docker stop -t 30 ${CONTAINER_NAME}

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable whistle-cache-node
sudo systemctl start whistle-cache-node

# Check status
sudo systemctl status whistle-cache-node

# View logs
journalctl -u whistle-cache-node -f
```

---

## 📊 Monitoring Your Node

### Health Check
```bash
curl http://localhost:8546/health
```

### View Metrics
```bash
curl http://localhost:8546/metrics
```

### Container Logs
```bash
docker logs -f whistle-cache
```

### Check Earnings
Visit: https://provider.whistle.ninja

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WALLET_ADDRESS` | Required | Your Solana wallet for earnings |
| `NODE_PORT` | 8546 | Port to expose the cache node |
| `PRIMARY_RPC` | auto | Custom Solana RPC endpoint |

### Firewall Configuration

If running a public-facing node:

```bash
# UFW (Ubuntu)
sudo ufw allow 8546/tcp

# firewalld (CentOS/Fedora)
sudo firewall-cmd --permanent --add-port=8546/tcp
sudo firewall-cmd --reload
```

---

## 🛠️ Building from Source

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- Docker (for running the cache node)
- Build tools: `build-essential`, `python3`

### Build Steps

```bash
# Clone the repository
git clone https://github.com/DylanPort/whitelspace.git
cd whitelspace/whistle-cache-node-app

# Install dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild

# Build Linux packages
npm run build:linux

# Or build specific format
npm run build:linux:appimage
npm run build:linux:deb
npm run build:linux:rpm
```

Build outputs will be in the `dist/` directory.

### Icon Generation

Before building, generate icons:

```bash
# Install ImageMagick if needed
sudo apt-get install imagemagick

# Generate icons
chmod +x scripts/generate-icons.sh
./scripts/generate-icons.sh
```

---

## ❓ Troubleshooting

### AppImage Won't Run

```bash
# Install FUSE (required for AppImages)
sudo apt-get install fuse libfuse2

# Or extract and run directly
./WHISTLE-Cache-Node*.AppImage --appimage-extract
./squashfs-root/whistle-cache-node
```

### Docker Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

### Native Module Errors

```bash
# Rebuild better-sqlite3 for your system
cd whistle-cache-node-app
npm run rebuild
```

### Port Already in Use

```bash
# Find what's using the port
sudo lsof -i :8546

# Use a different port
docker run -d -p 8547:8545 ... whistlenet/cache-node:latest
```

### Service Won't Start

```bash
# Check systemd logs
journalctl -u whistle-cache-node -n 50

# Check Docker directly
docker logs whistle-cache
```

---

## 💰 Earnings

- **Expected earnings**: $50-500/month depending on traffic and uptime
- **Payment**: SOL cryptocurrency
- **Claim**: Visit https://provider.whistle.ninja to claim earnings

---

## 🔗 Links

- **Website**: https://whistle.ninja
- **Dashboard**: https://provider.whistle.ninja
- **Telegram**: https://t.me/whistleninja
- **Twitter**: https://x.com/Whistle_Ninja
- **GitHub**: https://github.com/DylanPort/whitelspace

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Start earning SOL today! 🚀</strong>
</p>

