# ✅ Correct Solana dApp Store CLI Commands

Based on the actual CLI tool, here's the correct submission process.

---

## 📋 Workflow Overview

1. ✅ `dapp-store init` - Initialize config (DONE)
2. ⏳ `dapp-store create app` - Create app NFT on Solana
3. ⏳ `dapp-store create release` - Create release for your app
4. ⏳ `dapp-store publish submit` - Submit to publisher portal

---

## 🔑 Prerequisites

### You Need:
1. **Solana Wallet Keypair** (JSON file)
2. **SOL tokens** (~0.1 SOL for minting NFTs + fees)
3. **APK ready** ✅ (you have this)

### Get Your Keypair:

**Option A: Export from Phantom**
- Phantom doesn't directly export keypair files
- Need to use Solana CLI or create new keypair

**Option B: Create New Keypair with Solana CLI**
```bash
# Install Solana CLI
npm install -g @solana/web3.js

# Or download from: https://docs.solana.com/cli/install-solana-cli-tools
```

Then generate keypair:
```bash
solana-keygen new --outfile ~/.config/solana/dappstore-keypair.json
```

**Option C: Use Existing Keypair**
If you have a keypair JSON file from wallet export or previous setup.

---

## 🚀 Step-by-Step Submission

### Step 1: Create App NFT ✅

This mints an NFT on Solana representing your app.

```bash
dapp-store create app --keypair <path-to-keypair-file>
```

**Example:**
```bash
dapp-store create app --keypair C:\Users\salva\.config\solana\dappstore-keypair.json
```

**What happens:**
- CLI will prompt you for app details:
  - App name: **Whistle**
  - Package ID: **com.ghostwhistle.app**
  - Description, category, etc.
- Mints NFT on Solana (costs ~0.01 SOL)
- Saves app mint address to `config.yaml`

---

### Step 2: Create Release

This creates a release version of your app.

```bash
dapp-store create release --keypair <path-to-keypair-file>
```

**What happens:**
- Links to your app NFT
- Creates release metadata
- Saves release mint address to `config.yaml`

---

### Step 3: Submit to Publisher Portal

This submits your app + APK to Solana's publisher portal for review.

```bash
dapp-store publish submit \
  --keypair <path-to-keypair-file> \
  --complies-with-solana-dapp-store-policies \
  --requestor-is-authorized
```

**Required attestations:**
- `--complies-with-solana-dapp-store-policies` - You confirm compliance
- `--requestor-is-authorized` - You're authorized to submit

**What happens:**
- Uploads your app info to publisher portal
- References your APK and assets
- Submits for review by Solana Mobile team

---

## 📝 During Create App

When you run `dapp-store create app`, you'll be prompted for:

### Required Information:

**App Identity:**
```
Name: Whistle
Package ID: com.ghostwhistle.app
Category: Finance
```

**Description:**
```
Short: Stake tokens, run privacy nodes, earn rewards on Solana
Long: (copy from CORRECTED-APP-INFO.md)
```

**URLs:**
```
Website: https://whistel.space
Privacy Policy: https://whistel.space/privacy.html
Terms of Service: https://whistel.space/terms.html
```

**Contact:**
```
Email: salvatore.virgini1995@gmail.com
```

**Assets:**
- App Icon: `solana-dapp-store-submission/assets/app-icon-512x512.png`
- Screenshots: All 5 from `solana-dapp-store-submission/screenshots/`
- APK: `solana-dapp-store-submission/whistle-v1.0.0.apk`

---

## 💰 Cost Breakdown

| Action | Cost |
|--------|------|
| Create App NFT | ~0.01 SOL |
| Create Release NFT | ~0.01 SOL |
| Submit to Portal | Free |
| **Total** | **~0.02-0.05 SOL** |

Current SOL price: ~$200 = ~$4-10 total cost

---

## 🔧 Alternative: Use Mainnet

The CLI defaults to **devnet** for testing. For production:

```bash
# Use mainnet
dapp-store create app \
  --keypair <path> \
  --url https://api.mainnet-beta.solana.com
```

**Recommended:** Start with devnet for testing, then mainnet for production.

---

## 📁 Config File

After `dapp-store init`, you have `config.yaml`:

```yaml
# This stores:
- Publisher keypair path
- App mint address (after create app)
- Release mint address (after create release)
- RPC URL
```

---

## ⚡ Quick Reference

```bash
# 1. Create app NFT
dapp-store create app --keypair <keypair-path>

# 2. Create release
dapp-store create release --keypair <keypair-path>

# 3. Submit
dapp-store publish submit \
  --keypair <keypair-path> \
  --complies-with-solana-dapp-store-policies \
  --requestor-is-authorized

# Optional: Dry run first (test without spending SOL)
dapp-store create app --keypair <keypair-path> --dry-run
```

---

## 🆘 Troubleshooting

### "No keypair found"
**Solution:** You need a Solana keypair JSON file.

**Get one:**
1. Install Solana CLI: https://docs.solana.com/cli/install-solana-cli-tools
2. Generate: `solana-keygen new --outfile ~/.config/solana/keypair.json`
3. Fund with SOL from exchange

### "Insufficient funds"
**Solution:** Add SOL to your keypair wallet.

**How:**
1. Get wallet address: `solana-keygen pubkey <keypair-path>`
2. Send SOL from Phantom/exchange to that address
3. Wait for confirmation
4. Retry command

### "RPC request failed"
**Solution:** RPC might be slow. Try:
- Add `--url https://api.mainnet-beta.solana.com` (or another RPC)
- Or use a premium RPC (Helius, QuickNode)

---

## 📖 Official Documentation

- **CLI Reference:** https://docs.solanamobile.com/dapp-publishing/app-submission
- **Publisher Policy:** https://docs.solanamobile.com/dapp-publishing/intro
- **Solana CLI Tools:** https://docs.solana.com/cli/install-solana-cli-tools

---

## ✅ What You Have Ready

- [x] APK: `whistle-v1.0.0.apk` (2.01 MB)
- [x] Icon: `app-icon-512x512.png`
- [x] Screenshots: 5 images
- [x] Privacy Policy: Live ✅
- [x] Terms: Live ✅
- [x] All listing info ready
- [x] CLI installed ✅
- [x] Config initialized ✅

**Still need:**
- [ ] Solana keypair with SOL
- [ ] Run create app
- [ ] Run create release
- [ ] Run publish submit

---

## 🎯 Next Step: Get Keypair

**Option 1: Create New Keypair**
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate keypair
solana-keygen new --outfile ~/.config/solana/dappstore-keypair.json

# Get address
solana-keygen pubkey ~/.config/solana/dappstore-keypair.json

# Fund it with SOL from Phantom or exchange
```

**Option 2: Export from Existing Wallet**
- Check if your wallet can export keypair as JSON
- Or create new keypair specifically for dApp Store

---

**Once you have keypair + SOL, run the 3 commands above! 🚀**

