# WHISTLE Backend - NLx402 Payment Server

Node.js backend server for WHISTLE Network providing:
- NLx402 payment protection for x402 features
- NLx402 RPC access control
- HIBP breach monitoring
- Health monitoring endpoints

## Environment Variables

Required for deployment:

```env
# NLx402 Configuration
NLX402_API_KEY=your_api_key_here
NLX402_BASE_URL=https://pay.thrt.ai

# Upstream RPC Endpoints
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
QUICKNODE_RPC_URL=https://YOUR_ENDPOINT.quiknode.pro/YOUR_TOKEN/

# Have I Been Pwned API
HIBP_API_KEY=your_hibp_api_key

# Port (Render will override this)
PORT=3001
```

## Deployment

Deploy to Render, Railway, or any Node.js hosting platform.

### Start Command:
```bash
node server.js
```

### Health Check Endpoint:
```
GET /health
```

Returns: `{ status: 'ok', timestamp: ... }`

## API Endpoints

### NLx402 General Access (x402 features)
- `POST /api/nlx402/quote` - Generate payment quote
- `POST /api/nlx402/verify` - Verify quote
- `POST /api/nlx402/unlock` - Unlock access
- `GET /api/nlx402/stats` - Statistics

### NLx402 RPC Access
- `POST /api/rpc/quote` - Generate RPC quote
- `POST /api/rpc/verify` - Verify RPC quote
- `POST /api/rpc/unlock` - Unlock RPC access
- `POST /api/rpc` - Protected RPC endpoint
- `GET /api/rpc/stats` - RPC statistics

### Other Services
- `POST /api/check-breach` - HIBP breach check
- `GET /api/token-info/:address` - Solana token info
- `GET /health` - Health check

## Dependencies

All dependencies are listed in `package.json` at the root level.

