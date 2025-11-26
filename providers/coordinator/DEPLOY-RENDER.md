# Deploy WHISTLE Coordinator to Render

## Quick Deploy (Recommended)

### Step 1: Push to GitHub
```bash
cd providers/coordinator
git init
git add .
git commit -m "Initial coordinator deployment"
git remote add origin https://github.com/YOUR_USERNAME/whistle-coordinator.git
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `whistle-coordinator` |
| **Environment** | `Node` |
| **Region** | Oregon (US West) or closest to you |
| **Branch** | `main` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | Free (or Starter for better performance) |

### Step 3: Set Environment Variables

In Render dashboard, go to **Environment** tab and add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3003` |
| `SOLANA_RPC_URL` | `https://rpc.whistle.ninja/rpc` |
| `WHISTLE_PROGRAM_ID` | `whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr` |
| `WHISTLE_MINT` | `6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump` |

### Step 4: Deploy

Click **"Create Web Service"** - Render will automatically:
1. Clone your repo
2. Install dependencies
3. Start the server
4. Provide you with a URL like: `https://whistle-coordinator.onrender.com`

---

## After Deployment

### Update Dashboard to Use Production Backend

Create `.env.local` in `providers/dashboard/`:

```env
NEXT_PUBLIC_COORDINATOR_HTTP=https://whistle-coordinator.onrender.com
NEXT_PUBLIC_COORDINATOR_WS=wss://whistle-coordinator.onrender.com/ws
NEXT_PUBLIC_COORDINATOR_URL=https://whistle-coordinator.onrender.com
```

### Test the Deployment

```bash
# Health check
curl https://whistle-coordinator.onrender.com/health

# Get stats
curl https://whistle-coordinator.onrender.com/api/stats

# List providers
curl https://whistle-coordinator.onrender.com/api/providers
```

---

## Important Notes

### Free Tier Limitations
- **Spin down after 15 minutes of inactivity** - First request after idle takes ~30s
- **750 hours/month** - Enough for continuous running
- **Ephemeral filesystem** - Database resets on redeploy (use Render Disk for persistence)

### For Production (Recommended)
Upgrade to **Starter plan ($7/month)** for:
- No spin-down
- Persistent disk storage
- Better performance

### Add Persistent Disk (Optional)
1. In Render dashboard, go to **Disks** tab
2. Add a disk:
   - **Name**: `coordinator-data`
   - **Mount Path**: `/data`
   - **Size**: 1 GB
3. Set environment variable:
   - `DB_PATH=/data/coordinator.db`

---

## API Endpoints Available

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/stats` | Network statistics |
| `GET /api/providers` | List all providers |
| `POST /api/providers/register` | Register a provider |
| `GET /api/leaderboard` | Provider leaderboard |
| `POST /api/credits/account` | Get/create credit account |
| `POST /api/credits/deposit` | Record a deposit |
| `WS /ws` | WebSocket for real-time updates |

---

## Troubleshooting

### "Service unavailable" error
- Check Render logs in dashboard
- Ensure all environment variables are set
- Wait for service to spin up (free tier)

### Database errors
- Free tier: Database resets on redeploy
- Solution: Add persistent disk or use external database

### WebSocket not connecting
- Ensure using `wss://` (not `ws://`) for production
- Check CORS settings if connecting from different domain

