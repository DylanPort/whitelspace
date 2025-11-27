# WHISTLE Provider API Server

**Production-ready REST API for serving Solana blockchain data**

---

## 🚀 Quick Start

```bash
cd api
npm install
npm run dev
```

API will be available at `http://localhost:8080`

---

## 📡 API Endpoints

### Health Check
```bash
GET /api/health

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected",
  "uptime": 12345,
  "stats": {...}
}
```

### Get Transactions
```bash
GET /api/transactions?wallet=ABC...&from=1700000000&to=1700100000&limit=100&offset=0

Parameters:
- wallet (required): Wallet address
- from (optional): Start timestamp
- to (optional): End timestamp
- limit (optional): Max results (default: 100, max: 1000)
- offset (optional): Pagination offset
- program (optional): Filter by program ID
- status (optional): Filter by status (success/failed)

Response:
{
  "data": [
    {
      "signature": "...",
      "slot": 100000,
      "block_time": 1700000000,
      "from_address": "...",
      "to_address": "...",
      "amount": 1000000,
      "fee": 5000,
      "program_id": "...",
      "status": "success",
      "logs": [...]
    }
  ],
  "count": 100,
  "cached": false,
  "responseTime": 45
}
```

### Get Token Balances
```bash
GET /api/balances?wallet=ABC...

Response:
{
  "data": [
    {
      "mint": "...",
      "amount": 1000000000,
      "decimals": 6,
      "ui_amount": 1000.0,
      "last_updated": 1700000000
    }
  ],
  "count": 5,
  "cached": false,
  "responseTime": 23
}
```

### Get NFTs
```bash
GET /api/nfts?wallet=ABC...&verified=true&collection=XYZ...

Parameters:
- wallet (required): Wallet address
- verified (optional): Only verified NFTs
- collection (optional): Filter by collection

Response:
{
  "data": [
    {
      "mint": "...",
      "name": "Cool NFT #1",
      "symbol": "COOL",
      "uri": "https://...",
      "image": "https://...",
      "description": "...",
      "attributes": [...],
      "collection": "...",
      "verified": true
    }
  ],
  "count": 3,
  "cached": false,
  "responseTime": 67
}
```

### Get Single Transaction
```bash
GET /api/transaction/:signature

Response:
{
  "data": {
    "signature": "...",
    "slot": 100000,
    ...
  },
  "cached": false,
  "responseTime": 12
}
```

### Get Provider Stats
```bash
GET /api/stats

Response:
{
  "provider": {
    "queries_served": 12458,
    "uptime_percentage": 99.8,
    "avg_response_time_ms": 45,
    "last_heartbeat": "2024-01-15T10:30:00Z"
  },
  "blockchain": {
    "transactions_indexed": 1245678,
    "blocks_processed": 50000,
    "latest_block": 150000000
  },
  "cache": {
    "keys": 150,
    "hits": 5000,
    "misses": 500
  }
}
```

### Metrics (Prometheus Format)
```bash
GET /metrics

Response: (Prometheus format)
whistle_queries_total 12458
whistle_uptime_percentage 99.8
whistle_response_time_ms 45
whistle_cache_size 150
```

---

## ⚙️ Configuration

Create `../config/config.env`:

```bash
# Database
DATABASE_URL=postgresql://whistle:password@localhost:5432/whistle_indexer

# API Server
API_PORT=8080
API_HOST=0.0.0.0

# Performance
CACHE_TTL=60
MAX_QUERY_LIMIT=1000
RATE_LIMIT=60

# CORS
CORS_ENABLED=true
CORS_ORIGINS=*
```

---

## 🔧 Development

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build Production
```bash
npm run build
npm start
```

### Run Tests
```bash
npm test
```

---

## 📊 Features

✅ **Fast Queries** - PostgreSQL with optimized indexes  
✅ **Caching** - In-memory cache for common queries  
✅ **Rate Limiting** - 60 requests/minute per IP  
✅ **Compression** - Gzip response compression  
✅ **Security** - Helmet.js security headers  
✅ **Logging** - Request logging and analytics  
✅ **Metrics** - Prometheus-compatible metrics  
✅ **CORS** - Cross-origin support  
✅ **Error Handling** - Comprehensive error responses  

---

## 🚀 Performance

- **Average response time:** <50ms
- **Cache hit rate:** ~80%
- **Concurrent requests:** 1000+
- **Database pool:** 5-20 connections
- **Memory usage:** ~256MB (with cache)

---

## 📈 Monitoring

### Health Checks
```bash
curl http://localhost:8080/api/health
```

### Metrics
```bash
curl http://localhost:8080/metrics
```

### Logs
All queries are logged to `query_logs` table for analytics.

---

## 🔐 Security

- Rate limiting enabled
- CORS configured
- Helmet security headers
- Input validation
- SQL injection prevention (parameterized queries)

---

## 📄 License

MIT License

---

**Built with ⚡ by WHISTLE Network**





