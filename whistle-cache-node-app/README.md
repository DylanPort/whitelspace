# WHISTLE Cache Node

A standalone desktop application to run a WHISTLE cache node and earn SOL by serving RPC requests.

## Features

- 🖥️ **Cross-platform** - Works on Windows, macOS, and Linux
- 💰 **Earn SOL** - Get 70% of query fees for cache hits
- 📊 **Real-time metrics** - Track your earnings, cache hits, and performance
- 🔄 **Auto-start** - Optionally start the node when the app opens
- 🔔 **System tray** - Minimize to tray and keep running in the background
- 💾 **Persistent cache** - SQLite-based disk cache survives restarts
- 🐳 **Docker support** - Run headless on servers

## Quick Start (Fastest Way)

### Docker One-Liner (Any Platform)
```bash
docker run -d --name whistle-cache -e WALLET_ADDRESS=YOUR_WALLET -p 8546:8545 --restart unless-stopped whistlenet/cache-node:latest
```

## Installation

### Windows
Download and run `WHISTLE-Cache-Node-Setup-x.x.x.exe`

### macOS
Download and open `WHISTLE-Cache-Node-x.x.x.dmg`, then drag to Applications

### Linux

See [LINUX-README.md](LINUX-README.md) for detailed Linux instructions.

**Quick options:**

1. **AppImage (Universal)**
```bash
wget https://github.com/DylanPort/whitelspace/releases/latest/download/WHISTLE-Cache-Node-1.0.0-linux-x64.AppImage
chmod +x WHISTLE-Cache-Node-1.0.0-linux-x64.AppImage
./WHISTLE-Cache-Node-1.0.0-linux-x64.AppImage
```

2. **Ubuntu/Debian (.deb)**
```bash
wget https://github.com/DylanPort/whitelspace/releases/latest/download/WHISTLE-Cache-Node-1.0.0-linux-x64.deb
sudo dpkg -i WHISTLE-Cache-Node-1.0.0-linux-x64.deb
```

3. **Fedora/CentOS (.rpm)**
```bash
wget https://github.com/DylanPort/whitelspace/releases/latest/download/WHISTLE-Cache-Node-1.0.0-linux-x64.rpm
sudo rpm -i WHISTLE-Cache-Node-1.0.0-linux-x64.rpm
```

4. **Docker (Headless Servers)**
```bash
# Quick start script
curl -fsSL https://raw.githubusercontent.com/DylanPort/whitelspace/main/CACHE-NODE-EASY.sh | bash
```

5. **Systemd Service** (for production servers)
See `linux/whistle-cache-node.service` for systemd configuration.

## Building from Source

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or yarn
- Build tools (Linux: `build-essential python3`)

### Build Steps

```bash
# Install dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild

# Run in development mode
npm start

# Build for all platforms
npm run build

# Build for specific platform
npm run build:win    # Windows (.exe installer)
npm run build:mac    # macOS (.dmg)
npm run build:linux  # Linux (AppImage, .deb, .rpm, .tar.gz)

# Build specific Linux format
npm run build:linux:appimage
npm run build:linux:deb
npm run build:linux:rpm
npm run build:linux:tar
```

### Linux Build (using Makefile)
```bash
make install    # Install dependencies
make icons      # Generate icon files
make build      # Build all Linux packages
```

## Configuration

1. **Wallet Address** - Your Solana wallet to receive earnings
2. **Node Port** - Port for the cache node (default: 8545)
3. **Primary RPC** - Fallback RPC for cache misses
4. **Auto-start** - Start node when app opens
5. **Minimize to Tray** - Keep running in background

## How It Works

1. Your node caches Solana RPC responses locally
2. When a request comes in, check cache first
3. Cache hit = instant response + you earn SOL
4. Cache miss = forward to RPC and cache the result

## Earnings

- **70%** of query fees go to the node operator (you)
- **20%** to the bonus pool for top performers
- **5%** to treasury
- **5%** to stakers

Each cache hit earns approximately **0.00007 SOL** (70% of 0.0001 SOL query fee).

## Support

- Website: https://whistle.ninja
- Telegram: https://t.me/whistleninja
- Twitter: https://x.com/Whistle_Ninja

## License

MIT

