# 📱 Fix Mobile Nodes Not Displaying

## The Problem
PC works ✅ but mobile doesn't show nodes = **Mobile browser is caching old code**

## Quick Fix for Users (Try These In Order)

### 1. Hard Refresh Mobile Browser (iOS)
**Safari:**
- Hold the refresh button
- Tap **"Request Desktop Site"**
- Then tap **"Request Mobile Site"** again
- Refresh again

**OR:**
- Settings → Safari → Clear History and Website Data
- Close Safari completely (swipe up from app switcher)
- Reopen and try again

### 2. Hard Refresh Mobile Browser (Android)
**Chrome:**
- Menu (3 dots) → Settings → Privacy → Clear browsing data
- Check "Cached images and files"
- Tap "Clear data"
- Close Chrome completely
- Reopen and try again

### 3. Force Cache Bypass
Add `?v=` with timestamp to URL:
```
https://yoursite.com/?v=12345678
```
Change the number each time to force a fresh load.

---

## Developer Fix: Add Cache-Busting Headers

I'll add meta tags to force mobile browsers to reload:

