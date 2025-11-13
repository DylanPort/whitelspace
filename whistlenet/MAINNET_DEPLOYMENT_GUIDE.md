# 🚨 WHISTLE Network - Mainnet Deployment Guide

**⚠️ WARNING: MAINNET = REAL MONEY ⚠️**

This guide will help you deploy WHISTLE to Solana **mainnet-beta** where real SOL and tokens are at stake.

---

## ⚠️ CRITICAL PRE-DEPLOYMENT CHECKLIST

Before deploying to mainnet, ensure:

- [ ] Smart contract has been thoroughly tested on devnet
- [ ] All security audits are complete
- [ ] You have sufficient SOL for deployment (~5-10 SOL)
- [ ] You have a hardware wallet or secure key management
- [ ] You understand the risks (real money, irreversible)
- [ ] You have tested all functions on devnet first
- [ ] You have a rollback plan
- [ ] You have monitoring set up
- [ ] You have insurance/risk management

**IF YOU'RE NOT 100% SURE, TEST MORE ON DEVNET FIRST.**

---

## 💰 COSTS

### Smart Contract Deployment:
- **Program Deployment:** ~2-5 SOL (depends on contract size)
- **Account Creation:** ~0.01 SOL per account
- **Testing Transactions:** ~0.01 SOL
- **Total Estimated:** 5-10 SOL

### API Infrastructure:
- **VPS/Server:** $10-50/month
- **Database (PostgreSQL):** $10-30/month
- **Domain:** $10-15/year
- **SSL Certificate:** Free (Let's Encrypt)

---

## 📋 STEP-BY-STEP MAINNET DEPLOYMENT

### STEP 1: Prepare Mainnet Wallet

```bash
# Create new mainnet wallet (or use existing)
solana-keygen new --outfile ~/.config/solana/mainnet-deployer.json

# Set to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Fund wallet (buy SOL from exchange, transfer)
# You need 5-10 SOL minimum

# Check balance
solana balance
```

**⚠️ BACKUP YOUR KEYS SECURELY! NEVER SHARE PRIVATE KEYS!**

---

### STEP 2: Deploy Smart Contract to Mainnet

```bash
# Navigate to contract directory
cd C:\Users\salva\Downloads\Encrypto\contracts\encrypted-network-access-token

# Build for mainnet (release mode)
cargo build-bpf --release

# Deploy to mainnet
solana program deploy target/deploy/encrypted_network_access_token.so

# Note the Program ID - YOU'LL NEED THIS!
# Example: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

**⚠️ SAVE THE PROGRAM ID IMMEDIATELY!**

---

### STEP 3: Initialize Staking Pool (Mainnet)

```bash
# Use your deployed program ID
export PROGRAM_ID="YOUR_DEPLOYED_PROGRAM_ID_HERE"
export WHISTLE_MINT="6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump"

# Initialize pool
# (You'll need to create a client script for this)
```

---

### STEP 4: Update API Server for Mainnet

See configuration files in `provider/config/`

---

### STEP 5: Monitor & Test

- Monitor all transactions
- Start with small amounts
- Test all functions
- Watch for errors
- Have emergency shutdown ready

---

## 🔐 SECURITY CONSIDERATIONS

### Smart Contract:
- ✅ Audited (done)
- ⚠️ External audit recommended
- ⚠️ Bug bounty program recommended
- ⚠️ Multi-sig for admin functions
- ⚠️ Emergency pause mechanism

### Infrastructure:
- ✅ Rate limiting
- ✅ DDoS protection
- ⚠️ SSL/TLS required
- ⚠️ Firewall configured
- ⚠️ Regular backups

### Keys:
- ⚠️ Hardware wallet (Ledger/Trezor)
- ⚠️ Multi-sig wallet
- ⚠️ Never store keys in code
- ⚠️ Regular key rotation
- ⚠️ Encrypted backups

---

## ⚡ QUICK START (AUTOMATED)

I can create scripts to automate this process.

**Option 1:** Full automated deployment (risky)  
**Option 2:** Step-by-step guided deployment (safer)  
**Option 3:** Deploy API to mainnet first, contract later (safest)

---

## 🎯 RECOMMENDED APPROACH

### Phase 1: API to Mainnet (LOW RISK) ✅
- Update API server to connect to mainnet RPC
- No smart contract deployment needed
- No funds at risk
- Test with read-only queries
- **START HERE** ⬅️

### Phase 2: Smart Contract to Mainnet (HIGH RISK) ⚠️
- Deploy contract with real SOL
- Initialize pools
- Test with small amounts
- Gradually increase usage
- **DO THIS AFTER PHASE 1**

---

## 📊 RISK LEVELS

| Action | Risk | Cost | Reversible |
|--------|------|------|-----------|
| API to mainnet | 🟢 LOW | $0 | ✅ Yes |
| Read blockchain | 🟢 LOW | $0 | ✅ Yes |
| Deploy contract | 🔴 HIGH | 5-10 SOL | ❌ No |
| Initialize pool | 🟡 MEDIUM | 0.01 SOL | ⚠️ Partial |
| First stake | 🔴 HIGH | Variable | ⚠️ If bugs |

---

## ✅ WHAT I RECOMMEND

**Start with Phase 1 - API to Mainnet:**
1. Update API server to mainnet RPC (5 minutes)
2. Test read-only queries (safe, free)
3. Verify all data fetching works
4. No risk, no cost
5. Full mainnet data access

**Then consider Phase 2 - Smart Contract:**
1. More testing on devnet
2. External security audit ($5k-20k)
3. Insurance/risk management
4. Gradual rollout
5. Emergency procedures

---

## 🚀 READY TO START?

**Which approach do you want?**

**A)** Phase 1: API to mainnet NOW (safe, free, quick) ✅ **RECOMMENDED**  
**B)** Phase 2: Full deployment with smart contract (risky, costly)  
**C)** Test more on devnet first (safest)  

---

**⚠️ Remember: Mainnet = Real Money. Be Careful! ⚠️**

