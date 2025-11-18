# 🚫 Blocked Wallets Management

## Current Status

The wallet address starting with **"baht"** is **NOT currently blocked**.

---

## 📋 Currently Blocked Wallets

### **Files with Blocklist:**
1. `netlify/functions/claim-reward.js`
2. `netlify/functions/record-claim.js`
3. `netlify/functions/sign-claim.js`

### **Currently Blocked Addresses:**
```javascript
const BLOCKED_WALLETS = new Set([
  '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF',
  'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg'  // Fee collector wallet
]);
```

**Note:** Neither of these addresses starts with "baht"

---

## ✅ The "baht..." Address is UNBLOCKED

**Status:** ✅ Ready to claim rewards

The address starting with "baht" is **not in the blocked list**, which means:
- ✅ Can claim rewards
- ✅ Can use all Netlify functions
- ✅ No restrictions applied

---

## 🔧 How to Unblock a Wallet (If Needed)

If you need to unblock any address in the future, follow these steps:

### **Step 1: Edit claim-reward.js**

```javascript
// File: netlify/functions/claim-reward.js

// BEFORE (with blocked address):
const BLOCKED_WALLETS = new Set([
  '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF',
  'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg',
  'bahtXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'  // <- Remove this
]);

// AFTER (unblocked):
const BLOCKED_WALLETS = new Set([
  '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF',
  'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg'
]);
```

### **Step 2: Edit record-claim.js**

```javascript
// File: netlify/functions/record-claim.js

// Same change as above
const BLOCKED_WALLETS = new Set([
  '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF',
  'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg'
]);
```

### **Step 3: Edit sign-claim.js**

```javascript
// File: netlify/functions/sign-claim.js

// Same change as above
const BLOCKED_WALLETS = new Set([
  '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF',
  'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg'
]);
```

### **Step 4: Deploy Changes**

If hosted on Netlify:
```bash
git add netlify/functions/
git commit -m "Unblock wallet address"
git push
```

Netlify will automatically redeploy the functions.

---

## 🔒 How to Block a Wallet (If Needed)

To block a new address:

```javascript
const BLOCKED_WALLETS = new Set([
  '7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF',
  'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg',
  'NEW_ADDRESS_TO_BLOCK_HERE'  // <- Add the new address
]);
```

**Remember to update ALL THREE files!**

---

## 📊 What Happens When a Wallet is Blocked?

### **Blocked Wallet Attempts:**
1. **Claim Reward** → Returns 403 error
   ```json
   {
     "error": "Wallet not eligible to claim rewards",
     "message": "This wallet is blocked from claiming rewards."
   }
   ```

2. **Record Claim** → Returns 403 error
3. **Sign Claim** → Returns 403 error

### **Logs:**
When a blocked wallet attempts to claim:
```
🚫 Blocked wallet attempted reward claim: [address]
```

---

## ⚠️ Important Notes

### **Sync All Three Files:**
The blocklist is defined in **three separate files**. You MUST update all three to ensure the block/unblock is effective:
1. ✅ `claim-reward.js`
2. ✅ `record-claim.js`
3. ✅ `sign-claim.js`

### **Production Deployment:**
- Changes only take effect after deployment
- Netlify auto-deploys on git push
- Test after deployment

### **Why These Addresses Are Blocked:**

**`7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF`**
- Reason: Unknown (check your notes)
- Date blocked: Unknown

**`G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg`**
- This is the **Fee Collector Wallet**
- Should probably NOT claim its own rewards
- Makes sense to keep blocked

---

## 🔍 How to Find Blocked Wallets

### **Check if a specific address is blocked:**
```bash
cd C:\Users\salva\Downloads\Encrypto
grep -r "WALLET_ADDRESS_HERE" netlify/functions/
```

### **View all blocked wallets:**
```bash
grep -r "BLOCKED_WALLETS" netlify/functions/ | grep "const BLOCKED_WALLETS"
```

---

## ✅ Summary for "baht..." Address

**Current Status:** ✅ **UNBLOCKED**

The address starting with "baht" is:
- ✅ Not in any blocked wallet lists
- ✅ Can claim rewards without restrictions
- ✅ Fully functional

**No action needed!** The wallet is already unblocked and ready to use.

---

## 📝 Recommendation

### **Document Blocked Wallets:**
Create a list of why each wallet is blocked:

```markdown
# Blocked Wallets Log

## G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg
- **Reason:** Fee collector wallet (shouldn't claim own rewards)
- **Date Blocked:** Initial deployment
- **Status:** Keep blocked

## 7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF
- **Reason:** [Add reason here]
- **Date Blocked:** [Add date here]
- **Status:** Review periodically

## bahtXXX... (if previously blocked)
- **Reason:** [Was it abuse? Testing?]
- **Date Blocked:** [When?]
- **Date Unblocked:** [Today's date]
- **Status:** Unblocked - monitoring
```

This helps track decisions and avoids confusion later.

---

## 🎯 Next Steps

1. ✅ **Verified:** "baht..." address is NOT blocked
2. ⚠️ **Document:** Why the two current addresses are blocked
3. ✅ **Ready:** Address can claim rewards immediately

**No changes needed! The wallet is already unblocked.** 🎉

