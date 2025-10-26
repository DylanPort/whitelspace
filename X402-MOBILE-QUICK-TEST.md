# 🧪 Quick Test Guide: X402 Mobile Payments

## ⚡ Fast Testing Steps

### Test 1: Mobile Wallet (Auto-Sign)

1. **Open Developer Console** (F12 → Console)

2. **Check if mobile wallet exists:**
```javascript
console.log('Mobile wallet:', localStorage.getItem('ghost_mobile_wallet') ? 'EXISTS' : 'NOT FOUND');
console.log('Mobile address:', localStorage.getItem('ghost_mobile_address'));
```

3. **If no mobile wallet, create one:**
   - Click "Mobile Wallet" button
   - Choose "Create New Wallet"
   - **IMPORTANT:** Copy and save the private key!
   - Check confirmation box
   - Click "Confirm & Save Wallet"

4. **Fund the wallet:**
   - Copy your wallet address
   - Send 10,000+ WHISTLE tokens to it
   - Buy WHISTLE: https://pump.fun/coin/6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump

5. **Trigger x402 payment:**
   - Click any premium feature (Privacy Node, Staking, etc.)
   - Watch the console logs

6. **Expected console output:**
```
📱 Using mobile in-app wallet for x402 payment
✅ Mobile wallet keypair reconstructed
📱 Using mobile in-app wallet (auto-signing)...
✅ Payment confirmed!
```

7. **Expected behavior:**
   - ✅ NO signing popup
   - ✅ Payment processes automatically
   - ✅ Success message appears
   - ✅ Feature unlocks immediately

---

### Test 2: Desktop Wallet (Manual Sign)

1. **Clear mobile wallet** (to test desktop flow):
```javascript
// Run in console:
localStorage.removeItem('ghost_mobile_wallet');
localStorage.removeItem('ghost_mobile_address');
// Then refresh page
```

2. **Connect Phantom:**
   - Click "Connect Wallet"
   - Approve in Phantom extension

3. **Ensure wallet has WHISTLE:**
   - Check balance in Phantom
   - Need 10,000+ WHISTLE

4. **Trigger x402 payment:**
   - Click any premium feature

5. **Expected console output:**
```
🖥️ Using desktop extension wallet for x402 payment
✅ Wallet connected
🖥️ Using desktop extension wallet (requesting signature)...
✅ Payment confirmed!
```

6. **Expected behavior:**
   - ✅ Phantom popup appears
   - ✅ User clicks "Approve"
   - ✅ Payment confirms
   - ✅ Feature unlocks

---

## 🔍 Debug Checklist

### If Payment Fails

**Check 1: Wallet has WHISTLE?**
```javascript
// Check balance (run in console)
const connection = new solanaWeb3.Connection('https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba');
const publicKey = new solanaWeb3.PublicKey('YOUR_WALLET_ADDRESS');
const whistleMint = new solanaWeb3.PublicKey('6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump');
const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: whistleMint });
console.log('WHISTLE Balance:', tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount);
```

**Check 2: Mobile wallet keypair valid?**
```javascript
// Test reconstruction (run in console)
const mobilePrivateKey = localStorage.getItem('ghost_mobile_wallet');
if (mobilePrivateKey) {
  try {
    let secretKey;
    if (mobilePrivateKey.endsWith(':base64')) {
      const base64Key = mobilePrivateKey.replace(':base64', '');
      secretKey = Buffer.from(base64Key, 'base64');
    } else {
      secretKey = bs58.decode(mobilePrivateKey);
    }
    const keypair = solanaWeb3.Keypair.fromSecretKey(secretKey);
    console.log('✅ Keypair valid:', keypair.publicKey.toString());
  } catch (e) {
    console.error('❌ Keypair invalid:', e);
  }
} else {
  console.log('⚠️ No mobile wallet found');
}
```

**Check 3: x402 client loaded?**
```javascript
console.log('x402 client:', typeof window.requestX402AndPay === 'function' ? 'LOADED' : 'NOT LOADED');
```

**Check 4: RPC working?**
```javascript
// Test RPC (run in console)
const connection = new solanaWeb3.Connection('https://mainnet.helius-rpc.com/?api-key=413dfeef-84d4-4a37-98a7-1e0716bfc4ba');
try {
  const blockHeight = await connection.getBlockHeight();
  console.log('✅ RPC working, block height:', blockHeight);
} catch (e) {
  console.error('❌ RPC error:', e);
}
```

---

## 🎯 Quick Verification

After payment, verify on-chain:

1. **Check transaction:**
   - Go to: https://solscan.io
   - Search your wallet address
   - Look for recent 10,000 WHISTLE transfer

2. **Check pool received payment:**
   - Pool PDA: Check console logs for "poolPda" value
   - Or search pool address on Solscan
   - Verify balance increased by 10,000 WHISTLE

3. **Check access token:**
```javascript
// Run in console
console.log('Access token:', localStorage.getItem('x402_token'));
console.log('Expires at:', new Date(parseInt(localStorage.getItem('x402_exp')) * 1000).toLocaleString());
```

---

## 🚨 Common Errors

### Error: "You have 0 $WHISTLE tokens"
**Fix:** Buy WHISTLE and send to your wallet

### Error: "Failed to load mobile wallet"
**Fix:** 
```javascript
localStorage.removeItem('ghost_mobile_wallet');
localStorage.removeItem('ghost_mobile_address');
// Then create/import wallet again
```

### Error: "bs58 library not loaded"
**Fix:** Refresh page, check bs58 script in HTML head

### Error: "All RPCs failed"
**Fix:** Check internet connection, try again in a few seconds

### Error: "insufficient_payment"
**Fix:** Ensure wallet has at least 10,000 WHISTLE + SOL for fees

---

## 📱 Mobile Device Testing

### On Real Mobile Device

1. **Open app in mobile browser** (Chrome/Safari)
2. **Create mobile wallet** (button should show automatically)
3. **Fund wallet** with WHISTLE
4. **Trigger payment**
5. **Observe:** No popup, auto-sign

### On Desktop (Simulate Mobile)

1. **Open DevTools** (F12)
2. **Toggle device toolbar** (Ctrl+Shift+M)
3. **Select mobile device** (iPhone, Android)
4. **Refresh page**
5. **Test mobile wallet flow**

---

## ✅ Success Criteria

You know it's working when:

### Mobile Wallet
- [x] Wallet creates without errors
- [x] Private key displays and can be copied
- [x] Address shows in header when connected
- [x] Payment triggers without popup
- [x] Console shows "mobile in-app wallet" logs
- [x] Success message appears
- [x] Feature unlocks immediately

### Desktop Wallet
- [x] Phantom connects successfully
- [x] Payment triggers Phantom popup
- [x] User can approve transaction
- [x] Console shows "desktop extension wallet" logs
- [x] Success message appears
- [x] Feature unlocks after approval

---

## 🎬 Screen Recording Checklist

For documentation/demo:

1. **Record mobile flow:**
   - [ ] Create wallet
   - [ ] Show private key warning
   - [ ] Save wallet
   - [ ] Show wallet connected
   - [ ] Trigger payment
   - [ ] Show auto-sign (no popup)
   - [ ] Show success

2. **Record desktop flow:**
   - [ ] Connect Phantom
   - [ ] Trigger payment
   - [ ] Show Phantom popup
   - [ ] Approve transaction
   - [ ] Show success

---

## 🔗 Useful Links

- **Buy WHISTLE:** https://pump.fun/coin/6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump
- **Solscan (Mainnet):** https://solscan.io
- **Phantom Wallet:** https://phantom.app
- **Solana Explorer:** https://explorer.solana.com

---

## 💡 Pro Tips

1. **Use small amounts for testing** - don't test with your life savings!
2. **Keep private keys safe** - screenshot or write down
3. **Test both flows** - mobile and desktop
4. **Check console logs** - they tell you everything
5. **Verify on-chain** - don't trust just the UI

---

**Happy Testing! 🎉**

Questions? Check the full docs: `MOBILE-X402-INTEGRATION.md`

