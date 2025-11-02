# 🚀 Build Node Runner Executables NOW - 5 Minutes

Quick guide to build Linux, Windows, and macOS executables immediately.

---

## 🎯 Option 1: One Command Build (Fastest)

### Linux/macOS:
```bash
npm install && npm run build:node-runner
```

### Windows (PowerShell):
```powershell
npm install; npm run build:node-runner
```

**Result**: All 3 executables in `./dist/` folder!

---

## 🎯 Option 2: Use Build Scripts

### Linux/macOS:
```bash
chmod +x build-node-runner.sh
./build-node-runner.sh
```

### Windows:
```cmd
build-node-runner.bat
```

**Follow the menu** to choose which platform to build.

---

## 🎯 Option 3: Build Individually

### Linux only:
```bash
npm install
npm run build:linux
```

### Windows only:
```bash
npm install
npm run build:windows
```

### macOS only:
```bash
npm install
npm run build:macos
```

---

## 📂 Where are the files?

After building, check the `./dist/` directory:

```bash
ls -lh dist/

# You should see:
# ghost-node-runner-linux       (~40-50 MB)
# ghost-node-runner-win.exe     (~40-50 MB)
# ghost-node-runner-macos       (~40-50 MB)
```

---

## 🧪 Test the Executable

### Linux:
```bash
chmod +x dist/ghost-node-runner-linux
./dist/ghost-node-runner-linux
```

### Windows:
```cmd
dist\ghost-node-runner-win.exe
```

### macOS:
```bash
chmod +x dist/ghost-node-runner-macos
./dist/ghost-node-runner-macos
```

You should see the node starting up with the Ghost Whistle banner!

---

## 📤 Upload to GitHub Releases

### 1. Create a new release on GitHub:
   - Go to your repository
   - Click "Releases" → "Create a new release"
   - Tag: `v1.0.0`
   - Title: `Ghost Whistle Node Runner v1.0.0`

### 2. Upload the files from `./dist/`:
   - Drag and drop all 3 executables
   - Add release notes

### 3. Publish the release

### 4. Get download links:
```
https://github.com/YOUR-USERNAME/REPO-NAME/releases/download/v1.0.0/ghost-node-runner-linux
https://github.com/YOUR-USERNAME/REPO-NAME/releases/download/v1.0.0/ghost-node-runner-win.exe
https://github.com/YOUR-USERNAME/REPO-NAME/releases/download/v1.0.0/ghost-node-runner-macos
```

---

## 🐛 Common Issues

### "pkg: command not found"
```bash
npm install -g pkg
```

Or just use the npm scripts (they install pkg locally):
```bash
npm run build:linux
```

### "Permission denied" on Linux/macOS
```bash
chmod +x build-node-runner.sh
chmod +x dist/ghost-node-runner-linux
```

### Build takes too long
This is normal! First build takes 5-10 minutes to download Node.js binaries.
Subsequent builds are much faster (1-2 minutes).

---

## 💡 Pro Tips

### Build faster by targeting only one platform:
```bash
npm run build:linux     # Only Linux (~2 minutes)
npm run build:windows   # Only Windows (~2 minutes)
npm run build:macos     # Only macOS (~2 minutes)
```

### Reduce file size:
The executables are large (~40-50 MB) because they include the entire Node.js runtime.
This is normal and necessary for standalone executables.

### Cross-compile:
You can build for any platform from any machine! 
- Build Windows .exe from Linux ✅
- Build Linux binary from Windows ✅
- Build macOS binary from Linux/Windows ✅

---

## 🎉 Done!

You now have standalone executables that users can download and run without installing Node.js!

**Next steps:**
1. Test the executables
2. Upload to GitHub Releases
3. Share download links with users
4. Update your documentation

---

## 📋 Quick Reference

| Command | Description |
|---------|-------------|
| `npm run build:node-runner` | Build all platforms |
| `npm run build:linux` | Build Linux only |
| `npm run build:windows` | Build Windows only |
| `npm run build:macos` | Build macOS only |
| `./dist/ghost-node-runner-linux` | Run Linux executable |
| `dist\ghost-node-runner-win.exe` | Run Windows executable |
| `./dist/ghost-node-runner-macos` | Run macOS executable |

---

**Questions?** See `NODE-RUNNER-BUILD-GUIDE.md` for detailed documentation.

