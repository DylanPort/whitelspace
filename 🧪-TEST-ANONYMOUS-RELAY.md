# 🧪 Anonymous Relay Testing Guide

## 🚀 Quick Start Testing

### **Step 1: Start Servers**

```bash
# Terminal 1 - Signaling Server (Port 8080)
cd C:\Users\salva\Downloads\Encrypto
node signaling-server.js

# Terminal 2 - Frontend Server (Port 3000)
node server.js
```

### **Step 2: Setup Test Environment**

You need **at least 3 active nodes** to test a 3-hop relay:

**Option A: Multiple Wallets (Recommended)**
1. Open Chrome browser → Connect Wallet A → Stake → Run Node
2. Open Firefox browser → Connect Wallet B → Stake → Run Node  
3. Open Edge browser → Connect Wallet C → Stake → Run Node

**Option B: Incognito/Private Windows**
1. Regular window → Wallet A
2. Incognito window 1 → Wallet B
3. Incognito window 2 → Wallet C

**Option C: Multiple Devices**
1. Laptop → Wallet A
2. Desktop → Wallet B
3. Phone → Wallet C

### **Step 3: Create a Test Relay**

In **Wallet A** (the sender):
1. Go to http://localhost:3000
2. Navigate to "Anonymous Relay" section
3. Enter:
   - **Recipient:** Wallet B's address (or any other address)
   - **Amount:** 0.001 (SOL)
   - **Privacy Level:** 3 hops
4. Click **"Create Anonymous Relay"**
5. **Approve 2 transactions:**
   - Transaction to relay (your transfer)
   - Smart contract create_relay_request

### **Step 4: Watch The Process**

#### **In Signaling Server Console:**
```
🔒 Broadcasting relay request 1 to selected nodes
  → Sending to node GW-7NFFKUqm-1234567890
  → Sending to node GW-4S8fvGCe-1234567891
  → Sending to node GW-9XyZaBcD-1234567892
🔄 Forwarding relay 1 to 4S8fvGCe
  ✅ Forwarded to GW-4S8fvGCe-1234567891
🔄 Forwarding relay 1 to 9XyZaBcD
  ✅ Forwarded to GW-9XyZaBcD-1234567892
```

#### **In Wallet A (Sender) Browser:**
```
Toast Notifications:
✅ "Selecting relay nodes..."
✅ "Selected 3 relay nodes"
✅ "Encrypting with onion routing..."
✅ "Creating on-chain relay request..."
✅ "Relay request created on-chain!"
✅ "Broadcasting to relay nodes..."
✅ "Anonymous relay initiated! (3 hops)"

Relay History Updates:
⏳ Relay #1 → In Progress
🔄 Relay #1 → In Transit
✅ Relay #1 → Complete
```

#### **In Node Wallets (B, C, D):**
```
Node B (First Hop):
✅ "Relay request received!"
✅ "Forwarded relay (hop 1/3)"
✅ "Relay payment claimed!" (+5 $WHISTLE)

Node C (Second Hop):
✅ "Relay request received!"
✅ "Forwarded relay (hop 2/3)"
✅ "Relay payment claimed!" (+5 $WHISTLE)

Node D (Final Hop):
✅ "Relay request received!"
✅ "Relay transaction submitted!"
✅ "Relay completed! You can now claim payment"
✅ "Relay payment claimed!" (+5 $WHISTLE)
```

### **Step 5: Verify Results**

#### **Check Recipient Received Funds:**
1. Go to Wallet B (recipient)
2. Check balance - should have +0.001 SOL

#### **Check Relay History:**
1. In Wallet A, scroll to "Relay History"
2. Should show:
   - ✅ Status: Complete
   - TX signature displayed
   - Hops: 3
   - Nodes: 3
   - Fee: 15 $WHISTLE
3. Click **"View"** button → Opens Solscan
4. Verify transaction on-chain

#### **Check Node Payments:**
1. In Wallet B, C, D (nodes)
2. Check $WHISTLE balance
3. Each should have +5 $WHISTLE

#### **Check On-Chain Data:**
```bash
# Check relay request account
solana account <RELAY_REQUEST_PDA>

# Should show:
# - creator: Wallet A
# - num_hops: 3
# - participants: [Wallet B, C, D]
# - status: Completed
# - transaction_hash: <TX_SIG>
```

---

## 🐛 Troubleshooting

### **Problem: "Only 0 nodes available, need 3"**
**Solution:**
- Start more nodes
- Make sure all nodes are connected to signaling server
- Check signaling server console: Should show 3+ registered nodes
- Run `curl http://localhost:8080/api/nodes` to verify

### **Problem: Relay stuck "In Progress"**
**Solution:**
- Check all selected nodes are still online
- Check signaling server console for errors
- Check browser consoles of node wallets
- Verify WebSocket connections are active

### **Problem: Transaction fails**
**Solution:**
- Make sure sender has enough SOL for transaction + fees
- Make sure sender has enough $WHISTLE for relay fee
- Check recipient address is valid
- Try smaller amount first (0.001 SOL)

### **Problem: Nodes not receiving relay request**
**Solution:**
- Check WebSocket connection (should say "Node registered on network!")
- Verify nodes are staked (10,000+ $WHISTLE required)
- Check signaling server is broadcasting to correct wallets
- Look for "📨 Received: relay_request" in console

### **Problem: Payment claim fails**
**Solution:**
- Wait for relay to be marked "Complete" on-chain
- Check node joined the relay (should have called join_relay)
- Verify pool has enough $WHISTLE for payments
- Try manual claim by reloading page (auto-claim after 2s)

---

## 📊 Expected Timings

| Step | Expected Time |
|------|--------------|
| Node selection | < 1 second |
| Encryption | < 1 second |
| On-chain relay creation | 2-3 seconds |
| Broadcast to nodes | < 1 second |
| Each join_relay call | 2-3 seconds each |
| Hop forwarding | < 1 second per hop |
| Final transaction submit | 2-3 seconds |
| complete_relay call | 2-3 seconds |
| Payment claims (3 nodes) | 6-9 seconds total |
| **TOTAL END-TO-END** | **~20-30 seconds** |

---

## 🎯 Test Scenarios

### **Scenario 1: Basic 3-Hop Relay** ✅
- Setup: 3 nodes
- Privacy: 3 hops
- Expected: All 3 nodes earn 5 $WHISTLE each
- Total fee: 15 $WHISTLE

### **Scenario 2: High Privacy 5-Hop Relay**
- Setup: 5 nodes
- Privacy: 5 hops
- Expected: All 5 nodes earn 5 $WHISTLE each
- Total fee: 25 $WHISTLE

### **Scenario 3: Maximum Privacy 7-Hop Relay**
- Setup: 7 nodes
- Privacy: 7 hops
- Expected: All 7 nodes earn 5 $WHISTLE each
- Total fee: 35 $WHISTLE

### **Scenario 4: Multiple Simultaneous Relays**
- Create 3 relays at once
- Different senders
- Watch node selection distribute load
- Verify all complete successfully

### **Scenario 5: Geographic Diversity**
- Use VPN or different locations
- Nodes from different regions
- Verify relay selects diverse paths
- Check node locations in history

---

## 📸 What Success Looks Like

### **Signaling Server Console:**
```
✅ Node registered: GW-7NFFKUqm-... (7NFFKUqm...)
✅ Node registered: GW-4S8fvGCe-... (4S8fvGCe...)
✅ Node registered: GW-9XyZaBcD-... (9XyZaBcD...)
📡 Active nodes: 3
🔒 Broadcasting relay request 1 to selected nodes
  → Sending to node GW-7NFFKUqm-...
  → Sending to node GW-4S8fvGCe-...
  → Sending to node GW-9XyZaBcD-...
🔄 Forwarding relay 1 to 4S8fvGCe
  ✅ Forwarded to GW-4S8fvGCe-...
🔄 Forwarding relay 1 to 9XyZaBcD
  ✅ Forwarded to GW-9XyZaBcD-...
```

### **Frontend (Sender):**
- Relay #1 shows ✅ Complete status
- TX signature is a valid Solana signature
- Clicking "View" opens Solscan with transaction
- Recipient balance increased

### **Frontend (Nodes):**
- Each node shows +1 to "Total Relays"
- $WHISTLE balance increased by 5
- Toast notification: "💰 Relay payment claimed!"

### **On Solscan:**
- Transaction shows sender → recipient
- No direct connection visible (privacy preserved)
- Transaction successfully confirmed

---

## 🎉 Celebration Checklist

- [ ] 3+ nodes running
- [ ] Relay created successfully
- [ ] Relay shows "In Progress"
- [ ] All nodes received relay request
- [ ] All nodes called join_relay
- [ ] Transaction forwarded through hops
- [ ] Final node submitted transaction
- [ ] Relay marked "Complete"
- [ ] All nodes claimed payment
- [ ] Recipient received funds
- [ ] TX visible on Solscan
- [ ] Relay history shows complete status

**If all checked: 🎉 FULL ANONYMOUS RELAY SUCCESS! 🎉**

---

## 🔥 Advanced Testing

### **Stress Test:**
- Create 10 relays back-to-back
- Monitor server performance
- Check all complete successfully

### **Node Failure Test:**
- Start relay with 5 nodes
- Kill one node mid-relay
- Verify error handling
- Check partial payment distribution

### **Reputation Test:**
- Run 10 successful relays on one node
- Create new relay
- Verify high-reputation node gets selected first

### **Cross-Browser Test:**
- Chrome, Firefox, Edge, Safari
- Verify WebSocket compatibility
- Check UI renders correctly

---

**Ready to test? Let's gooo! 🚀**

