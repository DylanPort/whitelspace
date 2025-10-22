# 🔒 Ghost Whistle - Contract Addresses

## Quick Reference Card

### 📜 Smart Contract (Staking + Anonymous Relay)
```
2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq
```

**Verify:**
- **Solana Explorer**: https://explorer.solana.com/address/2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq
- **Solscan**: https://solscan.io/account/2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq
- **Source Code**: https://github.com/DylanPort/whitelspace/blob/main/lib-COMPLETE-WITH-RELAY.rs

---

### 💰 $WHISTLE Token
```
6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump
```

**Token Info:**
- **Decimals**: 6
- **Solana Explorer**: https://explorer.solana.com/address/6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump
- **Pump.fun**: https://pump.fun/coin/6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump

---

### 🏦 Pool PDA (Staking Pool)

**How to Calculate:**
```bash
solana-keygen pubkey --derived "pool" --program-id 2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq
```

**What's Stored:**
- Total staked amount (all users)
- Total number of stakers
- Total reputation points
- Fee pool for rewards
- Base reward per relay
- Bonus per reputation point
- Total relay requests processed

---

### 🔐 Pool Vault (Token Account)

The Pool Vault is an Associated Token Account (ATA) of the Pool PDA that holds all staked $WHISTLE tokens.

**Key Security Features:**
- ✅ No private key exists - it's a PDA!
- ✅ Only smart contract can access
- ✅ Publicly auditable on-chain
- ✅ Cannot be drained by anyone
- ✅ Funds are trustless

---

### 👤 Node Account PDA (Per User)

**How to Calculate:**
```bash
# Replace YOUR_WALLET_ADDRESS with your Solana address
solana-keygen pubkey --derived "node" YOUR_WALLET_ADDRESS --program-id 2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq
```

**What's Stored in Your Node Account:**
- Your staked amount
- Your reputation score
- Total relays you've processed
- Pending rewards
- Your node statistics

---

## 🌐 Live Services

### Frontend (Netlify)
```
https://whitelspace.netlify.app
```

### Signaling Server (Render)
```
https://whitelspace.onrender.com
```

### API Endpoints
```
GET https://whitelspace.onrender.com/api/nodes
GET https://whitelspace.onrender.com/api/stats
```

---

## 📊 On-Chain Data Structure

### Pool Account (128 bytes)
```
Offset | Size | Field
-------|------|------------------
0      | 8    | Discriminator
8      | 32   | Authority
40     | 32   | Whistle Mint
72     | 8    | Total Staked (u64)
80     | 8    | Total Nodes (u64)
88     | 8    | Total Reputation
96     | 8    | Fee Pool
104    | 8    | Base Reward
112    | 8    | Bonus Per Point
120    | 8    | Total Relay Requests
```

### Node Account (96 bytes)
```
Offset | Size | Field
-------|------|------------------
0      | 8    | Discriminator
8      | 32   | Owner (User Pubkey)
40     | 8    | Staked Amount (u64)
48     | 8    | Reputation (u64)
56     | 8    | Total Relays (u64)
64     | 8    | Pending Rewards (u64)
72     | 8    | Last Relay Time
80     | 16   | Reserved (future use)
```

---

## 🔍 Verification Commands

### Check Program Status
```bash
solana program show 2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq --url mainnet-beta
```

### Check Token Info
```bash
spl-token display 6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump --url mainnet-beta
```

### Check Your Stake
```bash
# First calculate your Node PDA, then:
solana account [YOUR_NODE_PDA] --url mainnet-beta
```

### Check Pool Balance
```bash
# First find Pool PDA, then find its token account, then:
spl-token balance --address [POOL_VAULT_ADDRESS] --url mainnet-beta
```

---

## 🎯 Contract Functions

### User Functions
- `stake(amount)` - Stake minimum 10,000 $WHISTLE
- `unstake(amount)` - Withdraw anytime, no lock
- `claim_rewards()` - Claim earned rewards
- `record_relay()` - Record completed relay

### Relay Functions
- `create_relay_request(num_hops, relay_fee)` - Create anonymous relay
- `join_relay(request_id)` - Node joins relay chain
- `complete_relay(request_id, tx_hash)` - Finalize relay
- `claim_relay_payment(request_id)` - Claim relay earnings

---

## 💸 Fee Structure

### Minimum Stake
```
10,000 $WHISTLE (10_000_000 with 6 decimals)
```

### Relay Fees (Per Hop)
```
5 $WHISTLE minimum per hop
Example: 5 hops = 25 $WHISTLE fee
```

### Reward Formula
```
Reward = base_reward + (bonus_per_point * reputation)
       = 5 $WHISTLE + (1 $WHISTLE * reputation_score)
```

---

## ✅ Trustless Features

- ✅ **No admin keys** - Cannot be controlled
- ✅ **Non-custodial** - You own your funds
- ✅ **Immutable rules** - Hardcoded, can't change
- ✅ **Open source** - Fully auditable code
- ✅ **Permissionless** - No approval needed
- ✅ **Transparent** - All data on-chain

---

## 📱 Social Media Copy-Paste

### Twitter Post
```
🔒 Ghost Whistle is LIVE on Solana Mainnet!

📜 Program: 2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq
💰 Token: 6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump
🌐 App: https://whitelspace.netlify.app

✅ Non-custodial
✅ No admin keys
✅ Open source
✅ Fully verifiable

Verify everything yourself! 🔍
#Solana #DeFi #Privacy
```

### Discord/Telegram Announcement
```
🎉 GHOST WHISTLE CONTRACT DEPLOYED

Smart Contract Address:
2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq

$WHISTLE Token:
6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump

Live App: https://whitelspace.netlify.app

✅ Trustless staking
✅ Anonymous relay network
✅ Decentralized nodes
✅ Offline payment options

View source: https://github.com/DylanPort/whitelspace
Verify on Solscan: https://solscan.io/account/2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq
```

---

## 🔗 Important Links

| Resource | URL |
|----------|-----|
| **Live App** | https://whitelspace.netlify.app |
| **GitHub** | https://github.com/DylanPort/whitelspace |
| **Contract Source** | [lib-COMPLETE-WITH-RELAY.rs](https://github.com/DylanPort/whitelspace/blob/main/lib-COMPLETE-WITH-RELAY.rs) |
| **Solana Explorer** | https://explorer.solana.com/address/2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq |
| **Solscan** | https://solscan.io/account/2uZWi6wC6CumhcCDCuNZcBaDSd7UJKf4BKreWdx1Pyaq |
| **Token on Pump.fun** | https://pump.fun/coin/6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump |
| **Trustless Proof** | [TRUSTLESS.md](./TRUSTLESS.md) |

---

*Don't trust, verify!* 🔍

