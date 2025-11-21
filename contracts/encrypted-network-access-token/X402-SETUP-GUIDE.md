# X402 90/10 Payment Distribution Setup

## Overview

Your x402 system automatically collects payments from users and distributes them:
- **90% → Stakers** (community rewards)
- **10% → Treasury** (project funds)

## Architecture

```
┌──────────────┐
│   User Pays  │
│  (x402 fee)  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│  X402 Collection Wallet  │ ◄── PDA (Program Derived Address)
│  (On-chain escrow)       │
└──────────┬───────────────┘
           │
           │ Cron Job (every 1 hour)
           ▼
┌──────────────────────────┐
│  ProcessX402Payment()    │
│  Smart Contract Call     │
└──────────┬───────────────┘
           │
      ┌────┴─────┐
      │          │
      ▼          ▼
┌──────────┐  ┌────────┐
│ Stakers  │  │Treasury│
│  (90%)   │  │ (10%)  │
└──────────┘  └────────┘
```

## What's Already Built

✅ **Smart Contract** (`contracts/encrypted-network-access-token/src/lib.rs`)
   - `InitializeX402Wallet` instruction
   - `ProcessX402Payment` instruction
   - Automatic 90/10 split logic

✅ **Distributor Cron Job** (`x402-distributor-cron.js`)
   - Checks X402 wallet balance every hour
   - Triggers distribution when balance > threshold
   - Sends alerts to Discord/Slack webhook

✅ **Helper Functions** (`x402-helpers.ts`)
   - PDA derivation
   - Balance checking
   - Distribution calculation

## Setup Steps

### Step 1: Initialize X402 Wallet (One-Time)

```bash
cd contracts/encrypted-network-access-token

# Install dependencies
npm install

# Set your RPC endpoint
export SOLANA_RPC="https://rpc.whistle.ninja"

# Set your authority keypair path
export AUTHORITY_KEYPAIR="./authority.json"

# Initialize the X402 wallet on-chain
node initialize-x402-wallet.js
```

**Output:**
```
✅ X402 Wallet Successfully Initialized!
   X402 Wallet PDA: A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2
```

### Step 2: Update Client Files

Replace the hardcoded wallet address in all x402 client files with the PDA:

**Files to update:**
- `x402-client.js`
- `whistle-dashboard/public/x402-client.js`
- `apps/web/x402-client.js`
- `netlify/functions/x402-confirm.js`
- `netlify/functions/x402-quote.js`
- `main.html`
- All other files using `G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg`

**Change:**
```javascript
// OLD (hardcoded wallet)
const FEE_COLLECTOR_WALLET = 'G1RHSMtZVZLafmZ9man8anb2HXf7JP5Kh5sbrGZKM6Pg';

// NEW (PDA wallet)
const FEE_COLLECTOR_WALLET = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2';
```

### Step 3: Deploy Distributor Cron Job

#### Option A: Docker (Recommended)

```bash
cd contracts/encrypted-network-access-token

# Edit docker-compose.yml with your settings
nano docker-compose.yml

# Start the distributor
docker-compose up -d x402-distributor

# Check logs
docker-compose logs -f x402-distributor
```

#### Option B: PM2 (Node.js)

```bash
cd contracts/encrypted-network-access-token

# Install PM2 globally
npm install -g pm2

# Set environment variables
export SOLANA_RPC="https://rpc.whistle.ninja"
export AUTHORITY_KEYPAIR="./authority.json"
export MIN_THRESHOLD="0.01"          # Minimum SOL before distribution
export CHECK_INTERVAL="3600000"      # Check every 1 hour (in milliseconds)
export RESERVE_BALANCE="0.001"       # Keep as buffer
export ALERT_WEBHOOK="YOUR_DISCORD_WEBHOOK_URL"

# Start the cron job
pm2 start x402-distributor-cron.js --name whistle-x402-distributor

# Save PM2 config
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

#### Option C: Systemd (Linux)

```bash
# Create systemd service file
sudo nano /etc/systemd/system/whistle-x402-distributor.service
```

```ini
[Unit]
Description=WHISTLE X402 Payment Distributor
After=network.target

[Service]
Type=simple
User=whistle
WorkingDirectory=/path/to/contracts/encrypted-network-access-token
Environment="SOLANA_RPC=https://rpc.whistle.ninja"
Environment="AUTHORITY_KEYPAIR=./authority.json"
Environment="MIN_THRESHOLD=0.01"
Environment="CHECK_INTERVAL=3600000"
Environment="RESERVE_BALANCE=0.001"
ExecStart=/usr/bin/node x402-distributor-cron.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable whistle-x402-distributor
sudo systemctl start whistle-x402-distributor

# Check logs
sudo journalctl -u whistle-x402-distributor -f
```

### Step 4: Configure Alerts (Optional)

Get Discord webhook:
1. Go to your Discord server settings
2. Integrations → Webhooks → New Webhook
3. Copy the webhook URL

Set environment variable:
```bash
export ALERT_WEBHOOK="https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE"
```

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `SOLANA_RPC` | `https://api.mainnet-beta.solana.com` | RPC endpoint (use your private RPC) |
| `AUTHORITY_KEYPAIR` | `./authority.json` | Path to authority keypair |
| `MIN_THRESHOLD` | `0.01` | Minimum SOL balance to trigger distribution |
| `CHECK_INTERVAL` | `3600000` | Check interval in milliseconds (1 hour) |
| `RESERVE_BALANCE` | `0.001` | Reserve to keep in wallet (for rent) |
| `ALERT_WEBHOOK` | `null` | Discord/Slack webhook for alerts |

## Monitoring

### Check X402 Wallet Balance

```bash
# Get X402 wallet PDA address first
node -e "
import { PublicKey } from '@solana/web3.js';
const PROGRAM_ID = new PublicKey('5cmaPy5i8efSWSwRVVuWr9VUx8sAMv6qMVSE1o82TRgc');
const [pda] = PublicKey.findProgramAddressSync([Buffer.from('x402_payment_wallet')], PROGRAM_ID);
console.log(pda.toBase58());
"

# Check balance
solana balance <X402_WALLET_ADDRESS>
```

### View Distribution History

```bash
# Get recent transactions
solana transaction-history <X402_WALLET_ADDRESS> --limit 10
```

### Monitor Logs

**Docker:**
```bash
docker-compose logs -f x402-distributor
```

**PM2:**
```bash
pm2 logs whistle-x402-distributor
```

**Systemd:**
```bash
sudo journalctl -u whistle-x402-distributor -f
```

## Testing

### Manual Distribution Test

```bash
cd contracts/encrypted-network-access-token

# Create test script
node -e "
import { Connection, Keypair } from '@solana/web3.js';
import { processX402Payment } from './x402-helpers.ts';
import * as fs from 'fs';

const connection = new Connection('https://rpc.whistle.ninja');
const authority = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./authority.json'))));

// Distribute 0.001 SOL as test
await processX402Payment(connection, authority, 1000000); // 0.001 SOL in lamports
"
```

## Troubleshooting

### Issue: "X402 wallet NOT initialized"
**Solution:** Run `node initialize-x402-wallet.js`

### Issue: "Authority keypair not found"
**Solution:** Create or copy your authority keypair to `./authority.json`

### Issue: "Insufficient balance in X402 wallet"
**Solution:** Wait for more x402 payments to accumulate, or lower `MIN_THRESHOLD`

### Issue: "Transaction failed"
**Solution:** 
1. Check authority has enough SOL for transaction fees
2. Verify RPC endpoint is working: `curl https://rpc.whistle.ninja`
3. Check smart contract is deployed correctly

## Security Notes

🔒 **Authority Keypair:**
- Keep `authority.json` secure (never commit to git)
- Use a dedicated keypair with minimal permissions
- Store backups encrypted

🔒 **Environment Variables:**
- Never hardcode sensitive values
- Use `.env` files for local development
- Use secrets management for production (Vault, AWS Secrets Manager, etc.)

## Integration with NLx402

Once NLx402 is ready:

1. Update x402 payment collection to use NLx402 API
2. Keep the same X402 wallet PDA as destination
3. The distributor will work automatically (agnostic to payment source)

## Dashboard Integration

Add to your dashboard:

```javascript
// Fetch X402 wallet stats
async function getX402Stats() {
  const x402WalletPDA = 'YOUR_X402_WALLET_PDA';
  const balance = await connection.getBalance(new PublicKey(x402WalletPDA));
  
  return {
    totalCollected: balance / LAMPORTS_PER_SOL,
    nextDistribution: balance > MIN_THRESHOLD ? 'Pending' : 'Accumulating',
    stakerShare: (balance * 0.9) / LAMPORTS_PER_SOL,
    treasuryShare: (balance * 0.1) / LAMPORTS_PER_SOL,
  };
}
```

## Questions?

Check the logs first:
- Docker: `docker-compose logs x402-distributor`
- PM2: `pm2 logs whistle-x402-distributor`
- Systemd: `journalctl -u whistle-x402-distributor -f`

If still stuck, check:
1. X402 wallet initialized? → `node initialize-x402-wallet.js`
2. Authority keypair valid? → `solana-keygen verify <pubkey> authority.json`
3. RPC endpoint working? → `curl https://rpc.whistle.ninja`

