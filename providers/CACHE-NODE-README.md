# WHISTLE Cache Node

A distributed caching layer for Solana RPC requests. Run a cache node to earn WHISTLE rewards by serving cached responses and reducing load on validators.

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your dApp     │────▶│  Cache Node     │────▶│  Upstream RPC   │
│                 │     │  (Your Server)  │     │  (whistle.ninja)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               │ Reports metrics
                               ▼
                        ┌─────────────────┐
                        │  Coordinator    │
                        │  (Calculates    │
                        │   Rewards)      │
                        └─────────────────┘
```

1. **Intercept**: Your cache node receives Solana RPC requests
2. **Cache Check**: If data is cached and fresh, serve immediately
3. **Fallback**: On cache miss, fetch from upstream RPC and cache the result
4. **Report**: Every 30 seconds, report metrics to the coordinator
5. **Earn**: Coordinator calculates rewards based on cache hits and bandwidth saved

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone or download the cache-node folder
cd providers/cache-node

# Start with your wallet address
PROVIDER_WALLET=YourSolanaWalletAddress docker-compose up -d

# View logs
docker logs -f whistle-cache

# Check metrics
curl http://localhost:8545/metrics
```

### Option 2: Node.js

```bash
cd providers/cache-node

# Install dependencies
npm install

# Create .env file
cp env.example .env
# Edit .env and add your wallet address

# Start
npm start
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8545 | Port to listen on |
| `UPSTREAM_RPC` | https://rpc.whistle.ninja/rpc | Upstream Solana RPC |
| `COORDINATOR_URL` | https://coordinator.whistle.ninja | Coordinator for rewards |
| `PROVIDER_WALLET` | (required) | Your Solana wallet for rewards |
| `NODE_ID` | (auto) | Unique node identifier |

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /` | RPC proxy (send Solana RPC requests here) |
| `GET /health` | Health check |
| `GET /metrics` | Cache metrics JSON |
| `GET /metrics/prometheus` | Prometheus format metrics |

## Cache Strategy

Different RPC methods have different cache TTLs:

| Method | TTL | Reason |
|--------|-----|--------|
| `getSlot`, `getBlockHeight` | 400ms | Changes every slot |
| `getEpochInfo` | 5s | Changes slowly |
| `getAccountInfo`, `getBalance` | 2s | Account data |
| `getTransaction` | 5 min | Immutable once confirmed |
| `getBlock` | 1 hour | Immutable |
| `getGenesisHash` | 24 hours | Never changes |

**Never cached**: `sendTransaction`, `simulateTransaction`

## Rewards

Rewards are calculated hourly based on:

1. **Cache Hits**: Each cache hit earns work points
2. **Bandwidth Saved**: Bytes served from cache earn additional points
3. **Uptime**: Consistent online presence is valued

Formula:
```
work_score = cache_hits + (bytes_saved * 0.000001)
your_reward = (your_work_score / total_network_work) * hourly_reward_pool
```

## Monitoring

### Check Your Stats

```bash
# Local metrics
curl http://localhost:8545/metrics

# Your rewards (once coordinator is live)
curl https://coordinator.whistle.ninja/api/rewards/YOUR_WALLET
```

### Grafana Dashboard

Import the Prometheus metrics endpoint into Grafana:
```
http://your-cache-node:8545/metrics/prometheus
```

## Production Deployment

### Recommended Setup

1. **VPS/Cloud Instance**
   - 1 CPU, 1GB RAM minimum
   - Low latency to your users
   - Stable network connection

2. **Reverse Proxy (Optional)**
   ```nginx
   server {
       listen 443 ssl;
       server_name cache.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:8545;
           proxy_set_header Host $host;
       }
   }
   ```

3. **Monitoring**
   - Set up alerts for node going offline
   - Monitor hit rate (should be >50% for good rewards)

### Multiple Nodes

You can run multiple cache nodes with the same wallet:
```bash
# Node 1
NODE_ID=node-us-east PROVIDER_WALLET=xxx docker-compose up -d

# Node 2 (different server)
NODE_ID=node-eu-west PROVIDER_WALLET=xxx docker-compose up -d
```

Each node reports separately, and rewards are aggregated to your wallet.

## Troubleshooting

### Low Hit Rate

- Increase cache TTLs if your use case allows
- Check if traffic patterns are cacheable
- Some methods (like `sendTransaction`) are never cached

### Node Not Appearing in Dashboard

- Check `COORDINATOR_URL` is correct
- Verify network connectivity to coordinator
- Check logs for errors: `docker logs whistle-cache`

### High Latency

- Check upstream RPC health
- Consider running closer to your users
- Monitor system resources (CPU, memory)

## Support

- GitHub Issues: [whistlenet/issues](https://github.com/whistlenet)
- Discord: [Join our server](https://discord.gg/whistlenet)

