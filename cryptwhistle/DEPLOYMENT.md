# 🚀 CryptWhistle Deployment Guide

## Quick Deploy

### Frontend (Netlify) - Documentation Site

1. **Push to GitHub** (already done if following these steps)

2. **Deploy to Netlify:**
   ```bash
   # Option 1: Netlify CLI (recommended)
   cd cryptwhistle
   netlify deploy --prod
   
   # Option 2: Netlify Dashboard
   # - Go to https://app.netlify.com
   # - Click "Add new site" > "Import an existing project"
   # - Connect your GitHub repo
   # - Set base directory: cryptwhistle
   # - Set publish directory: docs-site
   # - Click "Deploy site"
   ```

3. **Your documentation will be live at:**
   - `https://[your-site-name].netlify.app`
   - Custom domain: Set up in Netlify dashboard

---

### Backend (Render) - API Server

1. **Push to GitHub** (already done if following these steps)

2. **Deploy to Render:**
   ```bash
   # Option 1: Render Dashboard (recommended)
   # - Go to https://dashboard.render.com
   # - Click "New +" > "Web Service"
   # - Connect your GitHub repo
   # - Select: cryptwhistle/backend
   # - Render will auto-detect render.yaml
   # - Click "Create Web Service"
   
   # Option 2: Render CLI
   cd cryptwhistle/backend
   render deploy
   ```

3. **Your backend will be live at:**
   - `https://cryptwhistle-backend.onrender.com`
   - Note: First deployment may take 5-10 minutes

---

## Environment Variables

### Backend (Render)
Set these in Render dashboard after deployment:
- `PORT`: 3000 (auto-set)
- `NODE_ENV`: production (auto-set)
- `ALLOWED_ORIGINS`: Your Netlify domain (e.g., `https://cryptwhistle.netlify.app`)

### Frontend (Netlify)
No environment variables needed - static site!

---

## Post-Deployment

### 1. Update API URL in Playground
After backend is deployed, update the API URL in `docs-site/playground.html`:
```javascript
// Change this line
const API_BASE = 'http://localhost:3000';

// To your Render URL
const API_BASE = 'https://cryptwhistle-backend.onrender.com';
```

### 2. Update CORS
In `backend/server.js`, update allowed origins:
```javascript
app.use(cors({
  origin: ['https://cryptwhistle.netlify.app', 'http://localhost:3001']
}));
```

### 3. Test Everything
- Visit your Netlify site
- Click "Try API Playground"
- Test sentiment analysis, classification, and Q&A
- Verify all models load and run

---

## Monitoring

### Backend Health
- `https://cryptwhistle-backend.onrender.com/health`
- Should return: `{"status":"ok","message":"CryptWhistle Backend is running (Orchestration Only)"}`

### Backend Models
- `https://cryptwhistle-backend.onrender.com/api/models`
- Should return list of available AI models

---

## Costs

### Netlify (Frontend)
- **Free tier**: 100GB bandwidth, 300 build minutes/month
- **Pro**: $19/month for more bandwidth
- Your docs site is tiny - free tier is perfect!

### Render (Backend)
- **Free tier**: 750 hours/month, spins down after inactivity
- **Starter**: $7/month, always-on, no spin-down
- Recommended: Start with free, upgrade if needed

---

## Troubleshooting

### "Site not found"
- Check base directory is set to `cryptwhistle`
- Check publish directory is set to `docs-site`

### "Backend connection failed"
- Verify Render service is running (check dashboard)
- Check CORS settings allow your Netlify domain
- Check API URL in playground.html is correct

### "Models not loading"
- First run is slow (models download from CDN)
- Check browser console for errors
- Verify WebAssembly is enabled in browser

---

## Custom Domains (Optional)

### Netlify
1. Go to Site settings > Domain management
2. Add custom domain
3. Follow DNS setup instructions

### Render
1. Go to Service settings > Custom Domains
2. Add custom domain
3. Update DNS records as instructed

---

## 🎉 You're Live!

Your CryptWhistle platform is now deployed:
- ✅ Documentation: Professional GitBook-style docs
- ✅ API Playground: Interactive testing environment
- ✅ Backend: Privacy-preserving AI orchestration
- ✅ Client-side AI: Real browser-based inference

**Share your deployment:**
- Twitter/X: @Whistle_Ninja
- Telegram: @whistleninja

---

## Need Help?

- Check logs in Netlify/Render dashboard
- Review browser console for errors
- Verify all URLs are updated (localhost → production)
- Test with `curl` to isolate frontend vs backend issues

---

**Pro Tip:** Keep localhost versions working for development, update production URLs only in deployed versions!

