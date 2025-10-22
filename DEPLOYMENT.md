# 🚀 Ghost Whistle Deployment Guide

## Architecture

- **Frontend**: Netlify (Static Site)
- **Backend**: Render (Node.js WebSocket Server)

---

## 📦 Part 1: Deploy Signaling Server to Render

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up/login with GitHub

### Step 2: Deploy from GitHub
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `ghost-whistle-signaling-server`
   - **Region**: Oregon (or closest to your users)
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node signaling-server.js`
   - **Plan**: Free

4. Click **"Create Web Service"**

### Step 3: Note Your Render URL
After deployment completes, copy your Render URL:
```
https://ghost-whistle-signaling-server.onrender.com
```

---

## 🌐 Part 2: Deploy Frontend to Netlify

### Step 1: Update Frontend Configuration

1. **Find and replace** in `index.html`:
   - Search for: `ws://localhost:8080`
   - Replace with: `wss://YOUR-RENDER-URL.onrender.com`
   
   - Search for: `http://localhost:8080`
   - Replace with: `https://YOUR-RENDER-URL.onrender.com`

### Step 2: Create Netlify Site
1. Go to [netlify.com](https://netlify.com)
2. Sign up/login with GitHub
3. Click **"Add new site"** → **"Import an existing project"**
4. Connect your GitHub repository
5. Configure:
   - **Branch**: `main`
   - **Build command**: Leave blank
   - **Publish directory**: `.` (dot for root)
   - **Environment variables**: None needed (we hardcoded URLs)

6. Click **"Deploy site"**

### Step 3: Configure Custom Domain (Optional)
1. In Netlify: **Domain settings** → **Add custom domain**
2. Follow DNS configuration instructions

---

## 🔧 Environment Configuration

### URLs to Update in `index.html`:

#### WebSocket Connections (2 locations)
```javascript
// Line ~8490 - toggleNode function
const signalingWs = new WebSocket('wss://YOUR-RENDER-URL.onrender.com');

// Line ~12165 - AnonymousRelayService component
const signalingWs = new WebSocket('wss://YOUR-RENDER-URL.onrender.com');
```

#### HTTP API Calls (1 location)
```javascript
// Line ~8160 - fetchGlobalNodes function
const response = await fetch('https://YOUR-RENDER-URL.onrender.com/api/nodes');
```

---

## ✅ Verification Checklist

### Backend (Render)
- [ ] Service deployed successfully
- [ ] Health check passing: `https://YOUR-RENDER-URL.onrender.com/health`
- [ ] API responding: `https://YOUR-RENDER-URL.onrender.com/api/nodes`
- [ ] WebSocket accepting connections (test with frontend)

### Frontend (Netlify)
- [ ] Site deployed successfully
- [ ] All pages loading correctly
- [ ] Wallet connection working
- [ ] Node can connect to signaling server
- [ ] Global node map showing nodes
- [ ] Services section accessible
- [ ] Anonymous relay functional

---

## 🐛 Troubleshooting

### Issue: CORS Errors
**Solution**: Signaling server already has CORS enabled. Ensure you're using `https://` not `http://`

### Issue: WebSocket Connection Failed
**Solution**: 
1. Check Render service is running
2. Ensure using `wss://` (not `ws://`)
3. Verify Render URL is correct
4. Check browser console for specific errors

### Issue: Render Service Sleeping (Free Plan)
**Solution**: Free tier services sleep after 15 minutes of inactivity. First request will wake it (30-60 seconds delay).

### Issue: Node Not Appearing on Map
**Solution**:
1. Check signaling server connection in console
2. Verify wallet is connected
3. Ensure node is started (green "Running" status)
4. Wait 10 seconds for automatic refresh

---

## 📊 Monitoring

### Render Dashboard
- View logs: Render Dashboard → Your Service → Logs
- Monitor uptime and performance
- Check for errors

### Netlify Dashboard
- View deployment status
- Check build logs
- Monitor bandwidth usage

---

## 🔒 Security Notes

1. **HTTPS/WSS Only**: All production traffic uses TLS encryption
2. **No Private Keys in Code**: Smart contract interactions use Phantom wallet
3. **CORS Configured**: Backend only accepts requests from your frontend
4. **CSP Headers**: Content Security Policy configured in `netlify.toml`

---

## 💰 Cost Estimate

| Service | Plan | Cost |
|---------|------|------|
| Render (Backend) | Free | $0/month |
| Netlify (Frontend) | Free | $0/month |
| **Total** | | **$0/month** |

**Note**: Free tiers have limitations:
- Render: 750 hours/month (enough for 24/7 uptime)
- Netlify: 100GB bandwidth/month

---

## 📝 Post-Deployment Tasks

1. **Test Full Flow**:
   - Connect wallet
   - Stake tokens
   - Start node
   - Create anonymous relay
   - Verify on Solana Explorer

2. **Update Documentation**:
   - Add live URLs to README
   - Update whitepaper with deployment info

3. **Monitor for 24 Hours**:
   - Check for crashes
   - Monitor error logs
   - Test from multiple locations

---

## 🆘 Support

If you encounter issues:
1. Check browser console for errors
2. Review Render service logs
3. Verify all URLs are updated correctly
4. Test with a fresh wallet for debugging

---

**Last Updated**: October 2025
**Version**: 1.0.0

