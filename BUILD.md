# Ghost Whistle - Android Build Guide

## 🚀 Automated Cloud Builds (Recommended)

Every time you push to the `main` branch, GitHub Actions automatically builds your Android APK.

### How to Download Your APK:

1. **Go to**: https://github.com/DylanPort/whitelspace/actions
2. **Click** on the latest "Build Android APK" workflow run
3. **Scroll down** to the "Artifacts" section
4. **Download**: `ghost-whistle-debug.apk`

### Installing on Your Android Device:

1. **Transfer the APK** to your Android phone/tablet
2. **Enable installation from unknown sources**:
   - Go to Settings → Security → Unknown Sources (enable it)
   - Or: Settings → Apps → Special Access → Install Unknown Apps → (your file manager) → Allow
3. **Open the APK file** and tap "Install"
4. **Launch** Ghost Whistle from your app drawer

---

## 🏗️ Manual Local Build (If You Have Android Studio)

### Prerequisites:
- Node.js 18+
- Android Studio (with Android SDK)
- Java JDK 17

### Build Steps:

```bash
# 1. Install dependencies
npm install

# 2. Create www directory and copy assets
mkdir www
cp index.html www/
cp manifest.webmanifest www/
cp -r public/* www/ 2>/dev/null || true
cp -r assets www/ 2>/dev/null || true

# 3. Copy Capacitor config
cp config/capacitor.config.json capacitor.config.json

# 4. Add Android platform (if not already added)
npx cap add android

# 5. Sync Capacitor
npx cap sync android

# 6. Build APK
cd android
./gradlew assembleDebug

# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

### Set up Android SDK (if not installed):

**Windows:**
```powershell
# Set ANDROID_HOME environment variable
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk", "User")
```

**Mac/Linux:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Library/Android/sdk  # Mac
export ANDROID_HOME=$HOME/Android/Sdk          # Linux
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## 📦 Building a Release APK for Google Play

### Generate a Signing Key:

```bash
# Create keystore
keytool -genkey -v -keystore ghost-whistle-release.keystore -alias ghost-whistle -keyalg RSA -keysize 2048 -validity 10000

# Store credentials securely - you'll need:
# - Keystore password
# - Key alias: ghost-whistle
# - Key password
```

### Configure Signing in `android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file('path/to/ghost-whistle-release.keystore')
            storePassword 'YOUR_KEYSTORE_PASSWORD'
            keyAlias 'ghost-whistle'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Build Release APK:

```bash
cd android
./gradlew assembleRelease

# Signed APK will be at: android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔧 Troubleshooting

### "SDK location not found"
- Install Android Studio: https://developer.android.com/studio
- Set `ANDROID_HOME` environment variable (see above)

### "Gradle build failed"
- Make sure you have JDK 17 installed
- Run: `cd android && ./gradlew clean`
- Try again: `./gradlew assembleDebug`

### "Capacitor config not found"
- Make sure `capacitor.config.json` is in the project root
- Copy from: `cp config/capacitor.config.json capacitor.config.json`

### APK won't install on device
- Enable "Install from Unknown Sources" in Android Settings
- Make sure you're using the debug APK (not release unsigned)
- Check that your device runs Android 7.0+ (API 24+)

---

## 📱 Testing on Emulator

### Using Android Studio:
1. Open Android Studio
2. Click "More Actions" → "Virtual Device Manager"
3. Create a new device (Pixel 5, Android 13+)
4. Start the emulator
5. Drag and drop the APK onto the emulator

### Using Command Line:
```bash
# List available emulators
emulator -list-avds

# Start emulator
emulator -avd YOUR_AVD_NAME

# Install APK
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🚀 Next Steps

1. ✅ **Test the app** thoroughly on physical devices
2. 📝 **Prepare Play Store listing**:
   - Screenshots (phone + tablet)
   - Feature graphic (1024x500)
   - App icon (512x512)
   - Privacy policy
   - App description
3. 🔐 **Create release keystore** (see above)
4. 📤 **Submit to Google Play Console**

---

## 📞 Support

If you encounter issues, check:
- GitHub Actions build logs
- Android logcat: `adb logcat | grep GhostWhistle`
- Capacitor docs: https://capacitorjs.com/docs



