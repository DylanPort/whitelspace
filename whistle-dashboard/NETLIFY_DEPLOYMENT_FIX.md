# 🚨 NETLIFY DEPLOYMENT FIX

## Issue
The site shows "Site not found" error on `whistlenet.netlify.app`

## Root Cause
The `netlify.toml` configuration was incorrect for Next.js deployments.

## ✅ What Was Fixed
- **Removed** `publish = ".next"` directive (conflicts with Next.js plugin)
- **Removed** incorrect redirect rule that was interfering with Next.js routing
- **Removed** `NPM_FLAGS = "--legacy-peer-deps"` (not needed)

## 🚀 Steps to Deploy on Netlify

### 1. Create New Site (if not already created)
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect to your GitHub repository: `DylanPort/whitelspace`
4. Configure build settings:
   - **Base directory**: `whistle-dashboard`
   - **Build command**: `npm run build`
   - **Publish directory**: (leave empty - plugin handles it)
   - **Framework preset**: Next.js

### 2. Install Next.js Plugin
The plugin is automatically installed from `netlify.toml`, but if you need to verify:
1. Go to **Site settings** → **Plugins**
2. Confirm `@netlify/plugin-nextjs` is installed

### 3. Set Environment Variables
Go to **Site settings** → **Environment variables** and add:

```
NEXT_PUBLIC_HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
NEXT_PUBLIC_BACKEND_API_URL=https://your-api.onrender.com
NEXT_PUBLIC_WHISTLE_PROGRAM_ID=whttByewzTQzAz3VMxnyJHdKsd7AyNRdG2tDHXVTksr
NEXT_PUBLIC_WHISTLE_MINT=6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump
NEXT_PUBLIC_AUTHORITY_ADDRESS=6BNdVMgx2JZJPvkRCLyV2LLXft4S1cwuqoX2BS9eFyvh
NEXT_PUBLIC_STAKING_POOL_ADDRESS=jVaoYCKUFjHkYw975R7tVvRgns5VdfnnquSp2gzwPXB
NEXT_PUBLIC_TOKEN_VAULT_ADDRESS=6AP8c7sCQsm2FMvNJw6fQN5PnMdkySH75h7EPE2kD3Yq
NEXT_PUBLIC_PAYMENT_VAULT_ADDRESS=CU1ZcHccCbQT8iA6pcb3ZyTjog8ckmDHH8gaAmKfC73G
NEXT_PUBLIC_MIN_PROVIDER_BOND=1000000000
NEXT_PUBLIC_QUERY_COST=10000
NEXT_PUBLIC_WHISTLE_DECIMALS=6
```

### 4. Deploy
1. Push the updated `netlify.toml` to GitHub
2. Netlify will automatically redeploy
3. Or manually trigger: **Deploys** → **Trigger deploy** → **Deploy site**

## 🔍 Troubleshooting

### If Build Fails:
Check the deploy log for errors. Common issues:
- Missing environment variables
- Node version mismatch
- TypeScript errors

### If Site Still Shows 404:
1. Check **Deploys** tab - ensure the build succeeded
2. Check **Functions** tab - ensure Next.js functions deployed
3. Clear Netlify cache: **Site settings** → **Build & deploy** → **Clear cache and retry deploy**

### If Getting "Failed to Load" Errors:
- Check that all environment variables are set correctly
- Verify the RPC URL is working
- Check browser console for CORS errors

## 📝 After Successful Deploy

Your site should be live at:
- **Production**: `https://whistlenet.netlify.app`
- **Custom domain** (if configured): `https://your-domain.com`

The dashboard will:
- ✅ Connect to Solana wallets
- ✅ Display real-time staking data
- ✅ Show provider statistics
- ✅ Enable governance features

---

**Next Step**: After this fix is pushed, go to Netlify and trigger a new deploy!

