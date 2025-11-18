# Backend RPC Proxy Endpoint

**This endpoint needs to be added to the backend API on the Netcup server.**

## File Location

`/root/whitelspace/whistlenet/provider/api/src/routes/rpc.ts`

## Implementation

```typescript
import express from 'express';
import { Connection, clusterApiUrl } from '@solana/web3.js';

const router = express.Router();

// Solana connection (use our local validator once it's stable)
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'http://localhost:8899',
  'confirmed'
);

/**
 * POST /rpc
 * JSON-RPC 2.0 proxy endpoint
 * Forwards queries to Solana blockchain and records metrics
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();
  const { method, params, id = 1 } = req.body;

  // Validate JSON-RPC 2.0 format
  if (!method) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32600,
        message: 'Invalid Request: method is required',
      },
    });
  }

  try {
    let result: any;

    // Map JSON-RPC methods to web3.js methods
    switch (method) {
      case 'getAccountInfo':
        const [accountPubkey, opts] = params || [];
        if (!accountPubkey) throw new Error('Account address required');
        result = await connection.getAccountInfo(new PublicKey(accountPubkey), opts);
        break;

      case 'getBalance':
        const [balancePubkey] = params || [];
        if (!balancePubkey) throw new Error('Account address required');
        result = await connection.getBalance(new PublicKey(balancePubkey));
        break;

      case 'getBlockHeight':
        result = await connection.getBlockHeight();
        break;

      case 'getTransaction':
        const [signature, txOpts] = params || [];
        if (!signature) throw new Error('Transaction signature required');
        result = await connection.getTransaction(signature, txOpts);
        break;

      case 'getTokenAccountBalance':
        const [tokenAccount] = params || [];
        if (!tokenAccount) throw new Error('Token account required');
        result = await connection.getTokenAccountBalance(new PublicKey(tokenAccount));
        break;

      case 'getRecentBlockhash':
      case 'getLatestBlockhash':
        result = await connection.getLatestBlockhash();
        break;

      case 'sendTransaction':
        const [txData, sendOpts] = params || [];
        if (!txData) throw new Error('Transaction data required');
        // Note: Be careful with sendTransaction - validate thoroughly
        result = await connection.sendRawTransaction(Buffer.from(txData, 'base64'), sendOpts);
        break;

      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    const responseTime = Date.now() - startTime;

    // Record query in database
    await db.query(
      `INSERT INTO query_logs (endpoint, method, response_time, status)
       VALUES ($1, $2, $3, $4)`,
      ['/rpc', method, responseTime, 'success']
    );

    // Update provider stats (if applicable)
    // TODO: Implement provider selection and earnings distribution

    res.json({
      jsonrpc: '2.0',
      id,
      result,
    });
  } catch (err: any) {
    const responseTime = Date.now() - startTime;

    // Log error
    await db.query(
      `INSERT INTO query_logs (endpoint, method, response_time, status, error)
       VALUES ($1, $2, $3, $4, $5)`,
      ['/rpc', method, responseTime, 'error', err.message]
    );

    res.status(500).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: err.message || 'Internal error',
      },
    });
  }
});

export default router;
```

## Add to Main API Server

In `/root/whitelspace/whistlenet/provider/api/src/server.ts`:

```typescript
import rpcRouter from './routes/rpc';

// ... other imports and setup ...

app.use('/rpc', rpcRouter);
```

## Update Database Schema

Add query error column if not exists:

```sql
ALTER TABLE query_logs ADD COLUMN IF NOT EXISTS error TEXT;
```

## Restart API Service

```bash
sudo systemctl restart whistle-api
```

## Test Endpoint

```bash
curl -X POST http://152.53.130.177:8080/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getBlockHeight",
    "params": []
  }'
```

Expected response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": 123456789
}
```

## Frontend Integration

The frontend dashboard already calls this endpoint via:

```typescript
import { api } from '@/lib/api';

const result = await api.rpcQuery('getAccountInfo', [address]);
```

## Next Steps

1. Add provider selection logic (round-robin, latency-based, etc.)
2. Implement query cost calculation and credit deduction
3. Distribute earnings to providers based on queries served
4. Add rate limiting per user/wallet
5. Add WebSocket support for subscriptions

