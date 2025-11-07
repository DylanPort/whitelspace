# 🔄 Switch to Mainnet for Production

## 🔍 The Issue

The CLI is running on **DEVNET** (test network) by default, but your SOL is on **MAINNET** (production network).

**Error:** "Attempt to debit an account but found no record of a prior credit"  
**Meaning:** No SOL found on devnet

---

## ✅ Solution: Use Mainnet

For production submission, you should use **MAINNET** anyway!

---

## 🚀 Updated Commands (With Mainnet)

### Step 1: Create App on Mainnet

```bash
dapp-store create app --keypair "C:\Users\salva\.config\solana\temp-keypair.json" --url https://api.mainnet-beta.solana.com
```

### Step 2: Create Release on Mainnet

```bash
dapp-store create release --keypair "C:\Users\salva\.config\solana\temp-keypair.json" --url https://api.mainnet-beta.solana.com
```

### Step 3: Submit to Publisher Portal

```bash
dapp-store publish submit --keypair "C:\Users\salva\.config\solana\temp-keypair.json" --url https://api.mainnet-beta.solana.com --complies-with-solana-dapp-store-policies --requestor-is-authorized
```

---

## 💰 Cost on Mainnet

- Create App NFT: ~0.01 SOL (~$2)
- Create Release NFT: ~0.01 SOL (~$2)
- Submit: Free
- **Total: ~0.02-0.03 SOL** (~$4-6)

Your wallet already has SOL, so this will work!

---

## 🎯 Why Mainnet?

**Devnet:**
- Test network
- Free SOL from faucets
- Apps not visible to real users
- For testing only

**Mainnet:**
- Production network
- Real SOL required
- Apps visible in real dApp Store
- **This is what you want!**

---

## 📝 What Just Happened

The good news:
- ✅ Your config.yaml is correct
- ✅ Icon uploaded successfully
- ✅ All validations passed
- ✅ Ready to mint on mainnet

Just need to add `--url https://api.mainnet-beta.solana.com` to use your mainnet SOL!

---

## 🚀 Run This Now

```bash
dapp-store create app --keypair "C:\Users\salva\.config\solana\temp-keypair.json" --url https://api.mainnet-beta.solana.com
```

This will:
1. Use your mainnet SOL
2. Create production App NFT
3. Upload to production storage
4. Ready for real users to see!

---

## ⚠️ Alternative: Get Devnet SOL (Not Recommended)

If you wanted to test on devnet first:
```bash
# Get devnet SOL
solana airdrop 1 <your-wallet-address> --url https://api.devnet.solana.com
```

But for production launch, **go straight to mainnet!**

---

**Ready to launch on mainnet! Run the command above! 🚀**

