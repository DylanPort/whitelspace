# 📱 Mobile Node Display - Troubleshooting Checklist

## Current Status
The **production server is redeploying** with FREE_ACCESS token support. This affects both desktop AND mobile.

## Wait for Render Deployment (2-3 minutes)

Before testing on mobile, make sure:
1. Go to https://dashboard.render.com
2. Check that your "whitelspace" service shows **"Live"** (green checkmark)
3. Status should NOT show "Deploying" or "Building"

## Once Deployment is Complete

### Test on Mobile Browser:

#### Step 1: Open Your App
- Open mobile browser (Chrome, Safari, etc.)
- Navigate to your app URL (Netlify URL or localhost if testing locally)

#### Step 2: Connect Mobile Wallet
- Tap "Connect Wallet"
- Choose your mobile wallet (Phantom, Solflare, etc.)
- Authorize the connection

#### Step 3: Run Node
- Make sure you have 10,000+ $WHISTLE staked
- Tap "Run Node" button
- Wait 5-10 seconds

#### Step 4: Check Map
- Scroll down to "LIVE GLOBAL NETWORK" section
- The map should show your node
- Node count should show "1 NODES" (or more if others are online)

## Mobile-Specific Issues & Solutions

### Issue 1: Map Not Rendering on Mobile
**Symptoms**: Blank map area, no world map visible

**Solutions**:
- Refresh the page (pull down to refresh)
- Clear browser cache
- Try landscape orientation
- Ensure JavaScript is enabled
- Check console for errors (enable dev tools on mobile)

### Issue 2: WebSocket Connection Fails
**Symptoms**: "Failed to connect to signaling server"

**Solutions**:
- Check mobile data/WiFi connection
- Make sure you're using `wss://` (secure WebSocket)
- Some mobile networks block WebSocket - try different network
- Check if VPN is blocking connections

### Issue 3: Mobile Wallet Not Connecting
**Symptoms**: Wallet doesn't respond or shows error

**Solutions**:
- Make sure wallet app is installed and updated
- Try disconnecting and reconnecting
- Clear wallet app cache
- Try a different mobile wallet

### Issue 4: x402 Token Generation Fails
**Symptoms**: "x402_token_required" or "x402_validate_failed"

**Solutions**:
- Wait for Render server to finish deploying
- The FREE_ACCESS token should work automatically
- Check console logs for specific error messages
- Try refreshing the page

## Console Logs to Look For (Mobile)

### Success (What You Want to See):
```
🔐 Getting x402 token for node operation...
🆓 X402 bypassed for node - Free access granted!
✅ x402 token obtained: FREE_ACCESS
🔌 Connecting to signaling server: wss://whitelspace.onrender.com
✅ Connected to signaling server
✅ Node registered: GW-...
📡 Active nodes: 1
🗺️ Creating markers for nodes: [...]
✨ Created YOUR marker at [...]
```

### Error Patterns:
```
❌ WebSocket connection failed              → Network/server issue
❌ 401 Unauthorized                         → Server not updated yet
❌ x402_validate_failed                     → Server needs redeploy
⚠️ No nodes in API response                 → Server has no nodes registered
```

## How to View Console on Mobile

### iOS Safari:
1. Connect iPhone to Mac via USB
2. Mac: Safari → Develop → [Your iPhone] → [Your Page]
3. View console logs

### Android Chrome:
1. Enable USB debugging on Android
2. Connect to computer
3. Chrome on computer: `chrome://inspect`
4. Click "Inspect" on your mobile page

### Alternative (Any Mobile Browser):
Use a remote debugging tool like:
- Eruda: Add `<script src="https://cdn.jsdelivr.net/npm/eruda"></script>` to your HTML
- vConsole: Add to your page for mobile debugging

## Testing Timeline

**Now** → **+3 min** → **Then**
- Server deploying → Wait → Test on mobile

1. ⏰ **Right now**: Server is deploying (do NOT test yet)
2. ⏱️ **In 2-3 minutes**: Check Render dashboard for "Live" status
3. ✅ **After "Live"**: Open mobile browser and test
4. 🎉 **Result**: Your node should appear on the map!

## If Still Not Working After Server Deploy

### Check These:

1. **Browser cache**: Hard refresh on mobile
   - iOS: Hold refresh button → "Reload Without Content Blockers"
   - Android: Settings → Clear cache for browser

2. **Correct URL**: Make sure you're on the right domain
   - Should be your Netlify URL or production domain
   - NOT localhost (unless you have local server running on mobile)

3. **Network restrictions**: 
   - Try mobile data instead of WiFi (or vice versa)
   - Check if corporate/school network blocks WebSocket
   - Disable VPN temporarily

4. **Server logs**: Check Render logs for errors
   - Dashboard → Your service → Logs
   - Look for "Node registered" messages

## Expected Behavior on Mobile

✅ Same as desktop - no differences!
- Nodes display on map
- Node count updates
- Map is interactive (pinch to zoom)
- Markers are visible
- Tooltips work on tap

---

**Status**: Waiting for production server deployment to complete
**ETA**: 2-3 minutes from last push
**Then**: Test on mobile and it should work! 📱✨

