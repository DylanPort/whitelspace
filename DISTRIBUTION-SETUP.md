# 🛡️ Secure Reward Distribution Setup

## ⚠️ SECURITY FIRST!

**NEVER:**
- ❌ Put private keys in Netlify
- ❌ Commit private keys to Git
- ❌ Share private keys with anyone
- ❌ Put private keys in client-side code

**ALWAYS:**
- ✅ Run distribution script on YOUR local machine
- ✅ Keep private keys in `.env` files (added to `.gitignore`)
- ✅ Backup your private key securely (encrypted)

---

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install dotenv bs58
```

### 2. Create `.env` File

Create a file called `.env` in your project root:

```env
FEE_COLLECTOR_PRIVATE_KEY=your_base58_private_key_here
```

**How to get your private key in Base58:**
- **Phantom:** Settings → Export Private Key → Copy
- **Solflare:** Settings → Export Private Key → Copy

### 3. Verify `.gitignore`

Make sure `.env` is in your `.gitignore`:

```
.env
.env.local
```

### 4. Run the Distribution Script

```bash
node distribute-rewards-local.js
```

The script will:
1. ✅ Fetch all eligible stakers
2. ✅ Calculate their shares (60% stake, 20% time, 20% reputation)
3. ✅ Show you the distribution plan
4. ⚠️  Ask for confirmation
5. ✅ Transfer tokens to each staker
6. ✅ Log all transactions

---

## 📋 Script Features

- **Automatic calculation** using the same formula as the frontend
- **Excludes problematic wallets** (7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF)
- **90/10 split**: 90% to stakers, 10% protocol fee stays
- **Rate limiting**: Prevents RPC throttling
- **Transaction receipts**: Solscan links for verification
- **Error handling**: Skips failed transfers, continues with others
- **Confirmation required**: Won't send without your approval

---

## 📊 Example Output

```
🚀 Starting reward distribution...

✅ Loaded fee collector wallet: G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg
💰 Token decimals: 6
📊 Total staked in pool: 29,229,966 $WHISTLE

💎 Total fees collected: 130,000.50 $WHISTLE
📤 Amount to distribute (90%): 117,000.45 $WHISTLE

🔍 Fetching all stakers...
Found 54 node accounts

✅ Found 53 eligible stakers

📋 DISTRIBUTION PLAN:
═══════════════════════════════════════════════════════════════════════════════
#     Wallet                                        Staked          Rep        Share          
───────────────────────────────────────────────────────────────────────────────
1     ABC...xyz                                     5,691,161       1000       25,432.12      
2     DEF...abc                                     3,421,023       800        18,234.56      
...

⚠️  Proceed with distribution? (yes/no): yes

🚀 Starting transfers...

✅ [1/53] Sent 25,432.1200 $WHISTLE to ABC...xyz
   Tx: https://solscan.io/tx/...
✅ [2/53] Sent 18,234.5600 $WHISTLE to DEF...abc
   Tx: https://solscan.io/tx/...
...

═══════════════════════════════════════════════════════════════════════════════
✅ DISTRIBUTION COMPLETE!
   Successful: 52
   Failed: 1
   Total processed: 53/53
═══════════════════════════════════════════════════════════════════════════════
```

---

## 🔄 When to Run

Run this script whenever you want to distribute accumulated fees:
- Daily
- Weekly
- When fees reach a certain threshold
- On demand

---

## 🛠️ Troubleshooting

### "Private key does not match fee collector wallet"
- ✅ Make sure you're using the private key for `G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg`

### "No token account, skipping"
- ℹ️ Some stakers haven't created their $WHISTLE token account yet
- ✅ Script automatically skips them (no funds lost)

### "RPC rate limit"
- ✅ Script has built-in 500ms delay between transfers
- ℹ️ If it still happens, the script will retry automatically

### "Insufficient funds"
- ⚠️ Make sure the fee collector wallet has enough SOL for transaction fees
- 💡 ~0.01 SOL is needed for ~50 transfers

---

## 🔐 Security Checklist

Before running:
- [ ] `.env` file is in `.gitignore`
- [ ] Private key is NOT in any committed files
- [ ] Running on YOUR local machine (not a server)
- [ ] Backup of private key stored securely
- [ ] You've verified the wallet address matches

---

## 📞 Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your RPC endpoint is working
3. Ensure you have enough SOL for transaction fees
4. Check that the fee collector wallet has the tokens to distribute

---

**Remember: Security is paramount! Never expose your private keys.** 🛡️

