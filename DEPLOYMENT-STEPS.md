# 🚀 Deployment Steps for Node Display Fix

## Summary
Fixed the issue where nodes were not displaying on the map and node count was not updating. The fix includes x402 authentication integration for both client-side and server-side components.

## Files Modified
✅ `index.html` - Main production file  
✅ `index-backup.html` - Backup version  
✅ `server.js` - Local development server  
✅ `netlify/functions/x402-validate.js` - Production Netlify function  
✅ `signaling-server.js` - WebSocket signaling server (no changes needed)  

## Quick Deploy Guide

### Option 1: Local Testing

```bash
# Terminal 1 - Start local server (serves frontend)
npm start
# Opens at http://localhost:3000

# Terminal 2 - Start signaling server (WebSocket for nodes)
npm run signaling
# Runs at http://localhost:8080

# Terminal 3 - Run test page
# Open test-node-display.html in browser
```

### Option 2: Deploy to Production

#### Step 1: Deploy Signaling Server to Render
1. Go to [render.com](https://render.com)
2. Connect your GitHub repository
3. Render will auto-detect `render.yaml` and deploy
4. Copy your Render URL (e.g., `https://whitelspace.onrender.com`)

**Note**: The signaling server is already deployed at `https://whitelspace.onrender.com`

#### Step 2: Deploy Frontend to Netlify
1. Connect your GitHub repository to Netlify
2. Set build settings:
   - Build command: (leave empty)
   - Publish directory: `.`
3. Click "Deploy"
4. Your app will be live at your Netlify URL

## Testing the Fix

### Test 1: Open Test Page
1. Open `test-node-display.html` in your browser
2. Click "Test API Connection" - should show green success
3. Click "Fetch Active Nodes" - should list all active nodes
4. Click "Test x402 Auth" - should show FREE_ACCESS works

### Test 2: Run a Node (Desktop)
1. Open your app at http://localhost:3000 or your Netlify URL
2. Connect your Phantom/Solflare wallet
3. Stake at least 10,000 $WHISTLE tokens
4. Click "Run Node" button
5. ✅ Node should register successfully
6. ✅ Node should appear on the world map
7. ✅ Node count should increase by 1
8. ✅ Console should show: "✅ x402 token obtained: FREE_ACCESS"

### Test 3: Run a Node (Mobile)
1. Open your app on mobile browser
2. Connect your mobile wallet
3. Stake at least 10,000 $WHISTLE tokens
4. Click "Run Node" button
5. ✅ Node should register successfully
6. ✅ Node should appear on the world map
7. ✅ Node count should increase by 1

### Test 4: Verify Map Display
1. Wait 5-10 seconds after starting node
2. Scroll to the world map section
3. ✅ Your node should be visible as a pulsing marker
4. ✅ Marker should be green (for your node) or blue (for others)
5. ✅ Click on marker to see node details popup

### Test 5: Verify Node Count
1. Look at the "Network Stats" section
2. ✅ "Active Nodes" count should match number of markers on map
3. ✅ Count should update every 10 seconds automatically

## Expected Console Output

When a node starts successfully, you should see:

```
🔐 Getting x402 token for node operation...
✅ x402 token obtained: FREE_ACCESS
🔌 Connecting to signaling server: wss://whitelspace.onrender.com
✅ Connected to signaling server
✅ Node registered on network!
📨 Received: registered
✅ Registered as: GW-YourAddr-1234567890
🌐 Fetching nodes from API...
📡 RAW API Response: { nodes: [...], totalNodes: X }
✅ Setting globalNodes state with: [...]
🗺️ Creating markers for nodes: ...
✨ Created YOUR marker at [lat, lng] for node GW-YourAddr-1234567890
```

## Troubleshooting

### Issue: "x402 token required" error
**Solution**: The FREE_ACCESS token fix has been applied. Restart your servers:
```bash
# Stop all servers (Ctrl+C)
# Restart server
npm start
# Restart signaling server
npm run signaling
```

### Issue: Nodes not appearing on map
**Checklist**:
- [ ] Check console for errors
- [ ] Verify node count is updating in Network Stats
- [ ] Wait 10 seconds for auto-refresh
- [ ] Manually refresh the page
- [ ] Check that signaling server is running

### Issue: "Failed to fetch nodes" error
**Solutions**:
- Check that signaling server URL is correct in code
- Verify signaling server is running: Visit https://whitelspace.onrender.com/health
- Check browser console for CORS errors
- Try restarting the signaling server

### Issue: Mobile wallet not working
**Solutions**:
- Ensure mobile wallet is properly connected
- Check that `getInAppKeypair()` function is available
- Verify mobile wallet has sufficient SOL for gas fees
- Try disconnecting and reconnecting wallet

## Production Checklist

Before deploying to production:
- [ ] Test on desktop (Chrome, Firefox, Safari)
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Verify FREE_ACCESS tokens work
- [ ] Verify nodes appear on map within 10 seconds
- [ ] Verify node count updates correctly
- [ ] Test with multiple nodes simultaneously
- [ ] Check that map markers are correctly colored
- [ ] Verify node popups show correct information
- [ ] Test disconnecting and reconnecting wallet
- [ ] Verify server logs show successful registrations

## Environment Variables

No environment variables need to be changed. The fix uses the existing x402 infrastructure.

## Rollback Plan

If issues occur in production, revert these commits:
1. `index.html` - Revert to previous version
2. `index-backup.html` - Revert to previous version  
3. `server.js` - Revert to previous version
4. `netlify/functions/x402-validate.js` - Revert to previous version

Or use git:
```bash
git revert HEAD~4..HEAD
git push origin main
```

## Support

If you encounter any issues:
1. Check the console logs
2. Review `test-node-display.html` test results
3. Verify server is running: https://whitelspace.onrender.com/health
4. Check GitHub issues for similar problems

## Success Metrics

After deployment, monitor:
- **Node Registration Rate**: Should increase (nodes can now register successfully)
- **Map Display Rate**: 100% of registered nodes should appear on map
- **Node Count Accuracy**: Should match actual number of active nodes
- **Error Rate**: Should be near 0% for x402 authentication
- **User Feedback**: Users should report seeing their nodes on the map

---

**Status**: ✅ Ready for Deployment  
**Last Updated**: October 27, 2025  
**Version**: 1.0.0

