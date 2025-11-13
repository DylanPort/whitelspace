# WHISTLE Network - Complete Testing Guide

**Test everything step-by-step and document results**

---

## 🎯 Testing Plan

We'll test in this order:
1. Database setup
2. API server (standalone)
3. Blockchain indexer (devnet)
4. Full data flow
5. SDK integration
6. Performance measurements

---

## ✅ STEP 1: Database Setup

### Install PostgreSQL (if not installed)

```powershell
# Using Chocolatey (Windows)
choco install postgresql

# Or using Docker
docker run -d --name whistle-postgres `
  -p 5432:5432 `
  -e POSTGRES_USER=whistle `
  -e POSTGRES_PASSWORD=password `
  -e POSTGRES_DB=whistle_indexer `
  -v whistle-data:/var/lib/postgresql/data `
  postgres:15
```

### Verify PostgreSQL is running

```powershell
# Check if running
docker ps | Select-String whistle-postgres

# Or if installed directly
Get-Service postgresql*
```

### Load Schema

```powershell
cd C:\Users\salva\Downloads\Encrypto\whistlenet\provider\config

# Load schema
$env:PGPASSWORD="password"
psql -U whistle -h localhost -d whistle_indexer -f schema.sql
```

### Verify Tables Created

```powershell
psql -U whistle -h localhost -d whistle_indexer -c "\dt"
```

**Expected output:**
```
             List of relations
 Schema |      Name       | Type  | Owner   
--------+-----------------+-------+---------
 public | blocks          | table | whistle
 public | nft_metadata    | table | whistle
 public | program_accounts| table | whistle
 public | provider_stats  | table | whistle
 public | query_logs      | table | whistle
 public | token_accounts  | table | whistle
 public | token_mints     | table | whistle
 public | transactions    | table | whistle
```

---

## ✅ STEP 2: Test API Server (Standalone)

### Create Configuration

```powershell
cd C:\Users\salva\Downloads\Encrypto\whistlenet\provider\config

# Copy example config
Copy-Item config.example.env config.env

# Edit config.env with your settings
notepad config.env
```

**Minimum config for testing:**
```env
DATABASE_URL=postgresql://whistle:password@localhost:5432/whistle_indexer
API_PORT=8080
API_HOST=0.0.0.0
CORS_ENABLED=true
RATE_LIMIT=60
MAX_QUERY_LIMIT=1000
LOG_LEVEL=info
```

### Install Dependencies & Start API

```powershell
cd ..\api

# Install
npm install

# Build
npm run build

# Start
npm start
```

### Test API Endpoints

**Open new PowerShell window:**

```powershell
# Test 1: Health check
curl http://localhost:8080/api/health

# Expected: {"status":"healthy",...}

# Test 2: Stats
curl http://localhost:8080/api/stats

# Expected: {"provider":{...},"blockchain":{...}}

# Test 3: Metrics
curl http://localhost:8080/metrics

# Expected: Prometheus metrics format

# Test 4: Query transactions (will be empty initially)
curl "http://localhost:8080/api/transactions?wallet=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU&limit=10"

# Expected: {"data":[],"count":0,...}
```

**✅ API Test Results:**
- [ ] Health endpoint works
- [ ] Stats endpoint works
- [ ] Metrics endpoint works
- [ ] Query endpoints respond (empty is OK)

---

## ✅ STEP 3: Test Blockchain Indexer

### Use Devnet for Testing (faster, free)

Update `config/config.env`:
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
INDEXER_START_SLOT=latest
INDEXER_BATCH_SIZE=50
INDEXER_BATCH_DELAY=100
INDEXED_PROGRAMS=*
```

### Build & Run Indexer

```powershell
cd C:\Users\salva\Downloads\Encrypto\whistlenet\provider\indexer

# Build (first time)
cargo build --release

# Run
cargo run --release
```

### Expected Output

```
🚀 WHISTLE Blockchain Indexer starting...
✅ Configuration loaded
   Network: devnet
   RPC: https://api.devnet.solana.com
   Start slot: latest
✅ Database connected
✅ Database migrations complete
✅ Indexer initialized
🔄 Starting blockchain indexing...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Starting from slot: 350000000

📊 Progress: Slot 350000100 | Blocks: 100 | Txs: 1240 | Speed: 62.0 tx/s | Behind: 5 slots
📊 Progress: Slot 350000200 | Blocks: 200 | Txs: 2485 | Speed: 62.1 tx/s | Behind: 2 slots
```

### Verify Data in Database

**Open new PowerShell window:**

```powershell
psql -U whistle -h localhost -d whistle_indexer

-- Check transactions indexed
SELECT COUNT(*) FROM transactions;

-- Check latest slot
SELECT MAX(slot) FROM blocks WHERE processed = true;

-- Sample transactions
SELECT signature, slot, from_address, to_address, amount, status 
FROM transactions 
ORDER BY slot DESC 
LIMIT 5;

-- Exit
\q
```

**✅ Indexer Test Results:**
- [ ] Indexer connects to Solana devnet
- [ ] Processes blocks successfully
- [ ] Inserts transactions to database
- [ ] Shows progress stats
- [ ] No critical errors

---

## ✅ STEP 4: Test Full Data Flow

### With Both Running (Indexer + API)

**Keep indexer running, API should also be running.**

### Wait 2-3 Minutes for Data

Let indexer process 200-300 blocks.

### Query API for Real Data

```powershell
# Get total transactions indexed
curl http://localhost:8080/api/stats

# Query recent transactions (use actual wallet from devnet)
curl "http://localhost:8080/api/transactions?wallet=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU&limit=5"

# Should return actual data now!
```

### Test Different Queries

```powershell
# Filter by status
curl "http://localhost:8080/api/transactions?wallet=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU&status=success&limit=10"

# With time range (use timestamps)
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))
curl "http://localhost:8080/api/transactions?wallet=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU&from=$($timestamp-3600)&limit=10"

# Get transaction by signature (use actual signature from results)
curl http://localhost:8080/api/transaction/SIGNATURE_HERE
```

**✅ Full Stack Test Results:**
- [ ] Indexer → Database flow works
- [ ] API serves indexed data
- [ ] Queries return correct data
- [ ] Response times reasonable (<500ms)
- [ ] No data corruption

---

## ✅ STEP 5: Test SDK Integration

### Create Test Script

```powershell
cd C:\Users\salva\Downloads\Encrypto\whistlenet\sdk

# Install dependencies if not done
npm install

# Build SDK
npm run build
```

### Create Test File

Create `test-live.ts`:

```typescript
import { WhistleClient } from './src/client';

async function testSDK() {
  console.log('🧪 Testing WHISTLE SDK with live provider...\n');

  // Connect to local provider
  const client = new WhistleClient({
    network: 'devnet',
  });

  console.log('✅ SDK initialized\n');

  // Test query (use actual devnet wallet)
  const wallet = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
  
  console.log(`📊 Querying transactions for ${wallet}...\n`);

  try {
    // This will use Solana RPC directly for now
    // In production, would query through WHISTLE providers
    const conn = client.getConnection();
    const signatures = await conn.getSignaturesForAddress(
      new (await import('@solana/web3.js')).PublicKey(wallet),
      { limit: 5 }
    );

    console.log(`Found ${signatures.length} transactions:\n`);
    signatures.forEach((sig, i) => {
      console.log(`${i + 1}. ${sig.signature}`);
      console.log(`   Slot: ${sig.slot}`);
      console.log(`   Status: ${sig.err ? 'failed' : 'success'}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSDK();
```

### Run Test

```powershell
npx ts-node test-live.ts
```

**✅ SDK Test Results:**
- [ ] SDK initializes
- [ ] Can connect to network
- [ ] Queries work
- [ ] Data returned correctly

---

## ✅ STEP 6: Performance Testing

### Measure API Response Times

```powershell
# Create performance test script
$results = @()

for ($i=0; $i -lt 10; $i++) {
  $start = Get-Date
  curl -s http://localhost:8080/api/health | Out-Null
  $end = Get-Date
  $duration = ($end - $start).TotalMilliseconds
  $results += $duration
  Write-Host "Request $($i+1): $duration ms"
}

$avg = ($results | Measure-Object -Average).Average
Write-Host "`nAverage response time: $avg ms"
```

### Measure Database Query Speed

```powershell
psql -U whistle -h localhost -d whistle_indexer

-- Enable timing
\timing on

-- Test query 1: Count
SELECT COUNT(*) FROM transactions;

-- Test query 2: Index scan
SELECT * FROM transactions WHERE from_address = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' LIMIT 10;

-- Test query 3: Time range
SELECT * FROM transactions WHERE block_time > EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour')::BIGINT LIMIT 100;

\q
```

### Measure Indexing Speed

Check indexer output for stats:
```
📊 Progress: ... | Speed: XX.X tx/s
```

**✅ Performance Results:**
- [ ] API response time: ____ ms (target: <100ms)
- [ ] DB query time: ____ ms (target: <50ms)
- [ ] Indexing speed: ____ tx/s (target: >50 tx/s)
- [ ] Cache hit rate: ____ % (target: >50%)

---

## 📊 RESULTS TEMPLATE

### System Configuration
- **OS:** Windows 10/11
- **CPU:** ____________
- **RAM:** ____________
- **Storage:** ____________
- **Network:** ____________

### Test Results

#### Database
- ✅/❌ Setup successful
- ✅/❌ Schema loaded
- ✅/❌ Tables created
- Query time: ____ ms

#### API Server
- ✅/❌ Starts successfully
- ✅/❌ Health endpoint works
- ✅/❌ All 7 endpoints respond
- Response time: ____ ms

#### Blockchain Indexer
- ✅/❌ Connects to Solana
- ✅/❌ Processes blocks
- ✅/❌ Inserts to database
- Indexing speed: ____ tx/s
- Blocks processed: ____
- Transactions indexed: ____

#### Full Stack
- ✅/❌ End-to-end flow works
- ✅/❌ Data flows correctly
- ✅/❌ Queries return data
- ✅/❌ Performance acceptable

#### SDK
- ✅/❌ Initializes
- ✅/❌ Connects
- ✅/❌ Queries work

### Issues Found
1. ________________
2. ________________
3. ________________

### Performance Metrics
- API avg response: ____ ms
- DB query avg: ____ ms
- Indexing speed: ____ tx/s
- Memory usage: ____ MB
- CPU usage: ____ %

### Overall Assessment
- **Works:** YES / NO / PARTIALLY
- **Production Ready:** YES / NO
- **Issues Count:** ____
- **Confidence Level:** ____/10

---

## 🐛 Troubleshooting

### Indexer Issues

**RPC Connection Errors:**
```powershell
# Use public devnet RPC
$env:SOLANA_RPC_URL="https://api.devnet.solana.com"
cargo run --release
```

**Database Connection Errors:**
```powershell
# Check PostgreSQL
docker ps
docker logs whistle-postgres

# Test connection
psql -U whistle -h localhost -d whistle_indexer -c "SELECT 1;"
```

### API Issues

**Port Already in Use:**
```powershell
# Find process using port 8080
netstat -ano | findstr :8080

# Kill process (replace PID)
taskkill /PID xxxx /F

# Or change port in config.env
API_PORT=8081
```

**CORS Errors:**
```env
# In config.env
CORS_ENABLED=true
CORS_ORIGINS=*
```

---

## 📝 Next Steps After Testing

### If Tests Pass ✅
1. Document results
2. Deploy to mainnet (carefully)
3. Run for 24 hours
4. Monitor stability
5. Fix any issues found

### If Tests Fail ❌
1. Document exact errors
2. Check logs carefully
3. Fix bugs
4. Re-test
5. Repeat until working

---

**Ready to start testing?** 🧪

Let's begin with Step 1: Database Setup!

