# Quick Start - Privacy Vault Deployment

## ⚡ Fast Track (Devnet Testing)

### 1. One-Command Setup
```bash
# Clone if needed
cd privacy-vault-program

# Install Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana (if not installed)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Setup devnet
solana config set --url devnet
solana-keygen new --force  # Creates ~/.config/solana/id.json
solana airdrop 5

# Install deps & build
npm install
cargo build-bpf
```

### 2. Deploy (Devnet)
```bash
npm run deploy:devnet
# ✅ Creates program-id.json
```

### 3. Initialize Vault
```bash
npm run init
# ✅ Creates vault-info.json
```

### 4. Update Frontend
Copy values from `vault-info.json` to your index.html:
```javascript
const PRIVACY_VAULT_CONFIG = {
  PROGRAM_ID: 'paste_from_vault-info.json',
  VAULT_STATE: 'paste_from_vault-info.json',
  VAULT_TOKEN_ACCOUNT: 'paste_from_vault-info.json',
  WHISTLE_MINT: '6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump',
};
```

### 5. Test
- Open localhost:3000
- Go to Privacy Vault
- Connect wallet
- Try deposit (devnet tokens)
- Try withdraw

---

## 🚀 Mainnet Deployment (DANGEROUS - READ GUIDE FIRST)

### ⚠️ BEFORE PROCEEDING:

1. **Have you tested on devnet for 2+ weeks?** YES / NO
2. **Has the code been professionally audited?** YES / NO  
3. **Do you have 10-15 SOL for deployment?** YES / NO
4. **Are legal disclaimers in place?** YES / NO
5. **Is team ready to monitor 24/7?** YES / NO

**If ANY answer is NO → DO NOT DEPLOY TO MAINNET**

### If All YES:

```bash
# FINAL WARNING: This uses real money!
solana config set --url mainnet-beta

# Check you have enough SOL
solana balance
# Need: 10+ SOL

# Deploy (COSTS REAL MONEY)
npm run deploy:mainnet

# Initialize (COSTS REAL MONEY)
SOLANA_NETWORK=mainnet-beta npm run init

# Update frontend with mainnet addresses
# Test with $10-100 first
# Monitor for 48 hours
# Gradually scale
```

---

## 🆘 Something Went Wrong?

### Build Errors
```bash
# Update Rust
rustup update
# Clean and rebuild
cargo clean
cargo build-bpf
```

### Deployment Errors
```bash
# Check Solana version
solana --version  # Should be 1.18.0+

# Check network
solana config get

# Check balance
solana balance

# Try again with more SOL
```

### Transaction Failed
- Check RPC endpoint (might be rate-limited)
- Try different RPC: `solana config set --url https://your-rpc-url`
- Increase compute units if needed

---

## 📞 Need Help?

- Check DEPLOYMENT-GUIDE.md for full details
- Test on devnet first (always!)
- Join Solana Discord for technical help
- Consider hiring Solana developer if unsure

**REMEMBER: Real money, real risks. Go slow.**

