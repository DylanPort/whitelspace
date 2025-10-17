# Privacy Vault - Solana Smart Contract

## Overview
Trustless, collective yield vault for WHISTLE token holders. Users deposit tokens, share in weekly performance (gains or losses), and can withdraw anytime.

## Architecture

### Accounts
1. **Vault State** - Global vault configuration and stats
2. **Vault Token Account** - Holds all deposited WHISTLE tokens
3. **User Position (PDA)** - Per-user deposit tracking

### Instructions

#### 1. InitializeVault
- Creates the vault
- Sets performance targets and loss caps
- One-time setup by admin

#### 2. Deposit
- User deposits WHISTLE tokens
- Receives proportional shares
- No lock-up period

#### 3. Withdraw
- User withdraws their position
- Receives tokens + performance (gain or loss)
- Can withdraw anytime

#### 4. UpdatePerformance
- Oracle updates weekly performance
- Capped at max loss (-25%)
- Applied to all withdrawals

## Security Features

### Trustless Design
- ✅ No admin can withdraw user funds
- ✅ Performance capped at max loss
- ✅ Users can withdraw anytime
- ✅ All logic on-chain and verifiable

### Math Safety
- ✅ Checked arithmetic (no overflow)
- ✅ Proportional share calculation
- ✅ Performance applied fairly to all

### Access Control
- ✅ Only vault authority can update performance
- ✅ Users can only withdraw their own positions
- ✅ PDA-based signing for security

## Deployment

### Devnet (Testing)
```bash
solana config set --url devnet
anchor build
anchor deploy
```

### Mainnet (Production)
```bash
solana config set --url mainnet-beta
anchor build
anchor deploy --provider.cluster mainnet
```

### Cost
- Program deployment: ~5-10 SOL
- Account creation: ~0.01 SOL per user
- Transactions: ~0.000005 SOL each

## Integration with Frontend

See `/integration` folder for JavaScript client code.

## Testing

```bash
cargo test-bpf
```

## Audit Status
⚠️ **NOT AUDITED** - Do not deploy to mainnet without professional audit

## License
MIT

