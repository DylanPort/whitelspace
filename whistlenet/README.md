# WHISTLE Network

Decentralized RPC provider network on Solana.

## Architecture

- **Users:** Stake WHISTLE tokens → get access credits → query data
- **Providers:** Run validator nodes → serve queries → earn 70% of fees
- **Smart Contract:** Routes payments (70/20/5/5 split) and tracks reputation

## Smart Contract

**Mainnet Program:** `5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc`

**WHISTLE Token:** `6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump`

**Source:** [contract/src/lib.rs](contract/src/lib.rs)

**IDL:** [contract/idl.json](contract/idl.json)

**Verification:** [VERIFICATION.md](VERIFICATION.md)

## Components

### Smart Contract (`/contract`)
- Staking pool
- Provider registration
- Payment routing
- Reputation system

### Provider Software (`/provider`)
- Solana validator (RPC mode)
- PostgreSQL indexer
- API server
- Monitoring

### SDK (`/sdk`)
- TypeScript client
- Example usage

## Provider Setup

1. Get server (32+ GB RAM, 2+ TB SSD)
2. Download Solana snapshot (~500 GB)
3. Run validator + indexer + API
4. Register with contract
5. Earn from queries

## Payment Flow

Query → User pays SOL → Contract splits:
- 70% → Provider (instant)
- 20% → Bonus pool (top performers)
- 5% → Treasury (development)
- 5% → Stakers (passive income)

## Links

- Solscan: https://solscan.io/account/5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc
- GitHub: https://github.com/DylanPort/whitelspace
