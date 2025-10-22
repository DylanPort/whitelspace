# ⚠️ CRITICAL: Token Decimal Mismatch

## 🚨 **The Problem:**

Your $WHISTLE token has **6 decimals**, but the smart contract was written assuming **9 decimals**.

### **Token Reality:**
- Mint: `6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump`
- **Decimals: 6** ✅ (verified on-chain)
- Balance: 71,564.355142 $WHISTLE
- Raw amount: 71,564,355,142 base units

### **Smart Contract Assumption:**
```rust
pub const WHISTLE_TOKEN_MINT: &str = "6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump";

pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
    require!(amount >= 10_000_000_000_000, ErrorCode::MinimumStakeNotMet); // 10,000 with 9 decimals
    //                  ^^^^^^^^^^^^^^^^^^ This expects 9 decimals!
    ...
}
```

The contract checks for:
- **10,000,000,000,000** base units (10,000 tokens × 10^9)

But your token's 10,000 tokens is only:
- **10,000,000,000** base units (10,000 tokens × 10^6)

---

## 💡 **The Math:**

### **What the contract expects:**
```
Minimum: 10_000_000_000_000 base units
With 9 decimals: 10,000 tokens
```

### **What you need to stake (with 6 decimals):**
```
To meet 10_000_000_000_000 base units requirement:
10_000_000_000_000 ÷ 10^6 = 10,000,000 tokens
```

**You need to stake 10 MILLION $WHISTLE to meet the contract's minimum!**

But you only have 71,564 $WHISTLE! 😱

---

## ✅ **SOLUTION: Redeploy Contract with Correct Decimals**

Update the smart contract with the correct minimum for 6 decimals:

### **Option A: Keep 10,000 token minimum (RECOMMENDED)**
```rust
pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
    require!(amount >= 10_000_000_000, ErrorCode::MinimumStakeNotMet); // 10,000 with 6 decimals
    ...
}
```

### **Option B: Lower minimum to 1,000 tokens**
```rust
pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
    require!(amount >= 1_000_000_000, ErrorCode::MinimumStakeNotMet); // 1,000 with 6 decimals
    ...
}
```

### **Option C: Remove minimum entirely**
```rust
pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount); // Any amount > 0
    ...
}
```

---

## 🔧 **Quick Fix for Testing:**

For NOW, you can test staking by entering **10,000,000** (10 million) $WHISTLE in the UI.

But you don't have enough tokens! So the **real fix is to redeploy the contract**.

---

## 📝 **What Needs to Change in Contract:**

### **File: `lib.rs`**

1. **Update minimum stake check (line ~28):**
```rust
// OLD:
require!(amount >= 10_000_000_000_000, ErrorCode::MinimumStakeNotMet);

// NEW (for 10,000 minimum with 6 decimals):
require!(amount >= 10_000_000_000, ErrorCode::MinimumStakeNotMet);
```

2. **Update comments about decimals:**
```rust
// OLD:
// Amount in lamports (9 decimals for $WHISTLE)

// NEW:
// Amount in base units (6 decimals for $WHISTLE)
```

3. **Update base_reward and bonus_per_point in initialize():**
```rust
// OLD:
pool.base_reward = 5_000_000_000; // 5 $WHISTLE (9 decimals)
pool.bonus_per_point = 1_000_000_000; // 1 $WHISTLE per reputation point

// NEW (for 6 decimals):
pool.base_reward = 5_000_000; // 5 $WHISTLE (6 decimals)
pool.bonus_per_point = 1_000_000; // 1 $WHISTLE per reputation point
```

4. **Update reputation calculation (line ~120):**
```rust
// OLD:
fn calculate_reputation(staked: u64, successful: u64, total: u64) -> u64 {
    if total == 0 {
        return integer_sqrt(staked / 10_000_000_000_000) * 1000; // 9 decimals
    }
    let stake_mult = integer_sqrt(staked / 10_000_000_000_000) * 1000;
    ...
}

// NEW (for 6 decimals):
fn calculate_reputation(staked: u64, successful: u64, total: u64) -> u64 {
    if total == 0 {
        return integer_sqrt(staked / 10_000_000_000) * 1000; // 6 decimals
    }
    let stake_mult = integer_sqrt(staked / 10_000_000_000) * 1000;
    ...
}
```

---

## 🚀 **Steps to Fix:**

1. **Update `lib.rs`** with the changes above
2. **Build** in Solana Playground
3. **Deploy** to a new program ID (or upgrade if possible)
4. **Initialize pool** again with the new program
5. **Create pool vault** for the new program
6. **Update frontend** with new program ID
7. **Test staking** with 10,000 $WHISTLE

---

## 💡 **Temporary Workaround:**

For testing purposes only, you can try staking **10,000,000** $WHISTLE (if you had that much).

But since you only have **71,564** $WHISTLE, you **MUST** redeploy the contract with corrected decimals!

---

## ⏱️ **ETA to Fix:**

- Update contract: 5 minutes
- Redeploy: 2 minutes
- Initialize pool: 2 minutes
- Update frontend: 1 minute

**Total: ~10 minutes**

---

**This is a critical fix needed before launch!** 🚨

