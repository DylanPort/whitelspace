# 📦 Install Android Build Tools (Quick Method)

The Solana dApp Store CLI needs Android build tools to analyze your APK.

---

## ⚡ QUICKEST METHOD: Command Line Tools Only

You don't need full Android Studio - just the command line tools!

### Step 1: Download Android Command Line Tools

**Download from:**
https://developer.android.com/studio#command-line-tools-only

**Windows Direct Link:**
https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip

### Step 2: Extract

1. Download the ZIP file
2. Extract to: `C:\Android\cmdline-tools`
3. Your path should be: `C:\Android\cmdline-tools\cmdline-tools\`

### Step 3: Install Build Tools

Open PowerShell and run:

```powershell
cd C:\Android\cmdline-tools\cmdline-tools\bin

# Accept licenses
.\sdkmanager.bat --licenses

# Install build tools (latest version)
.\sdkmanager.bat "build-tools;34.0.0"
```

### Step 4: Use with dApp Store CLI

After installation, build tools will be at:
```
C:\Android\cmdline-tools\build-tools\34.0.0
```

Run create release with path:

```bash
dapp-store create release --keypair "C:\Users\salva\.config\solana\temp-keypair.json" --url https://api.mainnet-beta.solana.com --build-tools-path "C:\Android\cmdline-tools\build-tools\34.0.0"
```

---

## 🎯 Alternative: Use .env File

Create a `.env` file in your project root:

```env
ANDROID_BUILD_TOOLS_DIR=C:\Android\cmdline-tools\build-tools\34.0.0
```

Then you can run without the flag:
```bash
dapp-store create release --keypair "C:\Users\salva\.config\solana\temp-keypair.json" --url https://api.mainnet-beta.solana.com
```

---

## ⏱️ Time Estimate

- Download: 2-3 minutes
- Extract: 1 minute  
- Install build tools: 3-5 minutes
- **Total: ~10 minutes**

---

## 📦 What Gets Installed

- SDK Manager
- Build Tools (includes AAPT2)
- Platform Tools
- Total size: ~500 MB

Much smaller than full Android Studio (~3 GB)!

---

## ✅ After Installation

Run:
```bash
dapp-store create release --keypair "C:\Users\salva\.config\solana\temp-keypair.json" --url https://api.mainnet-beta.solana.com --build-tools-path "C:\Android\cmdline-tools\build-tools\34.0.0"
```

---

## 🆘 Troubleshooting

### "sdkmanager not found"
- Make sure you're in: `C:\Android\cmdline-tools\cmdline-tools\bin`
- Use `.\sdkmanager.bat` (with .\)

### "Java not found"
- Install Java JDK: https://adoptium.net/
- Or use: `winget install EclipseAdoptium.Temurin.21.JDK`

### Still having issues?
- Try full Android Studio: https://developer.android.com/studio
- After install, build tools at: `C:\Users\<username>\AppData\Local\Android\Sdk\build-tools\<version>`

---

**After installation, continue with Step 2 of submission!**

