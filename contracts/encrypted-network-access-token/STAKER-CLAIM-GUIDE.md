# How Stakers Claim Rewards 💰

## Overview

As a WHISTLE staker, you earn rewards from two sources:
1. **X402 Payments (90%)** - From app features like Ghost Whistle
2. **RPC Query Fees (5%)** - From developers using the RPC network

Both accumulate in the `staker_rewards_pool` and you can claim your proportional share anytime.

---

## How It Works

### 1. **Rewards Accumulate**

When x402 payments are distributed or RPC fees collected:
- Your share = `(your_stake ÷ total_stake) × staker_rewards_pool`
- It's NOT pre-calculated for you
- The contract calculates it **when you claim**

### 2. **You Call ClaimStakerRewards**

```
┌─────────────────┐
│  You Call Claim │
└────────┬────────┘
         │
         ▼
┌────────────────────────────────────┐
│  Smart Contract Calculates:        │
│  your_reward = (your_stake ÷       │
│  total_stake) × staker_rewards_pool│
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│  Transfer SOL:                     │
│  PaymentVault → Your Wallet        │
└────────────────────────────────────┘
```

### 3. **Proportional Distribution**

**Example:**
- **You staked:** 100 WHISTLE
- **Total staked:** 1,000 WHISTLE
- **Staker rewards pool:** 10 SOL

**Your reward:**
```
(100 ÷ 1,000) × 10 SOL = 1 SOL
```

**Your share:** 10% of the pool

---

## Option 1: Use the Claim Script (Easiest)

### Step 1: Install Dependencies

```bash
cd contracts/encrypted-network-access-token
npm install
```

### Step 2: Set Your Keypair

```bash
# Export your wallet keypair path
export STAKER_KEYPAIR="./my-wallet.json"

# Or copy your keypair to the default location
cp ~/my-wallet.json ./staker-keypair.json
```

### Step 3: Run the Claim Script

```bash
node claim-my-rewards.js
```

**Output:**
```
╔════════════════════════════════════════════════╗
║   WHISTLE Staker Rewards Claim Tool            ║
╚════════════════════════════════════════════════╝

🔗 Connected to: https://rpc.whistle.ninja
🔑 Staker: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

📊 Fetching your staking info...

═══════════════════════════════════════════════
📈 YOUR STAKING STATS
═══════════════════════════════════════════════
Your Stake:        100.0000 WHISTLE
Total Network:     1000.0000 WHISTLE
Your Share:        10.00%

💰 CLAIMABLE REWARDS
═══════════════════════════════════════════════
Amount:            1.2500 SOL
Source:            proportional
Total Pool:        12.5000 SOL
═══════════════════════════════════════════════

Do you want to claim 1.25 SOL? (yes/no): yes

🚀 Processing claim...

✅ REWARDS CLAIMED SUCCESSFULLY!

Transaction: https://solscan.io/tx/3x5y7z...
Amount Received: 1.25 SOL

💵 Your New Wallet Balance: 123.75 SOL
```

---

## Option 2: Manual Claim (For Developers)

### Using JavaScript

```javascript
import { Connection, PublicKey, Transaction, TransactionInstruction, Keypair } from '@solana/web3.js';

const connection = new Connection('https://rpc.whistle.ninja');
const staker = Keypair.fromSecretKey(/* your keypair */);
const PROGRAM_ID = new PublicKey('5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc');

// Derive PDAs
const [stakerAccount] = PublicKey.findProgramAddressSync(
  [Buffer.from('staker'), staker.publicKey.toBuffer()],
  PROGRAM_ID
);

const [stakingPool] = PublicKey.findProgramAddressSync(
  [Buffer.from('staking_pool'), authority.toBuffer()],
  PROGRAM_ID
);

const [paymentVault] = PublicKey.findProgramAddressSync(
  [Buffer.from('payment_vault'), authority.toBuffer()],
  PROGRAM_ID
);

// Build claim instruction
const CLAIM_STAKER_REWARDS_INDEX = 15; // Adjust based on your enum
const instruction = new TransactionInstruction({
  keys: [
    { pubkey: staker.publicKey, isSigner: true, isWritable: true },
    { pubkey: stakerAccount, isSigner: false, isWritable: true },
    { pubkey: stakingPool, isSigner: false, isWritable: false },
    { pubkey: paymentVault, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  programId: PROGRAM_ID,
  data: Buffer.from([CLAIM_STAKER_REWARDS_INDEX]),
});

// Send transaction
const tx = new Transaction().add(instruction);
const signature = await connection.sendTransaction(tx, [staker]);
await connection.confirmTransaction(signature);

console.log('✅ Claimed!', signature);
```

### Using Solana CLI (Advanced)

```bash
# Build instruction data (hex: 0x0F for instruction index 15)
echo "0F" | xxd -r -p > claim_instruction.bin

# Call the program
solana program invoke \
  --program-id 5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc \
  --accounts staker:signer:writable,staker_account:writable,staking_pool,payment_vault:writable,system_program \
  --instruction-file claim_instruction.bin \
  --keypair ./my-wallet.json
```

---

## Option 3: Dashboard Integration (Coming Soon)

We'll add a "Claim Rewards" button to the WHISTLE dashboard:

```javascript
// Future dashboard code
async function claimMyRewards() {
  const { connection, wallet } = useWallet();
  
  // Calculate claimable
  const rewards = await calculateClaimableRewards(wallet.publicKey);
  
  // Show confirmation modal
  if (confirm(`Claim ${rewards} SOL?`)) {
    const signature = await claimRewards(connection, wallet);
    toast.success(`Claimed ${rewards} SOL!`);
  }
}
```

---

## When Should You Claim?

### ✅ **Good Times to Claim:**
- **After large x402 distributions** (check Discord alerts)
- **Monthly** (to compound your earnings)
- **When you need SOL** (convert to USDC, etc.)
- **Before unstaking** (to maximize returns)

### ❌ **Bad Times to Claim:**
- **Every day** (wastes transaction fees)
- **When pool is empty** (no rewards available)
- **When gas fees are high** (rare on Solana, but check)

---

## FAQ

### Q: How often are rewards added to the pool?

**A:** 
- **X402 payments:** Every hour (via cron job)
- **RPC query fees:** Real-time, after each query batch

### Q: Do rewards expire?

**A:** No! Your proportional share stays in the pool until you claim.

### Q: What if I stake more after rewards accumulate?

**A:** Your share increases proportionally. Claim before staking more to maximize the current reward.

### Q: Can I claim on behalf of someone else?

**A:** No, you must be the staker and sign the transaction.

### Q: What's the minimum claimable amount?

**A:** Technically none, but claiming tiny amounts wastes transaction fees (~0.000005 SOL).

### Q: What happens if multiple stakers claim at once?

**A:** Each claim is processed independently. The pool decreases as each staker claims.

---

## Troubleshooting

### Error: "No rewards to claim"
- **Cause:** Pool is empty or your share is 0
- **Solution:** Wait for more distributions, check if you're actually staked

### Error: "Account not found"
- **Cause:** You haven't staked yet
- **Solution:** Stake WHISTLE tokens first

### Error: "Insufficient funds"
- **Cause:** Not enough SOL for transaction fee
- **Solution:** Add 0.001 SOL to your wallet

### Error: "Invalid staker PDA"
- **Cause:** Wrong program ID or keypair
- **Solution:** Verify you're using the correct wallet

---

## Security Notes

🔒 **Your Rewards Are Safe:**
- Rewards are in a PDA (Program Derived Address)
- Only YOU can claim YOUR share
- No one else can claim on your behalf
- Smart contract prevents double-claiming

🔒 **Best Practices:**
- Keep your keypair secure
- Verify transaction before signing
- Use hardware wallet for large stakes
- Double-check recipient address

---

## Smart Contract Reference

**Function:** `claim_staker_rewards` (lines 2344-2423 in lib.rs)

**Calculation Logic:**
```rust
// Calculate proportional share
let share = (staker_data.staked_amount as u128)
    .checked_mul(vault_data.staker_rewards_pool as u128)
    .checked_div(pool.total_staked as u128);
```

**Transfer Logic:**
```rust
// Transfer SOL from vault to staker
**payment_vault.try_borrow_mut_lamports()? -= amount;
**staker.try_borrow_mut_lamports()? += amount;
```

---

## Need Help?

1. **Check the logs:**
   ```bash
   solana logs --program 5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc
   ```

2. **View your staker account:**
   ```bash
   solana account <YOUR_STAKER_PDA>
   ```

3. **Check pool status:**
   ```bash
   node claim-my-rewards.js  # Run in dry-run mode
   ```

4. **Join Discord** for support and distribution alerts

---

**Happy Claiming! 🎉**

