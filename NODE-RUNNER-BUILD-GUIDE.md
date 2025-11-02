# 🚀 Ghost Whistle Node Runner - Build Guide

Create standalone executables for your node runners (Linux, Windows, macOS) so users don't need Node.js installed!

---

## 📦 What Gets Built

- **Linux**: `ghost-node-runner-linux` (~40-50 MB)
- **Windows**: `ghost-node-runner-win.exe` (~40-50 MB)
- **macOS**: `ghost-node-runner-macos` (~40-50 MB)

All executables are standalone - no Node.js installation required!

---

## 🛠️ Quick Start

### Option 1: Use Build Script (Recommended)

**Linux/macOS:**
```bash
chmod +x build-node-runner.sh
./build-node-runner.sh
```

**Windows:**
```cmd
build-node-runner.bat
```

### Option 2: Manual Build

```bash
# Install dependencies
npm install

# Build for Linux only
npm run build:linux

# Build for Windows only
npm run build:windows

# Build for macOS only
npm run build:macos

# Build for all platforms
npm run build:node-runner
```

---

## 📂 Output Files

After building, you'll find executables in the `./dist/` directory:

```
dist/
├── ghost-node-runner-linux          # Linux executable
├── ghost-node-runner-win.exe        # Windows executable
└── ghost-node-runner-macos          # macOS executable
```

---

## 🚀 How Users Run the Executables

### Linux:
```bash
# Make executable
chmod +x ghost-node-runner-linux

# Run the node
./ghost-node-runner-linux
```

### Windows:
```cmd
# Just double-click or run from command line
ghost-node-runner-win.exe
```

### macOS:
```bash
# Make executable
chmod +x ghost-node-runner-macos

# Run the node
./ghost-node-runner-macos
```

---

## 🌍 Environment Variables

Users can configure the node with environment variables:

### Linux/macOS:
```bash
export NODE_ID="my-custom-node"
export NODE_REGION="US-East"
export SIGNALING_SERVER="wss://your-signaling-server.com"
./ghost-node-runner-linux
```

### Windows:
```cmd
set NODE_ID=my-custom-node
set NODE_REGION=US-East
set SIGNALING_SERVER=wss://your-signaling-server.com
ghost-node-runner-win.exe
```

---

## 📤 Distribution Options

### Option 1: GitHub Releases (Best for Public)

1. Build all executables
2. Create a new GitHub release
3. Upload the binaries from `./dist/`
4. Users download directly from GitHub

**Example:**
```
https://github.com/yourusername/ghost-whistle/releases/download/v1.0.0/ghost-node-runner-linux
https://github.com/yourusername/ghost-whistle/releases/download/v1.0.0/ghost-node-runner-win.exe
https://github.com/yourusername/ghost-whistle/releases/download/v1.0.0/ghost-node-runner-macos
```

### Option 2: Your Website

Upload to your server and provide download links:

```html
<a href="/downloads/ghost-node-runner-linux">Download for Linux</a>
<a href="/downloads/ghost-node-runner-win.exe">Download for Windows</a>
<a href="/downloads/ghost-node-runner-macos">Download for macOS</a>
```

### Option 3: Cloud Storage (Google Drive, Dropbox)

1. Upload binaries to cloud storage
2. Get shareable links
3. Share with users

---

## 🔧 Customization

### Change the Node Type

Edit `user-node-client.js` before building to customize:

```javascript
// Change default values
const NODE_ID = process.env.NODE_ID || `custom-node-${Date.now()}`;
const NODE_REGION = process.env.NODE_REGION || 'Custom-Region';
const SIGNALING_SERVER = process.env.SIGNALING_SERVER || 'wss://your-server.com';
```

Then rebuild:
```bash
npm run build:linux
```

### Add Auto-Configuration

Create a config file that the executable reads:

```javascript
// In user-node-client.js
const fs = require('fs');
const config = fs.existsSync('./config.json') 
  ? JSON.parse(fs.readFileSync('./config.json')) 
  : {};

const NODE_ID = config.nodeId || process.env.NODE_ID || `node-${Date.now()}`;
```

---

## 📋 Complete Build & Deploy Workflow

```bash
# 1. Install dependencies
npm install

# 2. Build all platforms
npm run build:node-runner

# 3. Test the executables
./dist/ghost-node-runner-linux  # On Linux
./dist/ghost-node-runner-win.exe  # On Windows
./dist/ghost-node-runner-macos    # On macOS

# 4. Upload to GitHub Releases or your server

# 5. Update download page with links
```

---

## 🐛 Troubleshooting

### "Permission denied" on Linux/macOS

```bash
chmod +x ghost-node-runner-linux
```

### "pkg command not found"

```bash
npm install -g pkg
# Or use the npm script:
npm run build:linux
```

### Executable is too large

The executables include Node.js runtime and all dependencies. This is normal (~40-50 MB).

### Native modules not working

Some native Node.js modules may not work with pkg. If you encounter issues:
- Check pkg compatibility: https://github.com/vercel/pkg#native-modules
- Consider using Docker instead for complex dependencies

---

## 🔒 Security Notes

1. **Sign your executables** (especially for macOS and Windows)
   - macOS: Use `codesign`
   - Windows: Use `signtool`

2. **Provide checksums** for verification:
   ```bash
   sha256sum ghost-node-runner-linux > checksums.txt
   sha256sum ghost-node-runner-win.exe >> checksums.txt
   sha256sum ghost-node-runner-macos >> checksums.txt
   ```

3. **Keep dependencies updated**:
   ```bash
   npm audit fix
   npm update
   ```

---

## 📊 File Size Comparison

| Platform | Size | Notes |
|----------|------|-------|
| Linux | ~40-50 MB | Includes Node.js 18 runtime |
| Windows | ~40-50 MB | Includes Node.js 18 runtime |
| macOS | ~40-50 MB | Includes Node.js 18 runtime |

**vs. Source code:** ~10 MB (but requires Node.js installed)

---

## 🎯 Advanced: Auto-Update

To add auto-update functionality:

1. Host a version file:
   ```json
   {
     "version": "1.0.1",
     "downloadUrl": "https://github.com/yourrepo/releases/download/v1.0.1/"
   }
   ```

2. Add version check to `user-node-client.js`:
   ```javascript
   const currentVersion = "1.0.0";
   // Check for updates on startup
   ```

3. Notify users when updates are available

---

## 📦 Multi-Platform Build Matrix

Build on GitHub Actions for all platforms automatically:

```yaml
# .github/workflows/build.yml
name: Build Node Runner
on: [push, release]

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build:node-runner
      - uses: actions/upload-artifact@v3
        with:
          name: executables
          path: dist/
```

---

## 🔗 Useful Links

- **pkg documentation**: https://github.com/vercel/pkg
- **Node.js releases**: https://nodejs.org/en/download/
- **Electron Builder** (alternative): https://www.electron.build/

---

## ✅ Checklist

- [ ] Install Node.js and npm
- [ ] Clone repository
- [ ] Run `npm install`
- [ ] Build executables with build script
- [ ] Test executables on each platform
- [ ] Upload to distribution platform
- [ ] Update download links
- [ ] Provide checksums for verification
- [ ] (Optional) Sign executables
- [ ] (Optional) Set up auto-update mechanism

---

## 🎉 You're Done!

Your users can now download and run Ghost Whistle nodes without installing Node.js!

**Questions?** Check the main README.md or open an issue.

