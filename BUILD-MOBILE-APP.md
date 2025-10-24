# 📱 Build Ghost Whistle Mobile App (APK/iOS)

## 🚀 Quick Start

### Step 1: Install Capacitor
```bash
npm run mobile:install
```

### Step 2: Initialize Capacitor
```bash
npm run mobile:init
```
- App ID: `com.ghostwhistle.app`
- App Name: `Ghost Whistle`
- Web Dir: `public`

### Step 3: Add Android Platform
```bash
npm run mobile:add-android
```

### Step 4: Sync Web Assets
```bash
npm run mobile:sync
```

### Step 5: Open in Android Studio
```bash
npm run android
```

### Step 6: Build APK
In Android Studio:
1. Build → Build Bundle(s) / APK(s) → Build APK(s)
2. APK will be in: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

Or use command line:
```bash
npm run mobile:build-apk
```

## 📦 What's Included

### PWA Features
- ✅ Service Worker (`sw.js`)
- ✅ Web App Manifest (`manifest.webmanifest`)
- ✅ Offline caching
- ✅ Add to home screen

### Mobile Wallet
- ✅ In-app wallet creation
- ✅ Private key import/export
- ✅ Secure local storage
- ✅ Transaction signing

### Ghost Whistle Features
- ✅ Staking WHISTLE tokens
- ✅ Running relay nodes
- ✅ Anonymous relay service
- ✅ Real-time node monitoring
- ✅ Leaderboard integration

## 🔧 Configuration Files

### capacitor.config.json
```json
{
  "appId": "com.ghostwhistle.app",
  "appName": "Ghost Whistle",
  "webDir": "public"
}
```

### AndroidManifest.xml Permissions
Add these permissions for full functionality:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

## 🎯 Testing

### Test on Device
1. Enable Developer Mode on Android device
2. Enable USB Debugging
3. Connect device via USB
4. In Android Studio: Run → Run 'app'

### Test APK Installation
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

## 🔐 Signing APK for Release

### Generate Keystore
```bash
keytool -genkey -v -keystore ghostwhistle.keystore -alias ghostwhistle -keyalg RSA -keysize 2048 -validity 10000
```

### Sign APK
```bash
cd android
./gradlew assembleRelease
```

### Verify Signing
```bash
jarsigner -verify -verbose -certs android/app/build/outputs/apk/release/app-release.apk
```

## 📱 iOS Build (Optional)

### Requirements
- macOS
- Xcode 14+
- Apple Developer Account

### Steps
```bash
npm run mobile:add-ios
npm run ios
```

Then in Xcode:
1. Select signing team
2. Product → Archive
3. Distribute App

## 🚀 Distribution

### Google Play Store
1. Create app in Google Play Console
2. Upload signed APK
3. Fill in app details
4. Submit for review

### Direct APK Distribution
1. Host APK on your server
2. Users download and install (enable "Unknown sources")
3. Updates via new APK versions

### PWA Distribution
1. Users visit website on mobile
2. Tap "Add to Home Screen"
3. App installs instantly
4. Auto-updates on refresh

## 💡 Tips

### Performance
- App runs natively with full performance
- WebRTC works seamlessly
- Background node running supported

### Updates
- PWA updates automatically
- APK requires manual updates or auto-update service
- Consider PWA for easier updates

### Security
- Private keys stored securely
- No sensitive data in APK
- HTTPS required for production

## 🐛 Troubleshooting

### Build Fails
```bash
cd android
./gradlew clean
cd ..
npm run mobile:sync
```

### WebView Issues
Update Android System WebView in Play Store

### Permissions Denied
Check AndroidManifest.xml has all required permissions

## 📊 Next Steps

1. ✅ Service worker registered
2. ✅ Mobile wallet implemented
3. ✅ Capacitor configured
4. ⏳ Build and test APK
5. ⏳ Submit to Play Store (optional)

## 🔗 Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Android Studio](https://developer.android.com/studio)
- [Google Play Console](https://play.google.com/console)

