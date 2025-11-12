# 🔒 Ghost VPN - White-Label Privacy VPN

**A fully open-source, privacy-first VPN solution integrated into Ghost Whistle.**

## 🎯 Features

### Core VPN Features
- ✅ **WireGuard Protocol** - Modern, fast, secure
- ✅ **OpenVPN Support** - Battle-tested compatibility
- ✅ **Shadowsocks** - Censorship circumvention
- ✅ **Protocol Obfuscation** - Disguise VPN traffic
- ✅ **Multi-hop Routing** - Route through multiple servers
- ✅ **Kill Switch** - Automatic disconnect protection
- ✅ **DNS Leak Protection** - Prevent DNS queries from leaking
- ✅ **IPv6 Leak Protection** - Block IPv6 to prevent leaks
- ✅ **Split Tunneling** - Choose which apps use VPN

### Self-Hosted Infrastructure
- ✅ **Multi-Cloud Support** - DigitalOcean, AWS, Vultr, Linode
- ✅ **One-Click Deployment** - Deploy server in 3 minutes
- ✅ **Auto-Configuration** - Automatic client setup
- ✅ **Server Management** - Start/stop/delete from dashboard
- ✅ **Cost Tracking** - Monitor your VPN expenses

### Privacy Features
- ✅ **No Logs** - Your server, your rules
- ✅ **No Registration** - Anonymous by design
- ✅ **No Central Authority** - Fully decentralized
- ✅ **Open Source** - Auditable code
- ✅ **Encrypted Config Storage** - Local config encryption

### Advanced Features
- ✅ **Multi-Device Support** - Up to 10 devices per server
- ✅ **Auto-Reconnect** - Automatic connection recovery
- ✅ **Server Health Monitoring** - Real-time status checks
- ✅ **Bandwidth Monitoring** - Track usage
- ✅ **Location Selection** - 50+ global locations
- ✅ **Custom DNS** - Use your preferred DNS servers

## 🚀 Quick Start

### Deploy Your Server (3 minutes)
```bash
# From Ghost Whistle dashboard
1. Click "Deploy Ghost VPN"
2. Select region (e.g., New York)
3. Choose protocol (WireGuard recommended)
4. Enter cloud provider API key
5. Click "Deploy" - done!
```

### Connect Your Device
```bash
# Automatic (recommended)
- Download Ghost VPN client
- Scan QR code from dashboard
- Connected!

# Manual
- Download WireGuard config
- Import into WireGuard app
- Connect
```

## 📦 Installation

### Web Client (Integrated)
Already included in Ghost Whistle platform.

### Desktop App (Optional)
```bash
# Windows
Download Ghost-VPN-Setup.exe

# macOS
Download Ghost-VPN.dmg

# Linux
wget https://whistle.ninja/ghost-vpn.AppImage
chmod +x ghost-vpn.AppImage
./ghost-vpn.AppImage
```

### Mobile Apps
```bash
# Android
Download from GitHub releases or use WireGuard app

# iOS
Use WireGuard app (QR code import)
```

## 🔧 Configuration

### Supported Cloud Providers
- **DigitalOcean** - $5/month (recommended)
- **Vultr** - $5/month
- **Linode** - $5/month
- **AWS Lightsail** - $3.50/month
- **Hetzner** - €3.50/month (~$4/month)

### Supported Protocols
1. **WireGuard** - Fastest, most secure (recommended)
2. **OpenVPN** - Maximum compatibility
3. **Shadowsocks** - Best for censorship circumvention
4. **IKEv2** - Great for mobile (auto-reconnect)

### Server Locations (50+)
- 🇺🇸 USA (7 regions)
- 🇬🇧 UK (London)
- 🇩🇪 Germany (Frankfurt)
- 🇳🇱 Netherlands (Amsterdam)
- 🇸🇬 Singapore
- 🇯🇵 Japan (Tokyo)
- 🇦🇺 Australia (Sydney)
- 🇨🇦 Canada (Toronto)
- 🇮🇳 India (Bangalore)
- 🇧🇷 Brazil (São Paulo)
- And 40+ more...

## 🏗️ Architecture

### Frontend Stack
- **Web**: React + WebAssembly (WireGuard)
- **Desktop**: Electron + Native Node modules
- **Mobile**: React Native + Native VPN APIs

### Backend Stack
- **API**: Netlify Functions (serverless)
- **Database**: Supabase (PostgreSQL)
- **VPN Server**: Docker containers
- **Orchestration**: Terraform + Ansible

### VPN Stack
- **WireGuard**: wireguard-go (cross-platform)
- **OpenVPN**: openvpn3
- **Shadowsocks**: shadowsocks-libev
- **Obfuscation**: obfs4proxy

## 🔒 Security

### Cryptography
- **WireGuard**: ChaCha20Poly1305 + Curve25519
- **OpenVPN**: AES-256-GCM + RSA-4096
- **Key Exchange**: Diffie-Hellman
- **Forward Secrecy**: ✅ Enabled

### Privacy
- **No Logs**: Configured with no-log policy
- **RAM-Only**: Logs written to /dev/null
- **Anonymous**: No email/registration required
- **Open Source**: Fully auditable

### Leak Protection
- **DNS Leaks**: Blocked (uses 1.1.1.1 or custom)
- **IPv6 Leaks**: Disabled by default
- **WebRTC Leaks**: Blocked in browser extension
- **Kill Switch**: Active by default

## 📊 Pricing

### Self-Hosted (Your Own Server)
- **Server Cost**: $3.50-$5/month (cloud provider)
- **Ghost VPN Software**: FREE (open source)
- **Total**: ~$5/month for unlimited devices & bandwidth

### Managed (Coming Soon)
- **Starter**: $8/month - We manage your server
- **Pro**: $15/month - Multi-hop + priority support
- **Enterprise**: Custom - Dedicated infrastructure

## 🛠️ Development

### Build from Source
```bash
# Clone repo
git clone https://github.com/your-org/ghost-vpn.git
cd ghost-vpn

# Install dependencies
npm install

# Build web client
npm run build:web

# Build desktop app
npm run build:desktop

# Build mobile apps
npm run build:android
npm run build:ios
```

### Project Structure
```
ghost-vpn/
├── packages/
│   ├── web/          # Browser extension + WebApp
│   ├── desktop/      # Electron app
│   ├── mobile/       # React Native app
│   ├── core/         # Shared VPN logic
│   └── server/       # Server deployment scripts
├── functions/        # Netlify serverless functions
├── terraform/        # Infrastructure as code
└── docs/            # Documentation
```

## 🤝 Contributing

Ghost VPN is open source! Contributions welcome.

### Areas to Contribute
- Add more cloud providers
- Improve protocol implementations
- Add new features
- Fix bugs
- Improve documentation

## 📄 License

**MIT License** - Free to use, modify, distribute

## 🔗 Links

- **Website**: https://whistle.ninja
- **GitHub**: https://github.com/your-org/ghost-vpn
- **Discord**: https://discord.gg/ghostwhistle
- **Documentation**: https://docs.whistle.ninja/ghost-vpn

## ⚠️ Disclaimer

Ghost VPN is a privacy tool. Use responsibly and in accordance with local laws.

---

**Built with ❤️ by the Ghost Whistle team**

