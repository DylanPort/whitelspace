# 🔐 Netlify Claim Button Setup Guide

## ✅ Implementation Complete!

The claim button functionality has been added to your website. Here's how to set it up:

---

## 🔑 Step 1: Get Your Private Key

### **From Phantom Wallet:**

1. Open Phantom wallet
2. Click Settings (⚙️)
3. Security & Privacy
4. **Export Private Key**
5. Enter your password
6. **Copy the key** (it's already in Base58 format!)

**Format:** Looks like `5J7wKPMqZ...xyz123` (~88 characters)

✅ **This is the correct format** - Use it as-is!

---

## 🌐 Step 2: Add Private Key to Netlify

### Method 1: Via Netlify Dashboard (Recommended)

1. Go to your Netlify dashboard: https://app.netlify.com
2. Select your site
3. Click **Site settings**
4. Click **Environment variables** (left sidebar)
5. Click **Add a variable**
6. Enter:
   ```
   Key: FEE_COLLECTOR_PRIVATE_KEY
   Value: [paste your private key here]
   ```
7. **Important:** Select "Sensitive variable" checkbox (this encrypts it)
8. Click **Create variable**

### Method 2: Via Netlify CLI

```bash
netlify env:set FEE_COLLECTOR_PRIVATE_KEY "your_private_key_here"
```

---

## 🚀 Step 3: Deploy

### Option A: Push to Git (Automatic)

```bash
git add .
git commit -m "✨ Add fee rewards claim button"
git push origin main
```

Netlify will automatically deploy with the new functions!

### Option B: Manual Deploy

1. Drag your project folder to Netlify dashboard
2. Functions will be deployed automatically

---

## 🎯 Step 4: Test It!

1. Go to your website
2. Connect your wallet
3. Navigate to "Claim Rewards" section
4. You should see **TWO sections**:

```
┌─────────────────────────────────────────────┐
│  💰 PENDING_REWARDS                         │
│  [Your staking rewards]                     │
│  [Claim Rewards] ← From smart contract     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  🔥 FEE_REWARDS (x402 Payments)             │
│  [Your calculated share]                    │
│  [Claim Fee Rewards] ← YOU PAY TX FEE!     │
└─────────────────────────────────────────────┘
```

---

## ✅ How It Works

### When User Connects Wallet:

1. ✅ Automatically checks if they're eligible
2. ✅ Calculates their share (60% stake, 20% time, 20% rep)
3. ✅ Shows claimable amount

### When User Clicks "Claim Fee Rewards":

1. Backend creates transaction (fee collector signs first)
2. Frontend presents to user
3. **User signs** (and pays ~0.000005 SOL tx fee)
4. Transaction submitted
5. **User receives their $WHISTLE!** 🎉

---

## 🔐 Security Features

### What's Protected:

✅ **Private key encrypted** in Netlify environment variables
✅ **Not visible** in logs or source code
✅ **Only accessible** by serverless functions
✅ **2FA protection** via Netlify account security
✅ **Can be rotated** anytime if compromised

### Best Practices:

1. ✅ Enable 2FA on Netlify account
2. ✅ Limit team access
3. ✅ Monitor claims regularly
4. ✅ Consider using a separate "distribution wallet" (see below)

---

## 💡 Pro Tip: Use a Distribution Wallet

For extra security:

1. Create a **new wallet** just for distributions
2. Transfer only what you need to distribute
3. Use that wallet's private key in Netlify
4. If compromised, you only lose what's in that wallet
5. Easy to rotate to a new distribution wallet

**Setup:**
```
1. Create new wallet
2. Send 100k $WHISTLE to it (example)
3. Use its private key in Netlify
4. Refill when it runs low
5. If compromised, create new wallet and update env var
```

---

## 📊 How Shares Are Calculated

Each user's share is calculated using:

- **60% based on staked amount** (more stake = more rewards)
- **20% based on stake duration** (longer staked = bonus)
- **20% based on reputation** (more relays = bonus)

**Total distributable:** 90% of fee pool (10% protocol fee)

---

## 🔍 Checking Claims

### Via Console (while testing):

Open browser console to see:
```
🔍 Checking fee rewards eligibility for: 7DDeG...
✅ Eligible for fee rewards: 1,234.56 $WHISTLE
💰 Claiming fee rewards...
✅ Claim successful! Tx: https://solscan.io/tx/...
```

### Via Solscan:

Check the fee collector wallet:
`G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg`

You'll see outgoing transactions to users who claimed!

---

## ❓ Troubleshooting

### "Environment variable not found"
- ✅ Make sure you added `FEE_COLLECTOR_PRIVATE_KEY` in Netlify
- ✅ Redeploy the site after adding it
- ✅ Check it's marked as "Sensitive"

### "Private key does not match"
- ✅ You need the private key for wallet: `G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg`
- ✅ Make sure you copied the correct wallet's key

### "No token account"
- ℹ️ User needs to create $WHISTLE token account first
- ✅ Tell them to buy any amount on pump.fun

### "User not eligible"
- ℹ️ They're not staking or have been excluded
- ✅ Check they have staked $WHISTLE
- ✅ Check their wallet isn't `7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF`

### "Insufficient SOL"
- ℹ️ User needs SOL for transaction fee
- ✅ They need ~0.00001 SOL in their wallet

---

## 📞 Support Checklist

Before asking for help, verify:

- [ ] Private key added to Netlify environment variables
- [ ] Private key is marked as "Sensitive"
- [ ] Site has been redeployed after adding env var
- [ ] Private key is from wallet `G1RH...M6Pg`
- [ ] Fee collector wallet has $WHISTLE to distribute
- [ ] User has staked $WHISTLE tokens
- [ ] User has SOL for transaction fee
- [ ] Browser console shows no errors

---

## 🎉 Success Indicators

You know it's working when:

✅ User connects wallet
✅ Sees claimable amount (or "Not eligible")
✅ Button shows "CLAIM_FEE_REWARDS"
✅ Clicking prompts wallet signature
✅ Transaction confirms
✅ User receives $WHISTLE
✅ Toast shows success message

---

## 🔄 Monitoring

### Watch for:

- Transaction volume (how many claims per day)
- Fee collector balance (refill if using distribution wallet)
- Failed claims (check console for errors)
- Suspicious activity (unexpected claims)

### Logs:

Netlify function logs show:
```
💰 Calculating claimable reward for: 7DDeG...
✅ User 7DDeG... can claim: 1234.5600 $WHISTLE
🔐 Signing claim for 7DDeG... Amount: 1234560000
✅ Partially signed transaction for 7DDeG...
```

---

## 🛡️ Security Reminders

**DO:**
- ✅ Use Netlify's "Sensitive variable" option
- ✅ Enable 2FA on Netlify account
- ✅ Consider using a distribution wallet
- ✅ Monitor claims regularly
- ✅ Rotate key if compromised

**DON'T:**
- ❌ Commit private key to git
- ❌ Share private key with anyone
- ❌ Store unencrypted anywhere else
- ❌ Use main wallet if you're worried
- ❌ Forget to redeploy after adding env var

---

## ✅ You're All Set!

Your claim button system is now live! Users can:

1. Connect wallet
2. See their claimable fee rewards
3. Click claim (they pay tiny tx fee)
4. Receive their share instantly!

**No more manual distributions!** 🎉

---

## 📚 Additional Resources

- **Main setup guide:** `CLAIM-BUTTON-SETUP.md`
- **Manual distribution (backup):** `REWARDS-DISTRIBUTION-GUIDE.md`
- **Technical details:** `DISTRIBUTION-SETUP.md`

---

**Questions? Check console logs for debugging info!** 🔍

