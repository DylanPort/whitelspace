# 🧪 How to Test Ghost Whistle Desktop Locally

## Quick Overview

You need to test 2 things:
1. **Website download button** → Opens download page correctly
2. **Desktop software** → Runs and works properly

---

## Part 1: Test the Website Download Button

### Option A: Using Existing Local Server

If your local server is already running:

```bash
# If server.js is running on port 8080
# Just open your browser and go to:
http://localhost:8080/

# Navigate to Ghost Whistle section
# Click "Download Desktop" button
# Should open: http://localhost:8080/download-desktop.html
```

### Option B: Start Fresh Local Server

```bash
# In your main project directory (Encrypto)
node server.js

# Then open browser:
http://localhost:8080/
```

### What to Check:
- ✅ Download button appears in Ghost Whistle section
- ✅ Clicking it opens `download-desktop.html`
- ✅ Download page shows all 3 platforms (Windows/Mac/Linux)
- ✅ Clicking each platform shows build instructions
- ✅ Modal opens and closes correctly

---

## Part 2: Test the Desktop Software

### Quick Test (Development Mode)

**Best for testing - no building required!**

```bash
# 1. Navigate to desktop project
cd ghost-whistle-desktop

# 2. Install dependencies (first time only)
npm install

# 3. Run in development mode
npm run dev
```

**What happens:**
- Electron window opens immediately
- App runs without building executable
- Hot reload for quick testing
- Console shows debug output

### What to Test in Dev Mode:

#### Test 1: Window Opens
- ✅ App window appears
- ✅ Shows "Ghost Whistle Desktop" title
- ✅ Dashboard is visible
- ✅ Settings button works

#### Test 2: Settings
1. Click "Settings" button
2. Enter a test wallet address (any Solana address)
3. Toggle auto-start, minimize, notifications
4. Click "Save Settings"
5. Go back to Dashboard
6. Settings should persist

#### Test 3: Node Operations
1. Make sure settings have a wallet address
2. Click "START NODE" button
3. Watch for:
   - ✅ Status changes to "ACTIVE & EARNING" 🟢
   - ✅ Uptime counter starts
   - ✅ Stats update in real-time
4. Click "STOP NODE"
5. Status should go back to OFFLINE

#### Test 4: System Tray
1. Minimize the window (close button)
2. ✅ App should minimize to system tray (not quit)
3. Look for tray icon in:
   - **Windows**: System tray (bottom right)
   - **macOS**: Menu bar (top right)
   - **Linux**: System tray area
4. Right-click tray icon
5. ✅ Context menu appears
6. Click "Show Dashboard"
7. ✅ Window reopens

#### Test 5: Console Logs

In the terminal where you ran `npm run dev`, watch for:

```
👻 Ghost Whistle Node Server initialized
Waiting for commands from main process...
🚀 Starting Ghost Whistle Node...
📡 Connecting to signaling server...
✅ Connected to signaling server
📝 Registration sent to server
✅ Node started successfully
```

---

## Part 3: Test the Built Executable (Full Test)

**Only if you want to test the final user experience:**

### Build for Your Platform

```bash
# In ghost-whistle-desktop directory

# Windows
npm run build:win

# macOS  
npm run build:mac

# Linux
npm run build:linux
```

### Where to Find It:
```
ghost-whistle-desktop/
  └── dist/
      ├── Ghost Whistle Desktop Setup 1.0.0.exe  (Windows)
      ├── Ghost Whistle Desktop-1.0.0.dmg        (macOS)
      └── Ghost Whistle Desktop-1.0.0.AppImage   (Linux)
```

### Install and Test:

**Windows:**
```bash
# Run the installer
cd dist
start "Ghost Whistle Desktop Setup 1.0.0.exe"

# Or use portable version
start "Ghost Whistle Desktop 1.0.0.exe"
```

**macOS:**
```bash
# Open the DMG
open "dist/Ghost Whistle Desktop-1.0.0.dmg"
# Drag to Applications folder
# Launch from Applications
```

**Linux:**
```bash
# Make executable
chmod +x "dist/Ghost Whistle Desktop-1.0.0.AppImage"

# Run it
./"dist/Ghost Whistle Desktop-1.0.0.AppImage"
```

---

## Part 4: Test Network Connectivity

### Check Connection to Production Server

While the app is running:

1. **Check Console Output:**
```
✅ Connected to signaling server
✅ Node registered successfully
```

2. **Check in Browser:**
   - Open: https://whitelspace.onrender.com/health
   - Should show active nodes count
   - Your node should be included

3. **Check Stats in App:**
   - Wait 30 seconds
   - Stats should start updating
   - If relays happen, count increases

### If Node Won't Connect:

**Check 1: Internet Connection**
```bash
# Test connection to server
ping whitelspace.onrender.com

# Or use curl
curl https://whitelspace.onrender.com/health
```

**Check 2: Firewall**
- Windows Defender might block it
- Allow through firewall if prompted

**Check 3: Wallet Address**
- Make sure you entered a valid Solana address
- Format: Base58 string, ~44 characters

---

## Part 5: Quick Test Script

**I'll create a test script for you:**

### Windows Test Script

```batch
@echo off
echo.
echo ====================================
echo   Ghost Whistle - Local Testing
echo ====================================
echo.

echo [1/3] Testing website...
start http://localhost:8080/
echo Open browser and click Download Desktop button
echo.

echo [2/3] Starting desktop app in dev mode...
cd ghost-whistle-desktop
echo Installing dependencies...
call npm install --silent
echo.
echo Starting app...
call npm run dev
echo.

pause
```

### Linux/Mac Test Script

```bash
#!/bin/bash
echo ""
echo "===================================="
echo "   Ghost Whistle - Local Testing"
echo "===================================="
echo ""

echo "[1/3] Testing website..."
open http://localhost:8080/  # macOS
# xdg-open http://localhost:8080/  # Linux
echo "Open browser and click Download Desktop button"
echo ""

echo "[2/3] Starting desktop app in dev mode..."
cd ghost-whistle-desktop
echo "Installing dependencies..."
npm install
echo ""
echo "Starting app..."
npm run dev
```

---

## Complete Test Checklist

### Website Testing
- [ ] Local server is running
- [ ] Can access http://localhost:8080/
- [ ] Download button exists in Ghost Whistle section
- [ ] Button opens download-desktop.html
- [ ] All 3 platforms show correctly
- [ ] Modals open with instructions
- [ ] "Build from Source" option works

### Desktop App Testing (Dev Mode)
- [ ] `npm install` completes successfully
- [ ] `npm run dev` starts the app
- [ ] Window opens with correct UI
- [ ] Dashboard shows stats (all zeros initially)
- [ ] Settings page opens
- [ ] Can enter wallet address
- [ ] Settings save and persist
- [ ] Can start node (shows ACTIVE)
- [ ] Stats begin updating
- [ ] Can stop node
- [ ] Minimize to tray works
- [ ] Tray icon appears
- [ ] Can reopen from tray
- [ ] Console shows connection logs

### Built Executable Testing (Optional)
- [ ] `npm run build` completes
- [ ] Executable appears in dist/
- [ ] Can install the app
- [ ] App launches after install
- [ ] All features work same as dev mode
- [ ] Auto-start toggle works
- [ ] App survives restart

---

## Common Issues & Solutions

### Issue: npm install fails

**Solution:**
```bash
# Make sure Node.js is installed
node --version  # Should be v18+

# If not, download from: https://nodejs.org/

# Clear cache and try again
npm cache clean --force
npm install
```

### Issue: "Cannot find module 'electron'"

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

### Issue: App window is blank

**Solution:**
```bash
# Check console for errors
# Make sure ui/index.html exists
# Try: Ctrl+R to reload window
```

### Issue: Node won't start

**Solution:**
1. Check wallet address is set in Settings
2. Check internet connection
3. Check console logs for errors
4. Try stopping and starting again

### Issue: Can't find tray icon

**Windows**: Check hidden icons (arrow in taskbar)
**macOS**: Check right side of menu bar
**Linux**: Some DEs don't have system tray

---

## Expected Test Results

### Successful Test Output:

```
🚀 Starting Ghost Whistle Node...
👛 Wallet: AbC...XyZ
📡 Connecting to signaling server...
✅ Connected to signaling server
📝 Registration sent to server
✅ Node registered successfully
✅ Node started successfully
```

### Dashboard Should Show:
- Status: 🟢 ACTIVE & EARNING
- Uptime: Counting up (0h 0m, 0h 1m, etc.)
- Total Relays: 0+ (increases when relays happen)
- Connections: 0+ (number of peers)
- Data: Bytes transferred

---

## Quick Commands Reference

```bash
# Navigate to project
cd ghost-whistle-desktop

# Install (first time)
npm install

# Run in dev mode (fastest testing)
npm run dev

# Build executable (slower, full test)
npm run build

# Build specific platform
npm run build:win
npm run build:mac
npm run build:linux

# View logs
# Windows: %APPDATA%\ghost-whistle-desktop\logs\
# macOS: ~/Library/Logs/ghost-whistle-desktop/
# Linux: ~/.config/ghost-whistle-desktop/logs/
```

---

## Testing Timeline

- **Quick Test (Dev Mode)**: 5 minutes
  - `npm install` (2 min)
  - `npm run dev` (1 min)
  - Manual testing (2 min)

- **Full Test (Build)**: 15 minutes
  - Build process (5-10 min)
  - Install & test (5 min)

**Recommendation**: Start with dev mode testing! 🚀

---

## Next Steps After Testing

Once everything works:

1. ✅ Test locally (you're here!)
2. Build executables for all platforms
3. Upload to GitHub Releases
4. Update download-desktop.html with real links
5. Deploy to production
6. Share with users! 🎉

---

**Ready to test? Start here:**

```bash
cd ghost-whistle-desktop
npm install
npm run dev
```

That's it! The app will open and you can test everything. 👻

