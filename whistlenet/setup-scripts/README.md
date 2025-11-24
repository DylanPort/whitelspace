# WHISTLE Cache Node - Multi-Platform Setup Scripts

Complete setup scripts for Windows, macOS, and Linux with automatic Docker installation and node configuration.

## 🚀 Quick Start (One-Line Install)

### Universal Installer (Auto-Detects OS)
```bash
curl -sSL https://whistle.network/install | bash
```

## 📦 Platform-Specific Installation

### Windows
Run in **PowerShell as Administrator**:
```powershell
# Method 1: Direct execution
iwr -useb https://whistle.network/install-windows.ps1 | iex

# Method 2: Download and run
Invoke-WebRequest -Uri "https://whistle.network/install-windows.ps1" -OutFile "install.ps1"
Set-ExecutionPolicy Bypass -Scope Process -Force
.\install.ps1
```

### macOS
Run in **Terminal**:
```bash
# Method 1: Direct execution
curl -sSL https://whistle.network/install-mac.sh | bash

# Method 2: Download and run
curl -O https://whistle.network/install-mac.sh
chmod +x install-mac.sh
./install-mac.sh
```

### Linux
Run in **Terminal**:
```bash
# Method 1: Direct execution
curl -sSL https://whistle.network/install-linux.sh | bash

# Method 2: Download and run
wget https://whistle.network/install-linux.sh
chmod +x install-linux.sh
./install-linux.sh
```

## 🎯 What the Scripts Do

### All Platforms:
1. **Check/Install Docker** - Automatically installs Docker if not present
2. **Configure Wallet** - Prompts for your Solana wallet address
3. **Select Location** - Choose geographic region for optimal performance
4. **Start Node** - Launches the cache node container
5. **Setup Monitoring** - Creates convenient commands for node management

### Platform-Specific Features:

#### Windows
- Installs Docker Desktop via Chocolatey or direct download
- Creates desktop shortcut for monitoring
- PowerShell aliases for management
- Automatic Windows Firewall configuration

#### macOS
- Installs Docker Desktop via Homebrew or direct download
- Creates shell aliases (zsh/bash)
- LaunchAgent for auto-start on boot
- Native macOS notifications support

#### Linux
- Supports all major distributions (Ubuntu, Debian, Fedora, CentOS, Arch)
- Systemd service for auto-start
- Firewall configuration (UFW/firewalld)
- Global `whistle-node` command
- Automatic log rotation

## 📋 System Requirements

### Minimum:
- **CPU**: 1 core
- **RAM**: 2GB
- **Storage**: 10GB
- **Network**: 10 Mbps
- **OS**: Windows 10+, macOS 10.14+, Linux (kernel 3.10+)

### Recommended:
- **CPU**: 2+ cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Network**: 100 Mbps

## 🛠️ Manual Docker Installation

If the automatic installation fails, install Docker manually:

### Windows
1. Download [Docker Desktop](https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe)
2. Run installer and restart computer
3. Start Docker Desktop
4. Run the setup script again

### macOS
```bash
# Using Homebrew
brew install --cask docker

# Or download from Docker website
open https://desktop.docker.com/mac/stable/Docker.dmg
```

### Linux (Ubuntu/Debian)
```bash
# Official Docker installation
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in
```

## 💻 Management Commands

### After Installation:

#### Windows (PowerShell)
```powershell
# View logs
docker logs whistle-cache -f

# Check status
docker ps --filter "name=whistle-cache"

# Stop node
docker stop whistle-cache

# Start node
docker start whistle-cache

# Check earnings
curl http://localhost:8545/metrics
```

#### macOS (Terminal)
```bash
# If aliases were installed:
whistle-logs    # View live logs
whistle-stats   # Check metrics
whistle-stop    # Stop node
whistle-start   # Start node
whistle-restart # Restart node
```

#### Linux (Terminal)
```bash
# If whistle-node command was installed:
whistle-node logs     # View live logs
whistle-node stats    # Check metrics
whistle-node stop     # Stop node
whistle-node start    # Start node
whistle-node status   # Show status
whistle-node earnings # Show earnings
```

## 🔧 Troubleshooting

### Docker Not Starting

#### Windows
1. Enable virtualization in BIOS
2. Enable Hyper-V: `Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All`
3. Restart computer

#### macOS
1. Check System Preferences → Security & Privacy
2. Allow Docker to run
3. Restart Docker Desktop

#### Linux
```bash
# Check Docker service
sudo systemctl status docker

# Start Docker
sudo systemctl start docker

# Enable on boot
sudo systemctl enable docker
```

### Port 8545 Already in Use
```bash
# Find process using port
# Windows
netstat -ano | findstr :8545

# macOS/Linux
lsof -i :8545

# Change port in docker run command
-p 8546:8545  # Use 8546 instead
```

### Permission Denied

#### Linux/macOS
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply changes
newgrp docker
# Or log out and back in
```

### Container Not Starting
```bash
# Check logs
docker logs whistle-cache

# Remove and recreate
docker rm whistle-cache
# Run setup script again
```

## 📊 Monitoring Your Node

### Check if Running
```bash
docker ps --filter "name=whistle-cache"
```

### View Real-Time Logs
```bash
docker logs whistle-cache -f
```

### Check Metrics
```bash
curl http://localhost:8545/metrics
```

### Expected Output
```json
{
  "cacheHits": 15234,
  "cacheMisses": 2341,
  "totalRequests": 17575,
  "hitRate": "86.69%",
  "totalEarnings": 1.066,
  "uptime": 3600000,
  "avgResponseTime": 5
}
```

## 🔄 Updating Your Node

### Automatic Update
```bash
docker pull whistlenet/cache-node:latest
docker stop whistle-cache
docker rm whistle-cache
# Run setup script again
```

### Manual Update
```bash
# Pull latest image
docker pull whistlenet/cache-node:latest

# Recreate container
docker stop whistle-cache
docker rm whistle-cache
docker run -d \
  --name whistle-cache \
  -e WALLET_ADDRESS=YOUR_WALLET \
  -e NODE_LOCATION=YOUR_LOCATION \
  -p 8545:8545 \
  --restart unless-stopped \
  whistlenet/cache-node:latest
```

## 🛡️ Security Considerations

1. **Firewall**: Only port 8545 needs to be accessible
2. **Updates**: Keep Docker and the node image updated
3. **Wallet**: Never share your private keys
4. **Monitoring**: Regularly check logs for issues

## 💰 Earnings

- **Per Cache Hit**: 0.00007 SOL (70% of 0.0001 SOL query cost)
- **Daily Average**: 0.7-3.5 SOL (10k-50k hits)
- **Monthly Average**: 21-105 SOL

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [WHISTLE Network Docs](https://docs.whistle.network)
- [Provider Dashboard](https://whistle.network/provider)
- [Support Discord](https://discord.gg/whistle)

## ❓ FAQ

**Q: Can I run multiple nodes?**
A: Yes, but each needs a unique port and container name.

**Q: How do I change my wallet address?**
A: Stop the node, remove it, and run the setup script again.

**Q: Is my wallet safe?**
A: Yes, only your public address is used. Never share private keys.

**Q: Can I run on a Raspberry Pi?**
A: Yes, use the Linux installer. ARM architecture is supported.

**Q: How do I claim earnings?**
A: Visit the [Provider Dashboard](https://whistle.network/provider) and click "Claim Earnings".


Complete setup scripts for Windows, macOS, and Linux with automatic Docker installation and node configuration.

## 🚀 Quick Start (One-Line Install)

### Universal Installer (Auto-Detects OS)
```bash
curl -sSL https://whistle.network/install | bash
```

## 📦 Platform-Specific Installation

### Windows
Run in **PowerShell as Administrator**:
```powershell
# Method 1: Direct execution
iwr -useb https://whistle.network/install-windows.ps1 | iex

# Method 2: Download and run
Invoke-WebRequest -Uri "https://whistle.network/install-windows.ps1" -OutFile "install.ps1"
Set-ExecutionPolicy Bypass -Scope Process -Force
.\install.ps1
```

### macOS
Run in **Terminal**:
```bash
# Method 1: Direct execution
curl -sSL https://whistle.network/install-mac.sh | bash

# Method 2: Download and run
curl -O https://whistle.network/install-mac.sh
chmod +x install-mac.sh
./install-mac.sh
```

### Linux
Run in **Terminal**:
```bash
# Method 1: Direct execution
curl -sSL https://whistle.network/install-linux.sh | bash

# Method 2: Download and run
wget https://whistle.network/install-linux.sh
chmod +x install-linux.sh
./install-linux.sh
```

## 🎯 What the Scripts Do

### All Platforms:
1. **Check/Install Docker** - Automatically installs Docker if not present
2. **Configure Wallet** - Prompts for your Solana wallet address
3. **Select Location** - Choose geographic region for optimal performance
4. **Start Node** - Launches the cache node container
5. **Setup Monitoring** - Creates convenient commands for node management

### Platform-Specific Features:

#### Windows
- Installs Docker Desktop via Chocolatey or direct download
- Creates desktop shortcut for monitoring
- PowerShell aliases for management
- Automatic Windows Firewall configuration

#### macOS
- Installs Docker Desktop via Homebrew or direct download
- Creates shell aliases (zsh/bash)
- LaunchAgent for auto-start on boot
- Native macOS notifications support

#### Linux
- Supports all major distributions (Ubuntu, Debian, Fedora, CentOS, Arch)
- Systemd service for auto-start
- Firewall configuration (UFW/firewalld)
- Global `whistle-node` command
- Automatic log rotation

## 📋 System Requirements

### Minimum:
- **CPU**: 1 core
- **RAM**: 2GB
- **Storage**: 10GB
- **Network**: 10 Mbps
- **OS**: Windows 10+, macOS 10.14+, Linux (kernel 3.10+)

### Recommended:
- **CPU**: 2+ cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Network**: 100 Mbps

## 🛠️ Manual Docker Installation

If the automatic installation fails, install Docker manually:

### Windows
1. Download [Docker Desktop](https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe)
2. Run installer and restart computer
3. Start Docker Desktop
4. Run the setup script again

### macOS
```bash
# Using Homebrew
brew install --cask docker

# Or download from Docker website
open https://desktop.docker.com/mac/stable/Docker.dmg
```

### Linux (Ubuntu/Debian)
```bash
# Official Docker installation
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in
```

## 💻 Management Commands

### After Installation:

#### Windows (PowerShell)
```powershell
# View logs
docker logs whistle-cache -f

# Check status
docker ps --filter "name=whistle-cache"

# Stop node
docker stop whistle-cache

# Start node
docker start whistle-cache

# Check earnings
curl http://localhost:8545/metrics
```

#### macOS (Terminal)
```bash
# If aliases were installed:
whistle-logs    # View live logs
whistle-stats   # Check metrics
whistle-stop    # Stop node
whistle-start   # Start node
whistle-restart # Restart node
```

#### Linux (Terminal)
```bash
# If whistle-node command was installed:
whistle-node logs     # View live logs
whistle-node stats    # Check metrics
whistle-node stop     # Stop node
whistle-node start    # Start node
whistle-node status   # Show status
whistle-node earnings # Show earnings
```

## 🔧 Troubleshooting

### Docker Not Starting

#### Windows
1. Enable virtualization in BIOS
2. Enable Hyper-V: `Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All`
3. Restart computer

#### macOS
1. Check System Preferences → Security & Privacy
2. Allow Docker to run
3. Restart Docker Desktop

#### Linux
```bash
# Check Docker service
sudo systemctl status docker

# Start Docker
sudo systemctl start docker

# Enable on boot
sudo systemctl enable docker
```

### Port 8545 Already in Use
```bash
# Find process using port
# Windows
netstat -ano | findstr :8545

# macOS/Linux
lsof -i :8545

# Change port in docker run command
-p 8546:8545  # Use 8546 instead
```

### Permission Denied

#### Linux/macOS
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply changes
newgrp docker
# Or log out and back in
```

### Container Not Starting
```bash
# Check logs
docker logs whistle-cache

# Remove and recreate
docker rm whistle-cache
# Run setup script again
```

## 📊 Monitoring Your Node

### Check if Running
```bash
docker ps --filter "name=whistle-cache"
```

### View Real-Time Logs
```bash
docker logs whistle-cache -f
```

### Check Metrics
```bash
curl http://localhost:8545/metrics
```

### Expected Output
```json
{
  "cacheHits": 15234,
  "cacheMisses": 2341,
  "totalRequests": 17575,
  "hitRate": "86.69%",
  "totalEarnings": 1.066,
  "uptime": 3600000,
  "avgResponseTime": 5
}
```

## 🔄 Updating Your Node

### Automatic Update
```bash
docker pull whistlenet/cache-node:latest
docker stop whistle-cache
docker rm whistle-cache
# Run setup script again
```

### Manual Update
```bash
# Pull latest image
docker pull whistlenet/cache-node:latest

# Recreate container
docker stop whistle-cache
docker rm whistle-cache
docker run -d \
  --name whistle-cache \
  -e WALLET_ADDRESS=YOUR_WALLET \
  -e NODE_LOCATION=YOUR_LOCATION \
  -p 8545:8545 \
  --restart unless-stopped \
  whistlenet/cache-node:latest
```

## 🛡️ Security Considerations

1. **Firewall**: Only port 8545 needs to be accessible
2. **Updates**: Keep Docker and the node image updated
3. **Wallet**: Never share your private keys
4. **Monitoring**: Regularly check logs for issues

## 💰 Earnings

- **Per Cache Hit**: 0.00007 SOL (70% of 0.0001 SOL query cost)
- **Daily Average**: 0.7-3.5 SOL (10k-50k hits)
- **Monthly Average**: 21-105 SOL

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [WHISTLE Network Docs](https://docs.whistle.network)
- [Provider Dashboard](https://whistle.network/provider)
- [Support Discord](https://discord.gg/whistle)

## ❓ FAQ

**Q: Can I run multiple nodes?**
A: Yes, but each needs a unique port and container name.

**Q: How do I change my wallet address?**
A: Stop the node, remove it, and run the setup script again.

**Q: Is my wallet safe?**
A: Yes, only your public address is used. Never share private keys.

**Q: Can I run on a Raspberry Pi?**
A: Yes, use the Linux installer. ARM architecture is supported.

**Q: How do I claim earnings?**
A: Visit the [Provider Dashboard](https://whistle.network/provider) and click "Claim Earnings".
