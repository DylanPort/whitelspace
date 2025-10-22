# 🧪 MULTI-NODE TEST GUIDE

## 🎯 **THE ISSUE:**

You **CANNOT** run multiple nodes from:
- ❌ Same browser + Same wallet
- ❌ Multiple tabs + Same wallet
- ❌ Same device + Same browser profile

**WHY?** 
- Phantom wallet only maintains **one active WebSocket connection** per browser context
- `localStorage` persistence causes auto-reconnection with the same wallet
- Second tab replaces first tab's connection

---

## ✅ **SOLUTIONS TO TEST MULTIPLE NODES:**

### **Option 1: Different Browsers** ⭐ EASIEST
```
1. Chrome:
   - http://localhost:3000
   - Connect Wallet A (7NFF...)
   - Go to Ghost Whistle
   - Start Node
   
2. Firefox:
   - http://localhost:3000
   - Connect Wallet B (Different!)
   - Go to Ghost Whistle
   - Start Node

Result: 2 nodes visible to both!
```

### **Option 2: Incognito + Different Wallet**
```
1. Chrome Normal:
   - Connect Wallet A
   - Start Node
   
2. Chrome Incognito:
   - Connect Wallet B (Different!)
   - Start Node

Result: 2 nodes visible!
```

### **Option 3: Different Devices**
```
1. PC:
   - Your wallet
   - Start Node
   
2. Phone/Tablet:
   - Different wallet (or mobile Phantom)
   - Start Node

Result: 2 nodes visible!
```

### **Option 4: Different Browser Profiles**
```
1. Chrome Profile 1:
   - Wallet A
   - Start Node
   
2. Chrome Profile 2 (New):
   - Wallet B
   - Start Node

Result: 2 nodes visible!
```

---

## 🚨 **WHAT WON'T WORK:**

### ❌ **Same Browser, Multiple Tabs**
```
Chrome Tab 1: Wallet A → Start Node
Chrome Tab 2: Wallet A → Start Node (auto-connects same wallet)

Result: Only 1 node (Tab 2 replaces Tab 1's connection)
```

### ❌ **Same Browser, Different Windows**
```
Chrome Window 1: Wallet A → Start Node
Chrome Window 2: Wallet A → Start Node

Result: Only 1 node (shared wallet connection)
```

---

## 🔬 **SCIENTIFIC TEST:**

### **Test 1: Verify Single Node**
```bash
# Node 1 running, check API:
curl http://localhost:8080/api/nodes

# Should show:
{"nodes":[{...}],"totalNodes":1}
```

### **Test 2: Add Second Node (Different Browser)**
```bash
# Open Firefox, start second node with different wallet
# Then check API again:
curl http://localhost:8080/api/nodes

# Should show:
{"nodes":[{...},{...}],"totalNodes":2}
```

### **Test 3: Check Server Logs**
```
Server console should show:
✅ Node registered: GW-7NFFKUqm-1761064537316 (7NFF...)
✅ Node registered: GW-8AAABBBB-1761064600000 (8AAA...)
```

If you see TWO "✅ Node registered" messages, both nodes are active!

---

## 🎯 **QUICK ACTION PLAN:**

### **Right Now:**
1. **Keep your current node running** in Chrome
2. **Open Firefox** (or Edge, Opera, Brave, etc.)
3. **Navigate to** `http://localhost:3000`
4. **Connect a DIFFERENT wallet** (or disconnect and reconnect if you only have one)
5. **Go to Ghost Whistle section**
6. **Start node**

### **Then Check:**
7. **Chrome tab:** Should show "2 Active Nodes"
8. **Firefox tab:** Should show "2 Active Nodes"
9. **API:** `http://localhost:8080/api/nodes` should show 2 nodes
10. **Server console:** Should show 2 "✅ Node registered" messages

---

## 💡 **IF YOU ONLY HAVE ONE WALLET:**

You can still test by creating a new Solana wallet:

### **Quick New Wallet Setup:**
1. Open Firefox
2. Install Phantom (or use Solflare, Backpack, etc.)
3. Create new wallet (save seed phrase!)
4. You don't need to fund it for testing
5. Connect this wallet to localhost:3000
6. Try to start node (it will fail to stake, but will register)

### **Or Use Mock Wallets (For Display Testing):**
We could add a "Demo Mode" that simulates multiple nodes without real wallets.

---

## 🔍 **CURRENT STATUS:**

Based on your API response:
```json
{
  "nodes": [{
    "id": "GW-7NFFKUqm-1761064537316",
    "walletAddress": "7NFFKUqmQCXHps19XxFkB9qh7AX52UZE8HJVdUu8W6XF",
    "region": "Europe/Berlin",
    ...
  }],
  "totalNodes": 1
}
```

**✅ Server is working correctly!**
**✅ Your node is registered!**
**✅ API is returning data!**

**❌ Second tab didn't add a second node**
**→ Likely because: Same browser + Same wallet**

---

## 🚀 **ACTION: Try Firefox Right Now!**

1. **Open Firefox**
2. **Go to** `http://localhost:3000`
3. **Connect wallet** (different from Chrome if possible)
4. **Navigate to Ghost Whistle**
5. **Click Start Node**
6. **Check API:**
   ```
   http://localhost:8080/api/nodes
   ```
   Should show `"totalNodes": 2`

---

## 📊 **WHAT SUCCESS LOOKS LI KE:**

### **API Response (2 Nodes):**
```json
{
  "nodes": [
    {
      "id": "GW-7NFFKUqm-1761064537316",
      "walletAddress": "7NFF...W6XF",
      "region": "Europe/Berlin",
      ...
    },
    {
      "id": "GW-8AAAxxx-1761065000000",
      "walletAddress": "8AAA...XYZ",
      "region": "Europe/London",
      ...
    }
  ],
  "totalNodes": 2
}
```

### **UI Display (Both Browsers):**
```
🌍 GLOBAL NODE NETWORK

2 Active Nodes  |  0 Total Relays  |  2 Online Now

┌──────────────────────────────────────────┐
│ 🟢 Europe/Berlin  ACTIVE  0   0   14 min │
│ 🟢 Europe/London  ACTIVE  0   0    2 min │
└──────────────────────────────────────────┘

📡 NODE RADAR
[Shows 2 dots on radar with regions]
```

### **Server Console:**
```
✅ Node registered: GW-7NFFKUqm-1761064537316 (7NFF...)
✅ Node registered: GW-8AAAxxx-1761065000000 (8AAA...)
```

---

## 🎯 **TL;DR:**

**Problem:** Same browser + Same wallet = Only 1 node
**Solution:** Different browser OR different wallet
**Test Now:** Open Firefox, start second node!

Let me know when you try Firefox! 🚀

