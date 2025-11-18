# WHISTLE Network Smart Contract - Developer Guide

## Quick Reference for New Instructions

### 🏁 Setup Instructions

#### 1. Initialize Staking Pool (One-time)
```typescript
await program.methods
  .initializePool(
    minStakeAmount,      // e.g., 10_000_000_000 (10 WHISTLE)
    tokensPerWhistle,    // e.g., 1 (1:1 ratio)
    cooldownPeriod       // e.g., 86400 (24 hours)
  )
  .accounts({
    authority: authorityKeypair.publicKey,
    stakingPool: stakingPoolPDA,
    tokenVault: tokenVaultPDA,
    whistleMint: WHISTLE_MINT, // 6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  })
  .rpc();
```

#### 2. Initialize Payment Vault (One-time)
```typescript
await program.methods
  .initializePaymentVault()
  .accounts({
    authority: authorityKeypair.publicKey,
    paymentVault: paymentVaultPDA,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  })
  .rpc();
```

---

### 👤 User Flow

#### 1. Stake WHISTLE Tokens
```typescript
// User stakes WHISTLE to get access tokens
await program.methods
  .stake(amount) // e.g., 10_000_000_000 (10 WHISTLE)
  .accounts({
    staker: userWallet.publicKey,
    stakingPool: stakingPoolPDA,
    stakerAccount: stakerAccountPDA,
    stakerTokenAccount: userWhistleTokenAccount,
    tokenVault: tokenVaultPDA,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    clock: SYSVAR_CLOCK_PUBKEY,
  })
  .rpc();
```

#### 2. Query Data (Pay SOL)
```typescript
// User pays 0.001 SOL for query
await program.methods
  .processQueryPayment(
    providerPublicKey,
    new BN(1_000_000) // 0.001 SOL in lamports
  )
  .accounts({
    user: userWallet.publicKey,
    paymentVault: paymentVaultPDA,
    providerAccount: providerAccountPDA,
    stakingPool: stakingPoolPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

#### 3. Claim Staker Rewards (5% Pool)
```typescript
// Staker claims their share of 5% rewards
await program.methods
  .claimStakerRewards()
  .accounts({
    staker: userWallet.publicKey,
    stakerAccount: stakerAccountPDA,
    paymentVault: paymentVaultPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

#### 4. Unstake WHISTLE Tokens
```typescript
// User unstakes after cooldown period
await program.methods
  .unstake(amount)
  .accounts({
    staker: userWallet.publicKey,
    stakingPool: stakingPoolPDA,
    stakerAccount: stakerAccountPDA,
    stakerTokenAccount: userWhistleTokenAccount,
    tokenVault: tokenVaultPDA,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    clock: SYSVAR_CLOCK_PUBKEY,
  })
  .rpc();
```

---

### 🖥️ Provider Flow

#### 1. Register as Provider
```typescript
// Bond 1000+ WHISTLE tokens and register endpoint
await program.methods
  .registerProvider(
    "https://my-provider.com:8080",
    new BN(1_000_000_000_000) // 1000 WHISTLE bond
  )
  .accounts({
    provider: providerWallet.publicKey,
    providerAccount: providerAccountPDA,
    providerTokenAccount: providerWhistleTokenAccount,
    tokenVault: tokenVaultPDA,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    clock: SYSVAR_CLOCK_PUBKEY,
  })
  .rpc();
```

#### 2. Send Heartbeat (Every 60 seconds)
```typescript
// Provider pings to prove online status
await program.methods
  .recordHeartbeat()
  .accounts({
    provider: providerWallet.publicKey,
    providerAccount: providerAccountPDA,
    clock: SYSVAR_CLOCK_PUBKEY,
  })
  .rpc();
```

#### 3. Record Query (After Serving)
```typescript
// Provider records that they served a query
await program.methods
  .recordQuery(userPublicKey)
  .accounts({
    provider: providerWallet.publicKey,
    providerAccount: providerAccountPDA,
  })
  .rpc();
```

#### 4. Claim Earnings (70% Share)
```typescript
// Provider withdraws their accumulated earnings
await program.methods
  .claimProviderEarnings()
  .accounts({
    provider: providerWallet.publicKey,
    providerAccount: providerAccountPDA,
    paymentVault: paymentVaultPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

#### 5. Update Endpoint
```typescript
// Change API endpoint URL
await program.methods
  .updateEndpoint("https://new-endpoint.com:8080")
  .accounts({
    provider: providerWallet.publicKey,
    providerAccount: providerAccountPDA,
  })
  .rpc();
```

#### 6. Deregister (Get Bond Back)
```typescript
// Exit network and return bond (minus slashed amount)
await program.methods
  .deregisterProvider()
  .accounts({
    provider: providerWallet.publicKey,
    providerAccount: providerAccountPDA,
    tokenVault: tokenVaultPDA,
    providerTokenAccount: providerWhistleTokenAccount,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();
```

---

### 🔐 Authority/Oracle Flow

#### 1. Update Reputation Metrics
```typescript
// Oracle updates provider reputation scores
await program.methods
  .updateReputationMetrics(
    providerPublicKey,
    new BN(9500),  // 95% uptime
    new BN(100),   // 100ms avg latency
    new BN(10000)  // 100% accuracy
  )
  .accounts({
    authority: oracleWallet.publicKey,
    providerAccount: providerAccountPDA,
  })
  .rpc();
```

#### 2. Slash Provider
```typescript
// Penalize provider for violations
await program.methods
  .slashProvider(
    providerPublicKey,
    new BN(100_000_000_000), // 100 WHISTLE penalty
    { lowUptime: {} } // SlashReason enum variant
  )
  .accounts({
    authority: oracleWallet.publicKey,
    providerAccount: providerAccountPDA,
    paymentVault: paymentVaultPDA,
  })
  .rpc();
```

#### 3. Distribute Bonus Pool (20%)
```typescript
// Distribute 20% bonus pool to top 20% providers
const topProviders = [provider1PDA, provider2PDA, provider3PDA]; // Top by reputation

await program.methods
  .distributeBonusPool(topProviders)
  .remainingAccounts([
    { pubkey: provider1PDA, isSigner: false, isWritable: true },
    { pubkey: provider2PDA, isSigner: false, isWritable: true },
    { pubkey: provider3PDA, isSigner: false, isWritable: true },
  ])
  .accounts({
    authority: oracleWallet.publicKey,
    paymentVault: paymentVaultPDA,
  })
  .rpc();
```

#### 4. Trigger Staker Rewards Distribution
```typescript
// Prepare 5% pool for staker claims
await program.methods
  .distributeStakerRewards()
  .accounts({
    authority: oracleWallet.publicKey,
    paymentVault: paymentVaultPDA,
    stakingPool: stakingPoolPDA,
  })
  .rpc();
```

---

### 🔍 Query Authorization Flow

#### Check if User Can Query
```typescript
// Before serving query, check authorization
try {
  await program.methods
    .authorizeQuery(userPublicKey, providerPublicKey)
    .accounts({
      stakerAccount: userStakerAccountPDA,
      providerAccount: providerAccountPDA,
      stakingPool: stakingPoolPDA,
    })
    .rpc();
  
  // Authorized! Serve the query
  console.log("User authorized to query");
} catch (err) {
  // Not authorized
  console.error("User not authorized:", err);
}
```

---

## 📊 PDA Derivations

```typescript
// Staking Pool PDA
const [stakingPoolPDA, poolBump] = await PublicKey.findProgramAddress(
  [Buffer.from("staking_pool"), authority.toBuffer()],
  programId
);

// Token Vault PDA (for WHISTLE tokens)
const [tokenVaultPDA, vaultBump] = await PublicKey.findProgramAddress(
  [Buffer.from("token_vault"), authority.toBuffer()],
  programId
);

// Staker Account PDA
const [stakerAccountPDA, stakerBump] = await PublicKey.findProgramAddress(
  [Buffer.from("staker"), userWallet.publicKey.toBuffer()],
  programId
);

// Provider Account PDA
const [providerAccountPDA, providerBump] = await PublicKey.findProgramAddress(
  [Buffer.from("provider"), providerWallet.publicKey.toBuffer()],
  programId
);

// Payment Vault PDA
const [paymentVaultPDA, paymentBump] = await PublicKey.findProgramAddress(
  [Buffer.from("payment_vault"), authority.toBuffer()],
  programId
);
```

---

## 💰 Payment Flow Example

```typescript
// User queries data → SOL payment automatically splits

const queryCost = 1_000_000; // 0.001 SOL

await program.methods
  .processQueryPayment(providerPublicKey, new BN(queryCost))
  .accounts({
    user: userWallet.publicKey,
    paymentVault: paymentVaultPDA,
    providerAccount: providerAccountPDA,
    stakingPool: stakingPoolPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Automatically:
// - 70% (0.0007 SOL) → provider.pending_earnings
// - 20% (0.0002 SOL) → bonus_pool
// - 5% (0.00005 SOL) → treasury
// - 5% (0.00005 SOL) → staker_rewards_pool
```

---

## 🎯 Constants

```rust
MIN_PROVIDER_BOND = 1_000_000_000      // 1000 WHISTLE tokens
QUERY_COST = 1_000_000                  // 0.001 SOL
HEARTBEAT_TIMEOUT = 300                 // 5 minutes
MAX_STAKE_PER_USER = 100_000_000_000_000 // 100k WHISTLE
```

---

## 🚨 Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `InvalidSeeds` | Wrong PDA derivation | Check seed format matches contract |
| `MissingRequiredSignature` | Wallet not signing | Add `.signers([wallet])` |
| `InsufficientFunds` | Not enough WHISTLE/SOL | Fund wallet first |
| `AccountAlreadyInitialized` | Pool/vault exists | Skip init, use existing |
| `InvalidAccountData` | Pool paused or inactive | Wait for activation |
| `ArithmeticOverflow` | Amount too large | Use smaller amounts |

---

## 📚 Full Type Definitions

### StakingPool
```typescript
{
  authority: PublicKey,
  whistleMint: PublicKey,
  tokenVault: PublicKey,
  totalStaked: BN,
  totalAccessTokens: BN,
  minStakeAmount: BN,
  tokensPerWhistle: BN,
  isActive: boolean,
  createdAt: BN,
  cooldownPeriod: BN,
  maxStakePerUser: BN,
  rateLocked: boolean,
  bump: number
}
```

### ProviderAccount
```typescript
{
  provider: PublicKey,
  endpoint: string,
  registeredAt: BN,
  isActive: boolean,
  stakeBond: BN,
  totalEarned: BN,
  pendingEarnings: BN,
  queriesServed: BN,
  reputationScore: BN,      // 0-10000
  uptimePercentage: BN,     // 0-10000
  responseTimeAvg: BN,      // milliseconds
  accuracyScore: BN,        // 0-10000
  lastHeartbeat: BN,
  slashedAmount: BN,
  penaltyCount: number,
  bump: number
}
```

### PaymentVault
```typescript
{
  authority: PublicKey,
  totalCollected: BN,
  providerPool: BN,         // 70%
  bonusPool: BN,            // 20%
  treasury: BN,             // 5%
  stakerRewardsPool: BN,    // 5%
  lastDistribution: BN,
  bump: number
}
```

---

## 🔄 Complete User Journey

1. **User stakes 100 WHISTLE** → Gets 100 access tokens
2. **Provider registers with 1000 WHISTLE bond** → Gets provider account
3. **Provider sends heartbeat** every 60s → Maintains uptime score
4. **User queries data** → Pays 0.001 SOL:
   - 0.0007 SOL → Provider pending earnings
   - 0.0002 SOL → Bonus pool
   - 0.00005 SOL → Treasury
   - 0.00005 SOL → Staker rewards
5. **Oracle updates reputation** → Provider scored on uptime/speed/accuracy
6. **Oracle distributes bonus pool** → Top 20% providers split 0.0002 SOL
7. **Provider claims earnings** → Withdraws 0.0007 SOL + bonus share
8. **User claims staker rewards** → Withdraws proportional share of 0.00005 SOL
9. **User unstakes** (after 24h cooldown) → Gets 100 WHISTLE back

---

**Ready to build!** 🚀

For issues or questions, refer to `IMPLEMENTATION_SUMMARY.md` or the architecture docs at `whistlenet/architecture.html`.



