# 🔧 Ghost Calls Blank Screen - Troubleshooting

## Issue
Ghost Calls section appears blank when clicked.

## Quick Fix Steps

### 1. Clear Browser Cache (MOST IMPORTANT!)
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```
Or manually:
- Chrome: Settings → Privacy → Clear browsing data → Cached images
- Firefox: Options → Privacy → Clear Data → Cached Web Content

### 2. Check Server is Running
```powershell
# Should see output like:
💰 Fee Collector Wallet: G1RH...
Server running on port 3001
```

If not running:
```powershell
npm start
```

### 3. Check Developer Console (F12)
Open browser console and look for:

**✅ Expected (Component Working):**
```
🎯 GhostCalls component loaded! {walletAddress: "...", pushToast: ƒ}
```

**❌ Error Examples:**
```
GhostCalls is not defined
Uncaught SyntaxError
Uncaught TypeError
```

### 4. Verify Route is Active
In console, when you click Ghost Calls, you should see:
```
🎯 Current step: ghost-calls
🎯 Sidebar clicked: ghost-calls
```

If you don't see these, the route isn't being triggered.

## Common Causes & Fixes

### Cause 1: Browser Cache
**Symptom:** Old version of page still loading
**Fix:** Hard refresh (Ctrl+Shift+R)

### Cause 2: Server Not Updated
**Symptom:** Changes not reflected
**Fix:** 
```powershell
# Kill existing server
Get-Process -Name node | Stop-Process -Force

# Restart
npm start
```

### Cause 3: JavaScript Error
**Symptom:** Red error in console
**Fix:** Share the error message so I can fix the code

### Cause 4: Route Not Configured
**Symptom:** Console shows different step
**Fix:** Verify 'ghost-calls' is in validSteps array

### Cause 5: Component Not Rendering
**Symptom:** No console.log from component
**Fix:** Check if component is properly defined

## Debugging Checklist

- [ ] Server is running without errors
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Opened Developer Console (F12)
- [ ] Clicked Ghost Calls in sidebar
- [ ] Checked Console tab for errors
- [ ] Saw "🎯 GhostCalls component loaded!" message
- [ ] No red errors in console

## What You Should See

### If Working Correctly:
1. **Console Output:**
   ```
   🎯 Sidebar clicked: ghost-calls
   🎯 Current step: ghost-calls
   🎯 GhostCalls component loaded!
   ```

2. **Visual Output:**
   - Dark gradient background (blue/black)
   - Header: "GHOST_CALLS://SECURE" (emerald green)
   - Two cards: "INITIATE_CALL" and "JOIN_CALL"
   - Audio/Video call buttons

### If Blank:
- Check F12 console for errors
- Look for red error messages
- Check if any console.log messages appear

## Still Blank After All Steps?

### Share This Info:
1. **Browser Console Output** (F12 → Console tab → copy all)
2. **Server Terminal Output** (copy the npm start output)
3. **Any Red Errors** (copy exact error message)

### Quick Test:
Open browser console and type:
```javascript
localStorage.clear()
location.reload()
```

This clears all cached state and reloads.

## Expected Component States

The Ghost Calls component has 3 states:

1. **idle** (default)
   - Shows "INITIATE_CALL" and "JOIN_CALL" cards
   - Audio/Video buttons visible

2. **calling**
   - Shows call link
   - "Waiting for peer..." message
   - Copy link button

3. **active** (not yet implemented)
   - Would show video feeds
   - Call controls

If you're in idle state, you should see content (not blank).

## Manual Verification

### Check Component Exists:
Open browser console:
```javascript
// Should return true
typeof GhostCalls === 'function'
```

### Check Route Exists:
```javascript
// Should include 'ghost-calls'
console.log(validSteps)
```

### Force Navigate:
```javascript
// Manually trigger navigation
setStep('ghost-calls')
```

## Contact Support

If still not working after all steps:
- **Email:** whistleninja@virgilio.it
- **Include:** Console output, errors, screenshots

---

**Most likely fix:** Clear browser cache with Ctrl+Shift+R! 🔄

