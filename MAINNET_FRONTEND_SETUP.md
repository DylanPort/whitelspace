# 🚀 Whistlenet Frontend - Mainnet Setup Guide

## ✅ **Your Mainnet Deployment**

All services are now configured to connect to your live smart contract!

### 📍 **Mainnet Addresses**
```
Program ID:     WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt
Staking Pool:   F7BtDzqpATy6dQ8gaxoLJzHWVVEuaopJBhUkGNuFzdmh
Token Vault:    F4BPRL7wJS67bKVT8d8UvGFdVouEZ1ae1EoDrKeL3hkZ
Payment Vault:  Ey5yKxziYHTUzAGKuBhFJdCokzqUqPKcfVo2TMSyvSeP
WHISTLE Token:  6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump
```

---

## 🔧 **Setup Instructions**

### 1. **Configure Dashboard Environment**

Create `whistle-dashboard/.env.local`:

```bash
cd whistle-dashboard
cat > .env.local << 'EOF'
# Whistlenet Dashboard - Mainnet
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_WHISTLE_PROGRAM_ID=WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt
NEXT_PUBLIC_WHISTLE_MINT=6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump
NEXT_PUBLIC_NETWORK=mainnet-beta
NEXT_PUBLIC_API_URL=http://localhost:8080
EOF
```

**Recommended: Use a Premium RPC Provider**
```bash
# Better performance and higher rate limits
# Helius (recommended)
NEXT_PUBLIC_SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Alchemy
NEXT_PUBLIC_SOLANA_RPC=https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY

# QuickNode
NEXT_PUBLIC_SOLANA_RPC=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_KEY/

# Ankr
NEXT_PUBLIC_SOLANA_RPC=https://rpc.ankr.com/solana/YOUR_KEY
```

### 2. **Install Dashboard Dependencies**

```bash
cd whistle-dashboard
npm install
# or
yarn install
# or
pnpm install
```

### 3. **Start Provider API Server**

```bash
cd whistlenet/provider/api
npm install  # if not already done
npm run mainnet
```

The API server will:
- ✅ Connect to Solana mainnet
- ✅ Use your deployed smart contract
- ✅ Read on-chain data (no write operations)
- ✅ Serve data to the dashboard

### 4. **Start Dashboard**

```bash
cd whistle-dashboard
npm run dev
```

Access at: **http://localhost:3000**

---

## 🎯 **What's Already Configured**

### ✅ **SDK** (`whistlenet/sdk/src/constants.ts`)
- Updated `PROGRAM_ID` → `WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt`
- Updated `QUERY_COST` → `10,000 lamports` (0.00001 SOL)
- Updated `COOLDOWN_PERIOD` → `604,800 seconds` (7 days)

### ✅ **Dashboard** (`whistle-dashboard/lib/contract.ts`)
- Updated `WHISTLE_PROGRAM_ID` → mainnet address
- Updated `QUERY_COST` → 0.00001 SOL
- Added deployed account addresses:
  - `STAKING_POOL_ADDRESS`
  - `TOKEN_VAULT_ADDRESS`
  - `PAYMENT_VAULT_ADDRESS`
  - `AUTHORITY_ADDRESS`

### ✅ **Provider API** (`whistlenet/provider/api/.env`)
- Configured for mainnet connection
- Database path set to mainnet DB
- Ready to serve real on-chain data

---

## 🧪 **Testing the Connection**

### Test 1: Check Dashboard Loads
```bash
# Start dashboard
cd whistle-dashboard
npm run dev

# Open browser to http://localhost:3000
# You should see the dashboard with real mainnet data
```

### Test 2: Verify Smart Contract Connection
```bash
# In browser console (F12)
# The dashboard should fetch real data from mainnet
```

### Test 3: Check API Server
```bash
curl http://localhost:8080/health

# Should return:
# {"status":"ok","network":"mainnet-beta"}
```

### Test 4: Query Staking Pool
```bash
curl http://localhost:8080/api/staking-pool

# Should return real data from F7BtDzqpATy6dQ8gaxoLJzHWVVEuaopJBhUkGNuFzdmh
```

---

## 📱 **Available Features**

Once running, users can:

### For Stakers
- ✅ View staking pool stats
- ✅ Stake WHISTLE tokens (if they have WHISTLE)
- ✅ View their staked amount and access tokens
- ✅ Claim staker rewards
- ✅ Unstake (with 7-day cooldown)

### For Providers
- ✅ Register as a provider (if they have 1000+ WHISTLE)
- ✅ View provider stats
- ✅ Update endpoint
- ✅ Claim earnings
- ✅ View reputation score

### For Developers
- ✅ View query cost (0.00001 SOL)
- ✅ See developer tier benefits
- ✅ Register as developer (with referral)
- ✅ View rebate percentage based on stake

### For All Users
- ✅ View network stats
- ✅ See total staked amount
- ✅ View all registered providers
- ✅ Check payment vault balance
- ✅ View recent transactions

---

## 🔒 **Security Notes**

### ⚠️ **DO NOT Commit**
- Never commit `.env.local` files
- Never commit private keys
- Never commit API keys
- These files are in `.gitignore`

### ✅ **Safe to Commit**
- `.env.example` files
- Configuration documentation
- Public addresses (already on-chain)

---

## 🚀 **Production Deployment**

### Deploy Dashboard to Vercel

```bash
cd whistle-dashboard

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard:
# Settings → Environment Variables → Add:
# - NEXT_PUBLIC_SOLANA_RPC
# - NEXT_PUBLIC_WHISTLE_PROGRAM_ID
# - NEXT_PUBLIC_WHISTLE_MINT
# - NEXT_PUBLIC_NETWORK
# - NEXT_PUBLIC_API_URL
```

### Deploy API to a VPS/Cloud

```bash
# On your server
git clone <your-repo>
cd whistlenet/provider/api

# Install dependencies
npm install

# Create .env file with mainnet config
cat > .env << 'EOF'
MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
WHISTLE_PROGRAM_ID=WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt
PORT=8080
EOF

# Start with PM2 (process manager)
npm install -g pm2
pm2 start npm --name "whistle-api" -- run mainnet
pm2 save
pm2 startup
```

---

## 🐛 **Troubleshooting**

### Issue: "Failed to fetch"
**Solution**: Check your RPC endpoint is working
```bash
curl -X POST https://api.mainnet-beta.solana.com -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

### Issue: "Account not found"
**Solution**: Verify program is deployed
```bash
solana program show WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt --url mainnet-beta
```

### Issue: "Transaction failed"
**Possible causes**:
- Insufficient SOL balance
- Insufficient WHISTLE balance
- Cooldown period not elapsed
- Provider already registered

### Issue: Dashboard shows old addresses
**Solution**: Clear browser cache and restart dev server
```bash
# Kill the process
Ctrl+C

# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

---

## 📊 **Monitoring**

### Watch API Logs
```bash
cd whistlenet/provider/api
npm run mainnet | tee -a logs/api.log
```

### Monitor Smart Contract
- **Solscan**: https://solscan.io/account/WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt
- **Explorer**: https://explorer.solana.com/address/WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt

### Check Payment Vault Balance
```bash
solana balance Ey5yKxziYHTUzAGKuBhFJdCokzqUqPKcfVo2TMSyvSeP --url mainnet-beta
```

---

## 🎉 **You're Live!**

Your Whistlenet frontend is now connected to mainnet! 

**Next steps:**
1. Test all features with a small amount
2. Share dashboard URL with team
3. Monitor for any errors
4. Gather user feedback
5. Iterate and improve

---

## 📚 **Additional Resources**

- **Smart Contract Details**: See `WHISTLENET_MAINNET_DEPLOYMENT.md`
- **SDK Documentation**: See `whistlenet/sdk/README.md`
- **API Documentation**: See `whistlenet/provider/api/README.md`
- **Dashboard Guide**: See `whistle-dashboard/README.md`

---

**Need help?** Check the logs or open an issue!

🌐 **Solana Mainnet** | 🎯 **WhSt Vanity Address** | 🚀 **Live & Running**

