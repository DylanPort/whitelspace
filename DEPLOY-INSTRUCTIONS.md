# 🚀 Quick Deployment Instructions

## Prerequisites
- GitHub account
- Render account (free)
- Netlify account (free)

---

## 🎯 Quick Start (5 Steps)

### Step 1: Push to GitHub ✅
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Deploy Backend to Render
1. Go to https://render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node signaling-server.js`
   - **Plan**: Free
5. Click **"Create Web Service"**
6. **COPY YOUR RENDER URL** (looks like: `https://ghost-whistle-abc123.onrender.com`)

### Step 3: Update Frontend URLs
Open `index.html` and replace these 2 lines:

**Line ~8685:**
```javascript
// CHANGE THIS:
const SIGNALING_SERVER_URL = 'ws://localhost:8080';

// TO THIS (use YOUR Render URL with wss://):
const SIGNALING_SERVER_URL = 'wss://YOUR-RENDER-URL.onrender.com';
```

**Line ~8879:**
```javascript
// CHANGE THIS:
const response = await fetch('http://localhost:8080/api/nodes');

// TO THIS (use YOUR Render URL with https://):
const response = await fetch('https://YOUR-RENDER-URL.onrender.com/api/nodes');
```

### Step 4: Commit URL Changes
```bash
git add index.html
git commit -m "Update to production URLs"
git push origin main
```

### Step 5: Deploy Frontend to Netlify
1. Go to https://netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repo
4. Settings:
   - **Build command**: (leave blank)
   - **Publish directory**: `.`
   - **Branch**: `main`
5. Click **"Deploy site"**

---

## ✅ Test Your Deployment

1. Open your Netlify URL
2. Connect your Phantom wallet
3. Try staking some $WHISTLE
4. Start a node
5. Check if your node appears on the global map

---

## 🆘 Troubleshooting

**Problem**: Node won't connect
- **Solution**: Check that you updated BOTH URLs in index.html (WebSocket AND HTTP API)
- **Solution**: Make sure you're using `wss://` not `ws://`

**Problem**: Render service sleeping
- **Solution**: Free tier services sleep after 15 minutes. First request wakes it up (takes 30-60 seconds)

**Problem**: CORS errors
- **Solution**: Ensure you're using `https://` not `http://` for API calls

---

## 📝 URLs to Save

After deployment, save these URLs:

- **Render Backend**: https://YOUR-APP.onrender.com
- **Netlify Frontend**: https://YOUR-SITE.netlify.app
- **Smart Contract**: https://solscan.io/account/2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq

---

## 💡 Pro Tips

1. **Custom Domain**: Add a custom domain in Netlify settings (optional)
2. **Monitoring**: Check Render logs to see node connections in real-time
3. **Performance**: First load might be slow (cold start), subsequent loads are fast
4. **Uptime**: Free tier Render services have 750 hours/month (enough for 24/7)

---

**That's it! Your Ghost Whistle app is now live! 🎉**

