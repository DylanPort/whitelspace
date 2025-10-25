# 🚀 Netlify Deployment Guide for Ghost Whistle

## Prerequisites

1. ✅ Netlify account (https://netlify.com)
2. ✅ GitHub/GitLab repository
3. ✅ Node.js installed locally

---

## 📦 Deployment Steps

### 1. Push to Git

```bash
git add .
git commit -m "feat: x402 payment system with Netlify functions"
git push origin main
```

### 2. Deploy to Netlify

**Option A: Netlify CLI (Recommended)**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize site
netlify init

# Deploy
netlify deploy --prod
```

**Option B: Netlify Dashboard**

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to your Git repository
4. Configure build settings:
   - **Build command:** `npm install`
   - **Publish directory:** `.`
   - **Functions directory:** `netlify/functions`

### 3. Environment Variables

Add these in Netlify Dashboard → Site settings → Environment variables:

```
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba
```

---

## 🔧 Configuration Files

### `netlify.toml`
- ✅ Functions configured
- ✅ Redirects for x402 endpoints
- ✅ Build settings

### `netlify/functions/`
- ✅ `x402-quote.js` - Payment quote generation
- ✅ `x402-confirm.js` - Payment verification
- ✅ `x402-validate.js` - Token validation

---

## 💳 X402 Payment System

### Endpoints (Production)

```
POST https://your-site.netlify.app/x402/quote
POST https://your-site.netlify.app/x402/confirm
POST https://your-site.netlify.app/x402/validate
```

### Pricing

- **Amount:** 10,000 WHISTLE per use
- **Access Duration:** 15 minutes
- **Fee Collector:** `G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg`

---

## 🧪 Testing

### Local Development

```bash
# Start local server
npm run dev

# In another terminal, test functions
netlify dev
```

### Production Testing

1. Deploy to Netlify
2. Visit your site
3. Try a gated feature
4. Verify payment modal appears
5. Approve transaction in Phantom
6. Verify access granted

---

## 📊 Monitoring

### Netlify Dashboard

- Functions → Logs
- Analytics → Functions
- Site → Deploy logs

### Console Logs

```javascript
// Check x402 gateway URL
console.log(window.X402_GATEWAY);

// Payment flow
💳 x402 payment system ENABLED
🌐 x402 Gateway: https://your-site.netlify.app
💳 Payment details: { amount: "10000000000", ... }
✅ Payment confirmed!
```

---

## 🔐 Security Notes

1. **RPC Key:** Store Helius API key in Netlify environment variables
2. **Fee Collector:** Hardcoded in functions (secure)
3. **Token Validation:** Server-side verification
4. **CORS:** Configured for production domains

---

## 🐛 Troubleshooting

### "All RPCs failed"
- Check Helius API key in environment variables
- Verify Solana mainnet status

### "Payment Failed"
- Ensure user has 10,000+ WHISTLE
- Check fee collector ATA exists
- Verify transaction signature

### Functions Not Working
- Check Netlify build logs
- Verify functions directory: `netlify/functions/`
- Test functions locally with `netlify dev`

---

## 📝 Production Checklist

- [x] Netlify functions created
- [x] Environment variables set
- [x] CORS headers configured
- [x] x402 gateway auto-detection
- [x] Premium payment modals
- [x] 10,000 WHISTLE pricing
- [x] Fee collector wallet set
- [x] Git repository ready
- [x] Deployment guide created

---

## 🎉 Success!

Once deployed, your Ghost Whistle app will have:

✅ **Working x402 payments** on Netlify
✅ **Premium payment modals** with your branding
✅ **Serverless functions** for scalability
✅ **10,000 WHISTLE** per feature access
✅ **15-minute access tokens**
✅ **Production-ready** infrastructure

**Deploy URL:** `https://your-site.netlify.app`

🚀 **Ready to deploy!**

