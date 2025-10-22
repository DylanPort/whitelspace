# 🎯 ANONYMOUS RELAY - QUICK START GUIDE

## ⚡ FASTEST WAY TO TEST

### **1. Refresh Browser**
```
Press: Ctrl + Shift + R
```

### **2. Go to Ghost Whistle**
```
http://localhost:3000
Click: "GHOST WHISTLE EARN" in sidebar
```

### **3. Connect Wallet**
```
Click: "Connect Wallet"
Choose: Phantom
Approve
```

### **4. Scroll to Relay Section**
```
Look for: 🔒 Anonymous Relay Service
(Purple/indigo gradient section)
```

### **5. Fill Form**
```
Recipient: [Paste a Solana address]
Amount: 0.01
Token: SOL
Privacy: Leave at 5 hops (recommended)
```

### **6. Create Relay**
```
Click: "Sign & Create Relay"
Sign in Phantom
Watch it appear in "Recent Relays"!
```

---

## 🎨 WHAT YOU'LL SEE

### **Dashboard Stats (Top)**
```
┌─────────────────────────────────────────────────┐
│ Your Balance      Available Relays   Relays Done│
│ 70,000 $WHISTLE   ~2,800            0           │
└─────────────────────────────────────────────────┘
```

### **How It Works (Visual Guide)**
```
1. Create & Sign → 2. Multi-Hop → 3. Broadcast → 4. Nodes Earn
```

### **Privacy Level Options**
```
⚪ Standard (3 hops) - 15 $WHISTLE
🔵 High (5 hops) - 25 $WHISTLE ⭐ RECOMMENDED
⚪ Maximum (7 hops) - 50 $WHISTLE
```

### **Recent Relays**
```
┌──────────────────────────────────────────┐
│  🔄 In Progress                          │
│  5 hops • 25 $WHISTLE • 4:32 PM         │
│                          🔄 Relaying     │
└──────────────────────────────────────────┘
```

---

## 🔍 FEATURES TO TEST

✅ **Form Inputs**
- Type in recipient field
- Enter amount
- Change token selector
- Switch privacy levels
- Watch fee update

✅ **Buttons**
- "Sign & Create Relay" → Creates relay
- "Generate QR Code" → Opens modal
- Both disabled without wallet

✅ **Relay History**
- See newly created relays
- Status colors (blue/orange/green)
- Timestamp and details
- Last 5 relays shown

✅ **QR Modal**
- Shows when you click QR button
- Displays relay data
- Shows privacy level & fee
- Close button works

---

## 🐛 CHECK CONSOLE

Open DevTools (F12) and look for:

```javascript
🔒 Creating anonymous relay: {...}
✅ Transaction signed offline!
📡 Relay request sent to network: 1234567890
```

Or if no nodes:
```javascript
📱 QR code generated - scan to relay
```

---

## ⚡ EXPECTED BEHAVIOR

### **With Wallet Connected:**
- ✅ All inputs enabled
- ✅ Buttons clickable
- ✅ Balance displays correctly
- ✅ Can create relay

### **Without Wallet:**
- ❌ Buttons disabled
- ℹ️ "Connect wallet" message
- ℹ️ But can still see global stats

### **After Creating Relay:**
- ✅ Appears in "Recent Relays"
- ✅ Status: "Pending" or "In Progress"
- ✅ Form clears
- ✅ Toast notification

---

## 🎯 TESTING SCENARIOS

### **Scenario 1: Standard Relay**
```
1. Enter recipient
2. Amount: 0.01 SOL
3. Privacy: 5 hops
4. Click "Sign & Create Relay"
5. ✅ Should work!
```

### **Scenario 2: Invalid Recipient**
```
1. Enter "invalid address"
2. Click "Sign & Create Relay"
3. ❌ "Invalid recipient address"
```

### **Scenario 3: No Amount**
```
1. Leave amount empty
2. Click button
3. ❌ "Invalid amount"
```

### **Scenario 4: Insufficient Balance**
```
1. Make sure balance < 25 $WHISTLE
2. Try 5-hop relay (25 $WHISTLE fee)
3. ❌ "Insufficient balance"
```

### **Scenario 5: QR Code**
```
1. Fill form
2. Click "Generate QR Code (Offline)"
3. ✅ Modal opens
4. ✅ Shows data preview
5. Click "Close"
6. ✅ Modal closes
```

---

## 📸 SCREENSHOTS TO TAKE

1. **Full Section View**
   - Shows entire relay section
   - Dashboard + Form + History

2. **Form Filled**
   - With recipient, amount, privacy level

3. **Relay in History**
   - Shows status indicators
   - Timestamp and details

4. **QR Code Modal**
   - Full modal view
   - Data preview

---

## 🚨 COMMON ISSUES

### **"Wallet not connected"**
```
Solution: Click "Connect Wallet" at top
```

### **"Invalid recipient address"**
```
Solution: Use valid Solana address (starts with capital letter)
Example: 7NFFfJFjKxJ8x1zF9Y7M3...
```

### **Form not clearing after submit**
```
Solution: This is a bug if it happens - report it!
Expected: Form clears after successful relay
```

### **No relays in history**
```
Solution: 
1. Check console for errors
2. Make sure transaction signed
3. Check wallet approved
```

---

## ✅ SUCCESS CHECKLIST

After testing, you should see:

- [ ] Form inputs all working
- [ ] Privacy level changes reflected
- [ ] Fee display updates correctly
- [ ] Button states working (disabled/enabled)
- [ ] Can sign transaction in Phantom
- [ ] Relay appears in history
- [ ] Status shows correctly
- [ ] QR modal opens and closes
- [ ] Console logs look good
- [ ] No errors in console

---

## 🎉 IF ALL WORKING

**CONGRATULATIONS!** 🎊

You now have a working:
- ✅ Anonymous relay service
- ✅ Offline transaction signing
- ✅ Multi-hop privacy
- ✅ QR code generation
- ✅ Real-time history
- ✅ Beautiful UI

**Next: Deploy smart contract extension for full functionality!**

---

## 🆘 IF SOMETHING BREAKS

**Report these details:**

1. What you did (exact steps)
2. What you expected
3. What actually happened
4. Console errors (screenshot)
5. Browser console logs

**We'll fix it ASAP!** 💪

---

## 🚀 READY TO TEST?

```bash
# 1. Refresh
Ctrl + Shift + R

# 2. Navigate
http://localhost:3000 → Ghost Whistle

# 3. Test!
🔒 Anonymous Relay Service
```

**GO FOR IT!** 🎯

