# Smart Contract Verification

## Deployed Program

**Program ID:** `5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc`

**Network:** Solana Mainnet-Beta

**Deployed:** November 14, 2025

**Upgrade Authority:** Controlled by deployer wallet

## Verification Steps

### 1. View on Solscan
https://solscan.io/account/5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc

### 2. Compare Source Code

**Official Source:** [contract/src/lib.rs](contract/src/lib.rs)

**Build yourself:**
```bash
cd contract
cargo build-bpf
```

**Check program hash:**
```bash
solana program show 5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc
```

### 3. Verify IDL

**IDL File:** [contract/idl.json](contract/idl.json)

The IDL describes all instructions and accounts. Compare with source code to verify accuracy.

### 4. Review Audits

**Security Audit:** [contract/FINAL_SECURITY_AUDIT.md](contract/FINAL_SECURITY_AUDIT.md)

- 6 rounds completed
- All critical/high/medium issues fixed
- Production-ready rating

## Key Constants

```rust
WHISTLE_MINT = "6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump"
MAX_STAKE_PER_USER = 100,000,000,000,000
MIN_PROVIDER_BOND = 1,000,000,000
```

## PDAs (Program Derived Addresses)

```
Staking Pool: ["staking_pool", authority]
Token Vault: ["token_vault", authority]
Staker Account: ["staker", user_pubkey]
Provider Account: ["provider", provider_pubkey]
Payment Vault: ["payment_vault", authority]
```

## Instructions

- InitializePool
- Stake / Unstake
- RegisterProvider / DeregisterProvider
- ProcessQueryPayment
- ClaimProviderEarnings
- ClaimStakerRewards
- RecordHeartbeat
- UpdateEndpoint

Full details in [idl.json](contract/idl.json)

## Security Features

- PDA verification on all accounts
- Checked arithmetic (no overflows)
- Re-initialization protection
- Token account validation
- Rate limiting (heartbeats)
- Access control (signer checks)

## Contact

For security issues: [Open GitHub issue](https://github.com/DylanPort/whitelspace/issues)

