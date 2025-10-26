# 💰 Rewards Distribution Guide

## 🎯 Quick Answer to Your Question

**Q: "Can I put the private key in Netlify environment variables?"**

**A: ❌ NO! NEVER put your fee collector private key in Netlify or any cloud service!**

Even in "secret" environment variables, it's risky because:
- Anyone who hacks your Netlify account gets the key
- Serverless functions run in the cloud (potential exposure)
- Function logs could leak it
- You'd lose ALL accumulated fees (~$130k+) if compromised

---

## ✅ THE SAFE WAY: Local Distribution Script

I've created a **secure local script** that you run on **YOUR computer** to distribute rewards.

### How It Works:

```
1. Script fetches all stakers from blockchain
2. Calculates shares (same as frontend: 60% stake, 20% time, 20% rep)
3. Shows you the distribution plan
4. Asks for confirmation
5. Sends $WHISTLE directly to each staker's wallet
6. Logs all transactions for transparency
```

---

## 🚀 Setup (5 minutes)

### Step 1: Install Dependencies

```bash
npm install
```

This installs `dotenv` and `bs58` (already added to package.json)

### Step 2: Create `.env` File

Create a file called `.env` in your project root:

```env
FEE_COLLECTOR_PRIVATE_KEY=your_base58_private_key_here
```

**Get your private key:**
- **Phantom**: Settings → Security & Privacy → Export Private Key
- **Solflare**: Settings → Export Private Key

⚠️ **The `.env` file is already in `.gitignore` so it won't be committed**

### Step 3: Run Distribution

```bash
npm run distribute
```

OR

```bash
node distribute-rewards-local.js
```

---

## 📊 What You'll See

```
🚀 Starting reward distribution...

✅ Loaded fee collector wallet: G1RH...M6Pg
💰 Token decimals: 6
📊 Total staked in pool: 29,229,966 $WHISTLE

💎 Total fees collected: 130,000.50 $WHISTLE
📤 Amount to distribute (90%): 117,000.45 $WHISTLE

🔍 Fetching all stakers...
✅ Found 53 eligible stakers

📋 DISTRIBUTION PLAN:
═══════════════════════════════════════════════════════════════
#     Wallet             Staked          Rep    Share          
───────────────────────────────────────────────────────────────
1     ABC...xyz          5,691,161       1000   25,432.12      
2     DEF...abc          3,421,023       800    18,234.56      
...

⚠️  Proceed with distribution? (yes/no): 
```

Type **"yes"** to proceed, or **"no"** to cancel.

Then it sends:

```
🚀 Starting transfers...

✅ [1/53] Sent 25,432.1200 $WHISTLE to ABC...xyz
   Tx: https://solscan.io/tx/...
✅ [2/53] Sent 18,234.5600 $WHISTLE to DEF...abc
   Tx: https://solscan.io/tx/...
...

═══════════════════════════════════════════════════════════════
✅ DISTRIBUTION COMPLETE!
   Successful: 52
   Failed: 1
   Total processed: 53/53
═══════════════════════════════════════════════════════════════
```

---

## 🔐 Security Features

✅ **Private key stays on YOUR machine** - Never uploaded anywhere
✅ **Manual confirmation required** - Won't send without your approval
✅ **Transaction receipts** - Every transfer logged with Solscan link
✅ **Rate limiting** - 500ms delay between transfers (prevents RPC throttling)
✅ **Error handling** - Skips failed transfers, continues with others
✅ **Automatic exclusions** - Filters out problematic wallet (7NFF...)
✅ **90/10 split** - 90% to stakers, 10% stays as protocol fee

---

## 🔄 When to Run

Run this whenever you want to distribute accumulated fees:

- **Daily**: Automatic small distributions
- **Weekly**: Larger weekly payouts
- **On Threshold**: When fees reach certain amount (e.g., 100k $WHISTLE)
- **On Demand**: Whenever you decide

**Pro Tip:** You could set up a cron job on your computer to run this automatically, but ONLY if your computer is secure and you trust the setup.

---

## ❓ FAQ

### What about automation?

If you want automation, here are safe options:

1. **Cron job on YOUR secure computer** (safest)
2. **VPS you control** with encrypted private key
3. **Separate "distribution wallet"** with limited funds that you refill manually

### What if a staker doesn't have a token account?

The script automatically detects this and skips them (no funds lost). They'll need to create a $WHISTLE token account first.

### Do stakers need to claim?

**NO!** The script sends tokens **directly to their wallet**. They just receive them automatically.

### How much SOL do I need?

~0.01 SOL for ~50 transfers (transaction fees)

### Can I test this first?

Yes! Create a test wallet, add a small amount, and run the script pointing to that wallet. Or run it and type "no" when asked for confirmation to see the distribution plan without sending.

---

## 🆘 Troubleshooting

### Error: "FEE_COLLECTOR_PRIVATE_KEY not found"
- ✅ Make sure you created the `.env` file
- ✅ Check the private key is on a line: `FEE_COLLECTOR_PRIVATE_KEY=yourkey`

### Error: "Private key does not match fee collector wallet"
- ✅ You're using the wrong wallet's private key
- ✅ Need the key for: `G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg`

### Error: "Insufficient funds"
- ✅ Fee collector wallet needs enough SOL for transaction fees
- ✅ Add ~0.01 SOL to the wallet

### Some transfers fail
- ℹ️ This is normal if stakers don't have token accounts
- ✅ Script continues and logs which ones failed
- ✅ Check the console output for specific reasons

---

## 📞 Still Have Questions?

See the full detailed guide: `DISTRIBUTION-SETUP.md`

---

## ⚠️ Final Security Reminder

**NEVER EVER:**
- ❌ Put the private key in Netlify
- ❌ Commit the `.env` file to Git
- ❌ Share your private key with anyone
- ❌ Put it in client-side code
- ❌ Store it unencrypted online

**Your private key = Access to all funds**

Be safe! 🛡️

