# 🔐 NLx402 Integration for WHISTLE RPC Network

## Overview

This integration adds **Nonce-Locked x402 (NLx402)** payment protection to the WHISTLE RPC network, providing:

- **Single-use payment quotes** - Each quote has a unique nonce that can only be used once
- **Hash-bound authorization** - Cryptographically secure payment verification
- **Fast expiration** - Quotes expire in 5 minutes to reduce attack windows
- **Replay attack prevention** - Nonces cannot be reused
- **Bulk query discounts** - Automatic discounts for high-volume users

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User/DApp                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │ 1. Get Quote   │ POST /api/rpc/quote
        │   (nonce)      │ → Returns quote with unique nonce
        └────────┬───────┘
                 │
                 ▼
        ┌────────────────┐
        │ 2. Verify      │ POST /api/rpc/verify
        │   Quote        │ → Locks nonce, prevents tampering
        └────────┬───────┘
                 │
                 ▼
        ┌────────────────┐
        │ 3. Pay on      │ Solana Transaction
        │   Chain        │ → Send SOL to recipient
        └────────┬───────┘
                 │
                 ▼
        ┌────────────────┐
        │ 4. Unlock      │ POST /api/rpc/unlock
        │   Access       │ → Returns access token
        └────────┬───────┘
                 │
                 ▼
        ┌────────────────┐
        │ 5. Make RPC    │ POST /api/rpc
        │   Calls        │ → Use access token in header
        └────────────────┘
```

## Files Structure

```
WHISTLE/
├── NLx402-SDK/                    # Cloned NLx402 SDK
│   └── javascript/
│       └── nlx402.js             # Core NLx402 client
│
├── lib/
│   └── nlx402-rpc-integration.js # WHISTLE-specific integration
│
├── nlx402-rpc-server.js          # Express server with NLx402
├── test-nlx402-rpc.js            # Test client
├── nlx402.env.example            # Environment template
├── START-NLX402-RPC.bat          # Windows startup script
└── NLX402-INTEGRATION.md         # This file
```

## Quick Start

### 1. Install Dependencies

```bash
npm install axios express cors dotenv
git clone https://github.com/Perkins-Fund/NLx402-SDK.git
```

### 2. Configure Environment

Copy the example environment file and edit it:

```bash
cp nlx402.env.example .env
```

Edit `.env`:
```env
NLX402_API_KEY=your_api_key_here
NLX402_BASE_URL=https://pay.thrt.ai
NLX402_RPC_PORT=4402
```

### 3. Start the Server

**Windows:**
```batch
START-NLX402-RPC.bat
```

**Mac/Linux:**
```bash
node nlx402-rpc-server.js
```

### 4. Test the Integration

```bash
node test-nlx402-rpc.js
```

## API Endpoints

### Get RPC Quote
```http
POST /api/rpc/quote
Content-Type: application/json

{
  "walletAddress": "7BZQ...",
  "queryCount": 100,
  "rpcMethod": "getBalance"  // optional
}
```

Response:
```json
{
  "success": true,
  "quote": {
    "amount": "0.01",
    "mint": "SOL",
    "nonce": "unique_nonce_123",
    "expires_at": 1234567890,
    "recipient": "payment_address",
    "whistle": {
      "queryCount": 100,
      "totalPrice": 0.01,
      "discount": 0.95,
      "validFor": 300
    }
  }
}
```

### Verify Quote
```http
POST /api/rpc/verify
Content-Type: application/json

{
  "quote": {...},
  "nonce": "unique_nonce_123",
  "walletAddress": "7BZQ..."
}
```

### Unlock Access
```http
POST /api/rpc/unlock
Content-Type: application/json

{
  "tx": "transaction_signature",
  "nonce": "unique_nonce_123",
  "walletAddress": "7BZQ..."
}
```

Response:
```json
{
  "success": true,
  "accessToken": "sha256_token",
  "rpcEndpoint": "https://rpc.whistle.ninja",
  "queriesAllowed": 100,
  "expiresIn": 86400
}
```

### Make RPC Calls
```http
POST /api/rpc
X-Access-Token: your_access_token
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getBalance",
  "params": ["wallet_address"]
}
```

## Pricing

| Queries | Price per Query | Discount | Total Price |
|---------|----------------|----------|-------------|
| 1-99 | 0.0001 SOL | 0% | Standard |
| 100-999 | 0.0001 SOL | 5% | 0.000095 SOL each |
| 1000-9999 | 0.0001 SOL | 10% | 0.00009 SOL each |
| 10000+ | 0.0001 SOL | 15% | 0.000085 SOL each |

## Security Features

### 1. Nonce Locking
- Each quote gets a unique nonce
- Nonces can only be used once
- Prevents replay attacks

### 2. Hash Binding
- Quotes are cryptographically signed
- Tampering is detected and rejected
- Server re-derives quotes for verification

### 3. Fast Expiration
- Quotes expire in 5 minutes
- Reduces attack window
- Forces fresh quotes for each session

### 4. Wallet Verification
- Quotes are bound to specific wallets
- Prevents cross-wallet attacks
- Ensures payment matches requester

## Integration with WHISTLE Contract

The NLx402 system complements the existing WHISTLE smart contract:

1. **Payment Flow**:
   - User pays via NLx402 (off-chain quote, on-chain payment)
   - Payment goes to WHISTLE treasury
   - Smart contract handles distribution (70/20/5/5 split)

2. **Provider Earnings**:
   - Cache nodes still earn 70% of query fees
   - NLx402 adds security layer without changing economics
   - Providers tracked via smart contract

3. **Staker Rewards**:
   - Stakers still earn 5% of all fees
   - X402 payments can trigger bonus distributions
   - Enhanced with NLx402 security

## Testing

### Unit Tests
```bash
# Test the integration module
npm test lib/nlx402-rpc-integration.test.js

# Test the server endpoints
npm test nlx402-rpc-server.test.js
```

### Integration Test
```bash
# Run the full flow test
node test-nlx402-rpc.js
```

### Load Testing
```bash
# Test with multiple concurrent users
npm run load-test
```

## Monitoring

The server provides health and stats endpoints:

```http
GET /health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "stats": {
    "verifiedNonces": 10,
    "paidNonces": 8,
    "activeTokens": 5,
    "totalQueries": 1234
  }
}
```

## Troubleshooting

### Common Issues

1. **"Invalid or expired nonce"**
   - Nonces expire after 5 minutes
   - Request a new quote

2. **"Payment not confirmed"**
   - Ensure transaction is confirmed on-chain
   - Check transaction signature is correct

3. **"Query limit reached"**
   - Access token has used all allowed queries
   - Purchase a new quote for more queries

4. **"All upstream RPC nodes are unavailable"**
   - Configure backup RPC endpoints in .env
   - Check network connectivity

## Production Deployment

### Requirements
- Node.js 18+
- 2GB RAM minimum
- SSL certificate (for HTTPS)
- NLx402 API key
- Upstream RPC endpoints

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 4402
CMD ["node", "nlx402-rpc-server.js"]
```

### Environment Variables
```env
NODE_ENV=production
NLX402_API_KEY=production_key
NLX402_BASE_URL=https://pay.thrt.ai
WHISTLE_RPC_ENDPOINT=https://rpc.whistle.ninja
```

### Scaling
- Use PM2 for process management
- Deploy behind nginx/HAProxy
- Redis for nonce storage (multi-instance)
- Horizontal scaling with load balancer

## Benefits

### For Users
- ✅ **Secure** - No replay attacks possible
- ✅ **Fair** - Pay only for what you use
- ✅ **Fast** - 5-10ms cache responses
- ✅ **Reliable** - Multi-upstream failover

### For Providers
- ✅ **Protected** - Guaranteed payment for queries
- ✅ **Tracked** - Every query counted accurately
- ✅ **Profitable** - 70% of fees go to providers

### For WHISTLE Network
- ✅ **Sustainable** - Clear revenue model
- ✅ **Scalable** - Handles millions of queries
- ✅ **Decentralized** - Community-owned infrastructure

## Next Steps

1. **Get NLx402 API Key**:
   - Visit https://pay.thrt.ai
   - Create account
   - Generate API key

2. **Deploy to Production**:
   - Set up SSL certificate
   - Configure domain
   - Deploy with Docker/PM2

3. **Integrate with Dashboard**:
   - Add NLx402 stats to provider dashboard
   - Show earnings from NLx402 payments
   - Track query usage

4. **Community Launch**:
   - Announce on Telegram
   - Provide setup guides
   - Offer early bird discounts

## Support

- **GitHub Issues**: [Report bugs](https://github.com/DylanPort/whitelspace/issues)
- **Telegram**: [@whistleninja](https://t.me/whistleninja)
- **Documentation**: [WHISTLE Docs](https://whistle.ninja/docs)

---

**Built with 🔐 by WHISTLE Network**

*Securing the future of decentralized RPC infrastructure*
