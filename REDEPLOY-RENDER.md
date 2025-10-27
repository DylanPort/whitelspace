# 🚀 Redeploy Production Server to Fix Node Display

## The Issue
Your production signaling server at `whitelspace.onrender.com` doesn't have the updated code that accepts FREE_ACCESS tokens.

## Solution: Trigger Render Redeploy

### Option 1: Manual Deploy on Render (FASTEST - 2 minutes)

1. Go to https://dashboard.render.com
2. Find your service: **"ghost-whistle-signaling-server"** or **"whitelspace"**
3. Click on it
4. Click **"Manual Deploy"** button (top right)
5. Select **"Deploy latest commit"**
6. Click **"Deploy"**
7. Wait 2-3 minutes for deployment to complete

### Option 2: Push a Dummy Commit (if Manual Deploy doesn't work)

```bash
git commit --allow-empty -m "Trigger Render redeploy for FREE_ACCESS token support"
git push origin main
```

Render will automatically detect the push and redeploy.

## Verify Deployment

Once deployed, test the health endpoint:

```bash
# Should return: {"status":"ok","nodes":0}
curl https://whitelspace.onrender.com/health
```

## After Redeployment

1. **Refresh your browser** (Ctrl+Shift+R)
2. **Stop your node** (if running)
3. **Start your node again**
4. **Your node should now appear on the map!** ✅

## What Will Work After Redeploy

✅ FREE_ACCESS tokens accepted by server  
✅ Node registration successful  
✅ Nodes appear on map  
✅ Node count updates correctly  
✅ No more 401 errors  

---

**Status**: Waiting for Render redeployment
**ETA**: 2-3 minutes after triggering deploy

