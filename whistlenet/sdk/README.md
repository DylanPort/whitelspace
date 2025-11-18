# @whistle/sdk

**TypeScript SDK for WHISTLE Network** - Decentralized Solana data access

Build apps that query Solana blockchain data through a decentralized provider network.

---

## 🚀 Quick Start

### Installation

```bash
npm install @whistle/sdk
# or
yarn add @whistle/sdk
```

### Basic Usage

```typescript
import { WhistleClient, PublicKey } from '@whistle/sdk';

// Create client
const client = new WhistleClient({
  network: 'mainnet',
});

// Get user's WHISTLE balance
const balance = await client.getWhistleBalance(userPublicKey);

// Query transactions
const transactions = await client.queryTransactions({
  wallet: 'YourWalletAddress...',
  from: new Date('2024-01-01'),
  to: new Date('2024-12-31'),
  limit: 100,
});
```

---

## 📖 Complete Examples

### Staking WHISTLE Tokens

```typescript
import { WhistleClient, Keypair } from '@whistle/sdk';

const client = new WhistleClient({ network: 'mainnet' });
const userKeypair = Keypair.fromSecretKey(/* your secret key */);

// Stake 1000 WHISTLE tokens
const result = await client.stake(
  {
    amount: 1000,
    wallet: userKeypair.publicKey,
  },
  userKeypair
);

console.log('Staked! Signature:', result.signature);
```

### Querying Blockchain Data

```typescript
// Get all transactions for a wallet
const txs = await client.queryTransactions({
  wallet: 'WalletAddress...',
  from: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
  limit: 1000,
});

// Get token balances
const balances = await client.getTokenBalances('WalletAddress...');

// Get NFTs
const nfts = await client.getNFTs('WalletAddress...');
```

### Provider Operations

```typescript
// Register as a provider
await client.registerProvider(
  {
    provider: providerKeypair.publicKey,
    endpoint: 'https://api.yourprovider.com',
    bondAmount: 1000, // 1000 WHISTLE
  },
  providerKeypair
);

// Get active providers
const providers = await client.getActiveProviders();
console.log(`${providers.length} providers online`);
```

### Claiming Rewards

```typescript
// Claim staker rewards (5% of query payments)
const result = await client.claimRewards(
  userKeypair.publicKey,
  userKeypair
);

console.log('Rewards claimed:', result.signature);
```

### Event Listening

```typescript
// Subscribe to SDK events
client.on((event) => {
  switch (event.type) {
    case 'staked':
      console.log('User staked:', event.data.amount);
      break;
    case 'query-paid':
      console.log('Query paid:', event.data.amount);
      break;
    case 'rewards-claimed':
      console.log('Rewards claimed:', event.data.amount);
      break;
  }
});
```

---

## 🔧 Configuration

### Network Selection

```typescript
// Mainnet (default)
const client = new WhistleClient({ network: 'mainnet' });

// Devnet for testing
const client = new WhistleClient({ network: 'devnet' });

// Custom RPC endpoint
const client = new WhistleClient({
  rpcEndpoint: 'https://your-custom-rpc.com',
});

// Custom connection
import { Connection } from '@solana/web3.js';
const connection = new Connection('https://api.mainnet-beta.solana.com');
const client = new WhistleClient({ connection });
```

---

## 📊 API Reference

### WhistleClient

#### Constructor

```typescript
new WhistleClient(config?: WhistleConfig)
```

#### Staking Methods

- `stake(params: StakeParams, signer: Keypair): Promise<TransactionResult>`
- `unstake(params: UnstakeParams, signer: Keypair): Promise<TransactionResult>`
- `getStakerAccount(wallet: PublicKey): Promise<StakerAccount | null>`
- `getWhistleBalance(wallet: PublicKey): Promise<number>`

#### Query Methods

- `queryTransactions(request: QueryRequest): Promise<TransactionData[]>`
- `getTokenBalances(wallet: string): Promise<TokenBalance[]>`
- `getNFTs(wallet: string): Promise<NFTData[]>`

#### Provider Methods

- `registerProvider(params: RegisterProviderParams, signer: Keypair): Promise<TransactionResult>`
- `getActiveProviders(): Promise<ProviderInfo[]>`
- `selectProvider(): Promise<ProviderInfo | null>`
- `getProviderAccount(provider: PublicKey): Promise<ProviderAccount | null>`

#### Rewards Methods

- `claimRewards(wallet: PublicKey, signer: Keypair): Promise<TransactionResult>`

#### Utility Methods

- `toBaseUnits(amount: number): bigint` - Convert WHISTLE to base units
- `fromBaseUnits(amount: bigint): number` - Convert base units to WHISTLE
- `getConnection(): Connection` - Get Solana connection
- `getProgramId(): PublicKey` - Get program ID

#### Event Methods

- `on(listener: EventListener): void` - Subscribe to events
- `off(listener: EventListener): void` - Unsubscribe from events

---

## 💰 Costs & Economics

### For Users

```typescript
// One-time stake (suggested minimum)
await client.stake({ amount: 1000, wallet }, signer);

// Per-query cost: 0.001 SOL (~$0.0002)
const txs = await client.queryTransactions({ wallet: 'ABC...' });

// Monthly for 1000 queries: 1 SOL (~$200)
// vs Helius: $250/month subscription
```

### For Providers

```typescript
// Minimum bond: 1000 WHISTLE
await client.registerProvider({
  provider: providerKey,
  endpoint: 'https://api.provider.com',
  bondAmount: 1000,
}, providerSigner);

// Earnings: 70% of each query (0.0007 SOL)
// Break-even: ~200-500 queries/month
```

---

## 🔑 Constants

```typescript
import { NETWORK_CONSTANTS, PAYMENT_SPLIT } from '@whistle/sdk';

console.log(NETWORK_CONSTANTS.MIN_STAKE_AMOUNT); // 100 WHISTLE
console.log(NETWORK_CONSTANTS.QUERY_COST); // 0.001 SOL
console.log(PAYMENT_SPLIT.PROVIDER); // 70%
```

---

## 🎯 Use Cases

### 1. Portfolio Tracker

```typescript
const balances = await client.getTokenBalances(wallet);
const nfts = await client.getNFTs(wallet);
```

### 2. Trading Bot

```typescript
// Monitor whale wallets
const txs = await client.queryTransactions({
  wallet: whaleWallet,
  from: Date.now() - 3600000, // Last hour
});
```

### 3. Analytics Dashboard

```typescript
// Get historical data
const txs = await client.queryTransactions({
  wallet: userWallet,
  from: startDate,
  to: endDate,
  limit: 10000,
});
```

---

## 🛠️ Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Testing

```bash
npm test
```

---

## 🔗 Links

- [Documentation](https://docs.whistle.network)
- [GitHub](https://github.com/DylanPort/whitelspace)
- [Website](https://whistle.network)
- [X (Twitter)](https://x.com/Whistle_Ninja)

---

## 📄 License

MIT License - see [LICENSE](../contract/LICENSE) file.

---

## 🤝 Support

- **Telegram:** [t.me/whistleninja](https://t.me/whistleninja)
- **GitHub Issues:** [Report bugs](https://github.com/DylanPort/whitelspace/issues)

---

**Built with ⚡ by the WHISTLE Network team**


