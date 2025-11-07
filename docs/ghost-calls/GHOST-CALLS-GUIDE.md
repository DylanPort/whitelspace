# 📞 GHOST CALLS - User Guide

## ✅ Feature Successfully Added!

Ghost Calls is now live in your Whistle app with a premium terminal aesthetic!

---

## 🎯 How to Access

1. **Open your app** at http://localhost:3000
2. **Expand "Ghost Whistle"** in the sidebar (left menu)
3. **Click "Ghost Calls"** (marked as NEW and PREMIUM)
4. You'll see the dark terminal-style interface

---

## 🎨 What You'll See

### Dark Premium Terminal Aesthetic:
- **Header**: `GHOST_CALLS://SECURE` in emerald green
- **Status indicators**: `[ANONYMOUS] [ENCRYPTED] [NO-TRACE]`
- **Online indicator**: Pulsing green dot
- **Monospace font**: Terminal-style text throughout
- **Dark gradients**: Deep blacks and blues
- **Neon accents**: Emerald, cyan, purple glows

---

## 📞 How to Use

### Start a Call:

1. **Choose Call Type:**
   - Click `AUDIO_CALL` (emerald green button)
   - Or click `VIDEO_CALL` (purple button)

2. **Grant Permissions:**
   - Browser will ask for microphone access
   - For video: camera access too

3. **Share Link:**
   - Call link is automatically generated
   - Click `📋 COPY_LINK` to copy
   - Send to your contact via any method

4. **Wait for Connection:**
   - You'll see "WAITING_FOR_PEER_CONNECTION..."
   - Bouncing emerald dots show it's active

### Join a Call:

1. **Paste Link:**
   - Get the call link from your contact
   - Paste in the `PASTE_CALL_LINK_OR_ID...` field
   - Click `📞 CONNECT`

2. **Grant Permissions:**
   - Allow microphone/camera access

3. **Connected!**
   - You'll see both video feeds
   - Call timer starts
   - Controls appear at bottom

### During a Call:

**Controls:**
- 🎤 **Mute** - Toggle microphone on/off
- 📹 **Video** - Toggle camera on/off (video calls only)
- 📞 **End Call** - Hang up
- ⚙️ **Settings** - Call settings (future feature)

**Call Info:**
- **Timer**: Shows call duration (MM:SS format)
- **Encryption indicator**: Confirms end-to-end encryption
- **User labels**: "YOU" and "👻 ANONYMOUS_USER"

---

## 🔒 Privacy Features

### Current (Free):
- ✅ End-to-end encrypted
- ✅ No registration required
- ✅ Zero knowledge protocol
- ✅ Auto-delete after 24h

### Premium (Stake 1000 WHISTLE):
- 💎 Node routing (hide your IP)
- 💎 Screen sharing
- 💎 Encrypted recording
- 💎 Group calls (up to 10 people)
- 💎 Unlimited time

---

## 🎨 Terminal Aesthetic Details

### Color Scheme:
- **Background**: Dark gradient (#0a0e14 → #1a1f2e → #0f1419)
- **Primary**: Emerald (#10b981) for secure/active states
- **Secondary**: Cyan (#06b6d4) for info/join
- **Accent**: Purple (#8b5cf6) for video/premium
- **Danger**: Red (#ef4444) for end call
- **Text**: Monospace font (system font-mono)

### Visual Elements:
- **Borders**: Subtle glows (emerald/cyan/purple)
- **Cards**: Black with transparency + backdrop blur
- **Buttons**: Gradient backgrounds with hover effects
- **Indicators**: Pulsing dots for live status
- **Warnings**: Yellow borders for privacy notes

---

## 💡 Tips

### Best Practices:
1. **Test Your Audio/Video** before sending link
2. **Use Headphones** to avoid echo
3. **Good Lighting** for video calls
4. **Stable Internet** for best quality
5. **Private Location** for sensitive calls

### Privacy Tips:
- ⚠️ **Free tier**: Your IP is visible to the other party (direct P2P)
- 💎 **Premium routing**: Calls routed through privacy nodes (IP hidden)
- 🔒 **Always encrypted**: All calls are end-to-end encrypted
- 🔥 **Auto-delete**: Call metadata deleted after 24 hours

---

## 🐛 Troubleshooting

### "Media access denied"
- **Fix**: Allow microphone/camera in browser settings
- **Chrome**: Click padlock icon → Site settings → Allow mic/camera
- **Firefox**: Click shield icon → Permissions → Allow

### "Connection failed"
- **Fix**: Check internet connection
- **Fix**: Try refreshing the page
- **Fix**: Make sure both users are online

### "No video/audio"
- **Fix**: Click mute/video button to toggle
- **Fix**: Check your device's mic/camera hardware
- **Fix**: Restart browser if needed

### "Call link doesn't work"
- **Fix**: Make sure you copied the full link
- **Fix**: Link should start with your domain
- **Fix**: Try generating a new link

---

## 🚀 Next Steps (Future Features)

Coming soon:
- ✨ Screen sharing
- ✨ Encrypted call recording
- ✨ Group calls (multi-party)
- ✨ Chat during calls
- ✨ Call history (encrypted)
- ✨ Scheduled calls
- ✨ Call quality indicators
- ✨ Noise cancellation settings

---

## 📊 Technical Details

### WebRTC Configuration:
```javascript
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}
```

### Media Constraints:
```javascript
{
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user'
  }
}
```

### Call States:
- `idle` - Ready to start/join a call
- `calling` - Waiting for peer to connect
- `ringing` - Incoming call notification (future)
- `active` - Call in progress
- `ended` - Call terminated

---

## 🎯 Use Cases

### Perfect For:
- 📞 Anonymous whistleblowing calls
- 💼 Private business discussions
- 🔒 Sensitive conversations
- 🌍 International calls (no phone number needed)
- 👥 Team meetings with privacy
- 🎓 Tutoring/coaching sessions
- 💬 Dating/social calls (anonymous)
- 🎮 Gaming voice chat

### Not Recommended For:
- ❌ Emergency calls (use regular phone)
- ❌ Calls requiring legal records
- ❌ Large group conferences (free tier)

---

## 🆘 Support

Need help?
- **Email**: whistleninja@virgilio.it
- **Website**: https://whistle.ninja
- **Documentation**: Check other guides in this folder

---

## 🎉 Success!

**Your Ghost Calls feature is ready to use!** 

The dark terminal aesthetic gives it a premium, hacker-style look while remaining user-friendly. Users will love the anonymous, encrypted calling experience!

**Test it now:**
1. Open http://localhost:3000
2. Navigate to Ghost Whistle → Ghost Calls
3. Start an audio or video call
4. See the terminal-style magic! ✨

