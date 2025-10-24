# 📱 Ghost Whistle Mobile APK Build Guide

## Prerequisites

### Required Software
```bash
# Install Node.js (v18 or higher)
# Install Java JDK 17
# Install Android Studio with Android SDK
# Install Capacitor CLI
npm install -g @capacitor/cli
```

### Android Studio Setup
1. Download and install Android Studio: https://developer.android.com/studio
2. Open Android Studio → SDK Manager
3. Install:
   - Android SDK Platform 33 (Android 13)
   - Android SDK Build-Tools 33.0.0
   - Android SDK Command-line Tools
   - Android Emulator

## Build Steps

### 1. Install Dependencies
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
```

### 2. Initialize Capacitor (if not already done)
```bash
npx cap init "Ghost Whistle" "com.ghostwhistle.app"
```

### 3. Add Android Platform
```bash
npx cap add android
```

### 4. Copy Web Assets
```bash
npx cap copy android
```

### 5. Sync Capacitor
```bash
npx cap sync android
```

### 6. Open in Android Studio
```bash
npx cap open android
```

### 7. Build APK in Android Studio
1. In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for build to complete
3. APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### 8. Build Release APK (Signed) and Play Store Listing
1. In Android Studio: **Build → Generate Signed Bundle / APK**
2. Select **APK**
3. Create or select keystore
4. Fill in keystore details:
   - Key store path: `ghost-whistle-keystore.jks`
   - Key alias: `ghost-whistle`
   - Passwords (save these securely!)
5. Select build variant: **release**
6. Click **Finish**
7. Release APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### 9. Create Play Store Listing
1. Open Google Play Console → Create app (package: `com.ghostwhistle.app`)
2. Fill Store presence: title, short/long description, privacy policy URL
3. Upload graphics: 512x512 icon, 1024x500 feature graphic, screenshots (phone / tablet)
4. Fill Data safety + Content rating
5. Upload `app-release.aab` (Build → Generate Signed Bundle → Android App Bundle)
6. Complete Pre-launch report issues if any
7. Rollout to Production

## Testing

### Test on Emulator
```bash
npx cap run android
```

### Test on Physical Device
1. Enable Developer Options on Android device
2. Enable USB Debugging
3. Connect device via USB
4. Run: `npx cap run android -l --external`

### Install APK on Device
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## PWA vs APK

### Progressive Web App (PWA)
- **Advantages**:
  - No app store approval needed
  - Instant updates
  - Smaller size
  - Works on any device
  - Easy to install (just visit website)

- **How to Install PWA**:
  1. Visit https://whitelspace.netlify.app on mobile
  2. Tap browser menu (⋮)
  3. Tap "Install app" or "Add to Home Screen"
  4. App will appear on home screen

### Native APK
- **Advantages**:
  - Better performance
  - More native features
  - Works 100% offline
  - Can be distributed via Play Store
  - Background services for nodes

- **When to use**: For node operators who want best performance

## Publishing to Google Play Store

### 1. Prepare Release
- Create app listing on Google Play Console
- Prepare screenshots (phone, tablet, 7-inch, 10-inch)
- Write app description
- Set privacy policy URL
- Create app icon (512x512)
- Create feature graphic (1024x500)

### 2. Generate Signed Bundle
```bash
cd android
./gradlew bundleRelease
```

### 3. Upload to Play Store
1. Go to Google Play Console
2. Create new release
3. Upload AAB file from: `android/app/build/outputs/bundle/release/app-release.aab`
4. Complete store listing
5. Submit for review

## Troubleshooting

### Build Errors
```bash
# Clean project
cd android
./gradlew clean

# Sync and rebuild
npx cap sync android
npx cap copy android
```

### Node Module Issues
```bash
# Clear node modules
rm -rf node_modules
npm install

# Reinstall Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### Android SDK Issues
- Ensure `ANDROID_SDK_ROOT` environment variable is set
- Check Java version: `java -version` (should be 17)
- Verify SDK installation in Android Studio

## Mobile-Specific Features

### Wallet Management
- Create/import wallet directly in app
- Secure private key storage using device keychain
- Biometric authentication support
- Backup/restore wallet

### Node Operations
- Run Solana relay nodes on mobile
- Background service for 24/7 operation
- Battery optimization
- Data usage monitoring

### Notifications
- New relay requests
- Stake rewards earned
- Node status updates
- Network alerts

## Configuration

### Update App Settings
Edit `capacitor.config.json`:
```json
{
  "appId": "com.ghostwhistle.app",
  "appName": "Ghost Whistle",
  "webDir": ".",
  "server": {
    "url": "https://whitelspace.netlify.app"
  }
}
```

### Update Manifest
Edit `manifest.webmanifest` for PWA settings

### Update Service Worker
Edit `sw.js` for offline caching

## Resources

- Capacitor Docs: https://capacitorjs.com
- Android Developer Docs: https://developer.android.com
- PWA Best Practices: https://web.dev/pwa

## Support

For issues or questions:
- GitHub: https://github.com/DylanPort/whitelspace
- Discord: (your discord link)
- Twitter: (your twitter link)

---

**Note**: For most users, the PWA version is recommended. It's faster to install, automatically updates, and works on all devices. The APK is best for power users running nodes 24/7.

