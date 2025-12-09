# Cache Node Reporting Fixes

## Changes Made

### 1. Updated Default Coordinator URL
- **Before**: `http://localhost:3002` (wrong default)
- **After**: `https://whitelspace-1.onrender.com` (production coordinator)

### 2. Improved Error Handling
- Added validation for `COORDINATOR_URL` and `PROVIDER_WALLET`
- Better error messages when reporting fails
- Added timeout handling (10 seconds) using AbortController
- Logs success/failure clearly

### 3. Updated Configuration Files
- `env.example` - Updated coordinator URL
- `start.sh` - Updated coordinator URL  
- `docker-compose.yml` - Updated coordinator URL
- `CACHE-NODE-README.md` - Updated documentation

### 4. Immediate Reporting
- Nodes now report immediately on startup (after 5 seconds)
- Continues reporting every 30 seconds

## What Nodes Need

1. **Set COORDINATOR_URL**:
   ```bash
   export COORDINATOR_URL=https://whitelspace-1.onrender.com
   ```

2. **Set PROVIDER_WALLET**:
   ```bash
   export PROVIDER_WALLET=YourSolanaWalletAddress
   ```

3. **Restart the node** to pick up changes

## Testing

To verify nodes are reporting:

```bash
# Check coordinator for server nodes
curl https://whitelspace-1.onrender.com/api/nodes | jq '.nodes[] | select(.node_type=="server")'
```

## Expected Behavior

- Nodes should report every 30 seconds
- Uptime samples should increment (`uptime_samples`, `online_samples`)
- Nodes should appear as "Online" if seen in last 5 minutes
- Metrics should be stored in `metrics_reports` table

