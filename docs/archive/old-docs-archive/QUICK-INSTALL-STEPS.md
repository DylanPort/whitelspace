# ⚡ Quick Installation Steps - Do This Now!

Your browser should have opened to the download page. Follow these exact steps:

---

## 📥 Step 1: Download (2 minutes)

**On the page that opened:**
1. Scroll down to **"Command line tools only"**
2. Click **Windows** → Download the ZIP file
3. Wait for download to complete

**Direct link if needed:**
```
https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip
```

---

## 📂 Step 2: Extract (1 minute)

1. Go to your **Downloads** folder
2. Find: `commandlinetools-win-11076708_latest.zip`
3. **Right-click** → **Extract All**
4. Extract to: `C:\Android\cmdline-tools`

**Result:** You should have `C:\Android\cmdline-tools\cmdline-tools\`

---

## 🔧 Step 3: Install Build Tools (5 minutes)

**Copy and paste these commands in PowerShell:**

```powershell
# Navigate to tools
cd C:\Android\cmdline-tools\cmdline-tools\bin

# Accept licenses (type 'y' when prompted)
.\sdkmanager.bat --licenses

# Install build tools
.\sdkmanager.bat "build-tools;34.0.0"
```

**Wait for installation to complete** (~3-5 minutes)

---

## ✅ Step 4: Continue Submission

**After installation, run:**

```powershell
cd C:\Users\salva\Downloads\Encrypto

dapp-store create release --keypair "C:\Users\salva\.config\solana\temp-keypair.json" --url https://api.mainnet-beta.solana.com --build-tools-path "C:\Android\cmdline-tools\build-tools\34.0.0"
```

---

## ⏱️ Total Time: ~10 minutes

- Download: 2 min
- Extract: 1 min  
- Install: 5 min
- Continue: 2 min

**Then you'll complete the Whistle submission!** 🚀

---

## 🆘 If Download Doesn't Start

**Manual download:**
1. Go to: https://developer.android.com/studio
2. Scroll to **"Command line tools only"**
3. Click Windows link
4. Accept terms and download

---

## ⚠️ Need Java?

If you get "Java not found" error:

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

Or download from: https://adoptium.net/

---

**Follow the steps above and you'll be done in 10 minutes!**

