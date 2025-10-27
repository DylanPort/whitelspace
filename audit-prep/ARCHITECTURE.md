# System Architecture - Ghost Whistle Staking Contract

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Ghost Whistle Protocol                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │      Solana Smart Contract (Anchor)     │
        │   Program: 2uZWi6wC6CumhcCDCuNZc...     │
        └─────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Staking  │   │  Relay   │   │   Fee    │
        │  Pool    │   │ Network  │   │  Pool    │
        └──────────┘   └──────────┘   └──────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │   Web    │   │ Desktop  │   │  Mobile  │
        │  Client  │   │   App    │   │   App    │
        └──────────┘   └──────────┘   └──────────┘
```

---

## 📊 Contract Components

### **1. Staking Pool (Global State)**

```rust
pub struct StakingPool {
    pub authority: Pubkey,        // Admin authority
    pub whistle_mint: Pubkey,     // $WHISTLE token mint
    pub total_staked: u64,        // Total tokens staked
    pub total_nodes: u64,         // Number of active nodes
    pub total_reputation: u64,    // Sum of all reputation
    pub fee_pool: u64,            // Protocol fees (x402)
    pub base_reward: u64,         // Base relay reward
    pub bonus_per_point: u64,     // Reputation bonus
    pub total_relay_requests: u64 // Total relays processed
}
```

**PDA Derivation:** `["pool"]`  
**Storage:** Single account, globally accessible  
**Mutations:** Initialize, stake, unstake, deposit_fees, update_params

---

### **2. Node Account (Per-User State)**

```rust
pub struct NodeAccount {
    pub owner: Pubkey,            // User wallet
    pub staked_amount: u64,       // Tokens staked by user
    pub reputation_score: u64,    // Earned reputation
    pub total_relays: u64,        // Total relays handled
    pub successful_relays: u64,   // Successful count
    pub failed_relays: u64,       // Failed count
    pub total_earned: u64,        // Lifetime earnings
    pub pending_rewards: u64,     // Unclaimed rewards
    pub total_claimed: u64,       // Already claimed
    pub created_at: i64,          // Timestamp
    pub last_relay: i64           // Last relay timestamp
}
```

**PDA Derivation:** `["node", user_pubkey]`  
**Storage:** One account per staker  
**Mutations:** Stake, unstake, fulfill_relay, claim_rewards

---

### **3. Relay Request (Job State)**

```rust
pub struct RelayRequest {
    pub id: u64,                  // Unique relay ID
    pub requester: Pubkey,        // Who requested
    pub node: Pubkey,             // Assigned node
    pub status: RelayStatus,      // Pending/Complete/Failed
    pub requested_at: i64,        // Creation time
    pub completed_at: i64,        // Completion time
    pub reward_amount: u64        // Payout amount
}

pub enum RelayStatus {
    Pending,
    Completed,
    Failed
}
```

**PDA Derivation:** `["relay", relay_id.to_le_bytes()]`  
**Storage:** One account per relay  
**Mutations:** create_relay_request, fulfill_relay

---

## 🔄 User Flows

### **Flow 1: Stake Tokens**

```
User Wallet
    │
    │ 1. Call stake(10,000 WHISTLE)
    ▼
Smart Contract
    │
    ├─ 2. Validate: amount >= min_stake
    ├─ 3. Transfer tokens: user → pool_vault (SPL Token CPI)
    ├─ 4. Create/Update NodeAccount PDA
    ├─ 5. Increment pool.total_staked
    └─ 6. Emit StakeEvent
    │
    ▼
NodeAccount Created
    └─ staked_amount: 10,000
       reputation: 0
       total_earned: 0
```

**Accounts Required:**
- User (signer)
- User token account (writable)
- Pool (writable)
- Pool vault (writable)
- Node account (writable, init if first stake)
- Token program
- System program

---

### **Flow 2: Relay Request & Fulfillment**

```
Requester                Node Operator             Smart Contract
    │                          │                          │
    │ 1. create_relay()        │                          │
    ├────────────────────────────────────────────────────>│
    │                          │                    2. Create RelayRequest PDA
    │                          │                    3. Status = Pending
    │                          │                          │
    │                          │ 4. fulfill_relay()       │
    │                          ├─────────────────────────>│
    │                          │                    5. Verify node eligibility
    │                          │                    6. Calculate reward
    │                          │                    7. Update reputation (+100)
    │                          │                    8. Transfer fee (90% to node)
    │                          │                    9. Status = Completed
    │                          │<─────────────────────────┤
    │                          │ 10. Reward credited      │
```

**Reward Calculation:**
```rust
let reward = pool.base_reward + (node.reputation_score * pool.bonus_per_point / 1000);
let node_fee = reward * 9 / 10;      // 90% to node
let pool_fee = reward * 1 / 10;      // 10% to pool
```

---

### **Flow 3: Claim Rewards**

```
User
    │
    │ 1. Call claim_rewards()
    ▼
Smart Contract
    │
    ├─ 2. Load NodeAccount PDA
    ├─ 3. Check pending_rewards > 0
    ├─ 4. Transfer: pool_vault → user (SPL Token CPI)
    ├─ 5. Update node.total_claimed += pending_rewards
    ├─ 6. Set node.pending_rewards = 0
    └─ 7. Emit ClaimEvent
    │
    ▼
User Receives Tokens
```

**Safety Checks:**
- ✅ pending_rewards validated against pool balance
- ✅ User must be signer
- ✅ NodeAccount must exist
- ✅ Atomic operation (transfer before state update)

---

### **Flow 4: Fee Distribution (x402 Protocol)**

```
External Service (x402)          Smart Contract            Stakers
        │                              │                      │
        │ 1. User pays 10k WHISTLE     │                      │
        ├────────────────────────────> │                      │
        │                         2. deposit_fees()           │
        │                         3. pool.fee_pool += amount  │
        │                              │                      │
        │                              │ 4. Stakers claim     │
        │                              │<─────────────────────┤
        │                         5. Calculate share:         │
        │                            60% stake weight         │
        │                            20% time weight          │
        │                            20% reputation weight    │
        │                         6. Transfer proportional     │
        │                            share to user            │
        │                              ├─────────────────────>│
        │                              │   User receives      │
```

**Distribution Formula:**
```rust
stake_weight = node.staked_amount / pool.total_staked
time_weight = min(days_staked / 30, 1.0)
rep_weight = node.reputation_score / pool.total_reputation

total_weight = (stake_weight * 0.6) + (time_weight * 0.2) + (rep_weight * 0.2)
user_share = (total_weight / sum_all_weights) * pool.fee_pool
```

---

## 🗄️ Account Structure

### **On-Chain Storage:**

```
Solana Blockchain
    │
    ├─ Program Account (2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq)
    │   └─ Immutable bytecode
    │
    ├─ StakingPool PDA (BRdtLtAjQ325B12tjo3q5DbUocbEJEkUQDoZR241nhkn)
    │   └─ 192 bytes (global state)
    │
    ├─ Pool Vault (ATA for pool PDA)
    │   └─ SPL Token account holding all staked $WHISTLE
    │
    ├─ NodeAccount #1 (PDA: ["node", user1_pubkey])
    │   └─ 128 bytes (user1 state)
    │
    ├─ NodeAccount #2 (PDA: ["node", user2_pubkey])
    │   └─ 128 bytes (user2 state)
    │
    ├─ ... (54+ node accounts)
    │
    ├─ RelayRequest #1 (PDA: ["relay", 1])
    │   └─ 96 bytes (relay state)
    │
    └─ RelayRequest #2 (PDA: ["relay", 2])
        └─ 96 bytes (relay state)
```

**Storage Costs:**
- StakingPool: ~0.00139 SOL rent
- NodeAccount: ~0.00089 SOL rent (paid by user)
- RelayRequest: ~0.00067 SOL rent (paid by requester)

---

## 🔐 Security Architecture

### **Access Control Matrix:**

| Instruction | Signer Required | Authority Required | PDA Validation |
|------------|-----------------|-------------------|----------------|
| initialize | ✅ Authority | ✅ Yes | Pool (init) |
| stake | ✅ User | ❌ No | Node (init/write) |
| unstake | ✅ User | ❌ No | Node (write) |
| claim_rewards | ✅ User | ❌ No | Node (write) |
| deposit_fees | ✅ Payer | ❌ No | Pool (write) |
| create_relay | ✅ Requester | ❌ No | Relay (init) |
| fulfill_relay | ✅ Node | ❌ No | Relay (write) |
| update_params | ✅ Authority | ✅ Yes | Pool (write) |

---

## 📈 State Transitions

### **Node Lifecycle:**

```
[NOT_EXISTS] ──stake()──> [STAKED]
                              │
                              ├─ unstake(partial) ──> [STAKED] (reduced)
                              ├─ unstake(full) ──────> [UNSTAKED]
                              ├─ fulfill_relay() ────> [STAKED] (reputation +100)
                              └─ claim_rewards() ────> [STAKED] (rewards claimed)
```

### **Relay Lifecycle:**

```
create_relay() ──> [PENDING]
                       │
                       ├─ fulfill_relay(success) ──> [COMPLETED]
                       └─ fulfill_relay(fail) ──────> [FAILED]
```

---

## 🌐 Integration Points

### **External Systems:**

1. **x402 Payment Gateway** (Netlify Functions)
   - Calls `deposit_fees()` after user payments
   - Verifies transactions on-chain
   - Issues access tokens

2. **Web Frontend** (React SPA)
   - Wallet connection (Phantom/Solflare)
   - Stake/unstake UI
   - Claim rewards UI
   - Node dashboard

3. **Relay Network** (WebRTC P2P)
   - Off-chain relay execution
   - On-chain settlement via `fulfill_relay()`
   - Reputation tracking

4. **Indexer** (Optional)
   - Tracks all transactions
   - Builds leaderboard
   - Historical analytics

---

## 🔧 Upgrade Strategy

**Current Status:** ⚠️ **No Upgrade Authority**

The contract is deployed **without upgrade authority**, meaning it is **immutable**.

**Pros:**
- ✅ Maximum trustlessness
- ✅ No rug pull risk
- ✅ Code is final

**Cons:**
- ❌ Cannot fix bugs
- ❌ Cannot add features
- ❌ Cannot adjust parameters (except via `update_params`)

**Mitigation:**
- Deploy v2 contract if major changes needed
- Migrate users gradually
- Keep v1 running alongside v2

---

## 📊 Performance Metrics

### **Transaction Costs (estimated):**

| Instruction | Compute Units | Tx Fee (SOL) |
|------------|---------------|--------------|
| stake | ~50,000 CU | ~0.00005 |
| unstake | ~50,000 CU | ~0.00005 |
| claim_rewards | ~30,000 CU | ~0.00003 |
| deposit_fees | ~20,000 CU | ~0.00002 |
| create_relay | ~40,000 CU | ~0.00004 |
| fulfill_relay | ~60,000 CU | ~0.00006 |

### **Scalability:**

- **Max Nodes:** Unlimited (PDA-based)
- **Max Relays:** Unlimited (ID counter)
- **Bottleneck:** Global pool account (single write lock)
- **TPS:** ~10-20 concurrent stakes/unstakes per second

---

## 🔮 Future Architecture (v2)

**Potential Improvements:**

1. **Sharded Pools** → Multiple pools to reduce contention
2. **Merkle Tree Claims** → Gas-efficient bulk distributions
3. **Oracle Integration** → External relay verification
4. **Emergency Pause** → Circuit breaker for exploits
5. **Timelocks** → Governance for parameter changes
6. **Multi-sig Authority** → Decentralized admin

---

**Last Updated:** October 27, 2025  
**Version:** 1.0 (Mainnet)

