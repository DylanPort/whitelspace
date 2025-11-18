# WHISTLE RPC Test Script
# Tests your local validator and backend API RPC endpoints

Write-Host "🔍 Testing WHISTLE RPC Endpoints..." -ForegroundColor Cyan
Write-Host ""

# ============= TEST 1: Local Validator (Direct) =============
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "TEST 1: Local Validator RPC (Port 8899)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

$localRpcUrl = "http://localhost:8899"

# Test 1.1: getVersion
Write-Host "`n📡 Test 1.1: getVersion" -ForegroundColor Green
$getVersionBody = @{
    jsonrpc = "2.0"
    id = 1
    method = "getVersion"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $localRpcUrl -Method Post -Body $getVersionBody -ContentType "application/json" -TimeoutSec 5
    Write-Host "✅ SUCCESS: " -ForegroundColor Green -NoNewline
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}

# Test 1.2: getHealth
Write-Host "`n📡 Test 1.2: getHealth" -ForegroundColor Green
$getHealthBody = @{
    jsonrpc = "2.0"
    id = 1
    method = "getHealth"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $localRpcUrl -Method Post -Body $getHealthBody -ContentType "application/json" -TimeoutSec 5
    Write-Host "✅ SUCCESS: " -ForegroundColor Green -NoNewline
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}

# Test 1.3: getSlot
Write-Host "`n📡 Test 1.3: getSlot (Current Slot)" -ForegroundColor Green
$getSlotBody = @{
    jsonrpc = "2.0"
    id = 1
    method = "getSlot"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $localRpcUrl -Method Post -Body $getSlotBody -ContentType "application/json" -TimeoutSec 5
    Write-Host "✅ SUCCESS: Current Slot = " -ForegroundColor Green -NoNewline
    Write-Host $response.result -ForegroundColor Cyan
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}

# Test 1.4: getBlockHeight
Write-Host "`n📡 Test 1.4: getBlockHeight" -ForegroundColor Green
$getBlockHeightBody = @{
    jsonrpc = "2.0"
    id = 1
    method = "getBlockHeight"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $localRpcUrl -Method Post -Body $getBlockHeightBody -ContentType "application/json" -TimeoutSec 5
    Write-Host "✅ SUCCESS: Block Height = " -ForegroundColor Green -NoNewline
    Write-Host $response.result -ForegroundColor Cyan
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}

# Test 1.5: getBalance (Random address)
Write-Host "`n📡 Test 1.5: getBalance" -ForegroundColor Green
$testWallet = "So11111111111111111111111111111111111111112" # Wrapped SOL address
$getBalanceBody = @{
    jsonrpc = "2.0"
    id = 1
    method = "getBalance"
    params = @($testWallet)
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $localRpcUrl -Method Post -Body $getBalanceBody -ContentType "application/json" -TimeoutSec 5
    Write-Host "✅ SUCCESS: " -ForegroundColor Green -NoNewline
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}

# ============= TEST 2: Backend API RPC Proxy =============
Write-Host "`n`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "TEST 2: Backend API RPC Proxy" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

$backendRpcUrl = "http://152.53.130.177:8080/rpc"

# Test 2.1: getVersion (via proxy)
Write-Host "`n📡 Test 2.1: getVersion (via proxy)" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri $backendRpcUrl -Method Post -Body $getVersionBody -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ SUCCESS: " -ForegroundColor Green -NoNewline
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}

# Test 2.2: getHealth (via proxy)
Write-Host "`n📡 Test 2.2: getHealth (via proxy)" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri $backendRpcUrl -Method Post -Body $getHealthBody -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ SUCCESS: " -ForegroundColor Green -NoNewline
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}

# ============= TEST 3: WHISTLE Token Query =============
Write-Host "`n`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "TEST 3: WHISTLE Token Query" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

$whistleMint = "6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump"
$getAccountInfoBody = @{
    jsonrpc = "2.0"
    id = 1
    method = "getAccountInfo"
    params = @(
        $whistleMint,
        @{
            encoding = "jsonParsed"
        }
    )
} | ConvertTo-Json -Depth 3

Write-Host "`n📡 Test 3.1: Get WHISTLE Token Account Info" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri $localRpcUrl -Method Post -Body $getAccountInfoBody -ContentType "application/json" -TimeoutSec 5
    Write-Host "✅ SUCCESS: " -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}

# ============= TEST 4: Provider Stats API =============
Write-Host "`n`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "TEST 4: Backend API Endpoints" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

# Test 4.1: Health Check
Write-Host "`n📡 Test 4.1: API Health Check" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://152.53.130.177:8080/api/health" -Method Get -TimeoutSec 5
    Write-Host "✅ SUCCESS: " -ForegroundColor Green -NoNewline
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}

# Test 4.2: Provider Stats
Write-Host "`n📡 Test 4.2: Provider Stats" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://152.53.130.177:8080/providers/stats" -Method Get -TimeoutSec 5
    Write-Host "✅ SUCCESS: " -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "❌ FAILED: $_" -ForegroundColor Red
}

# ============= SUMMARY =============
Write-Host "`n`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✨ TEST COMPLETE!" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "`nYour RPC Endpoints:" -ForegroundColor White
Write-Host "  • Local Validator:  $localRpcUrl" -ForegroundColor Yellow
Write-Host "  • Backend API:      $backendRpcUrl" -ForegroundColor Yellow
Write-Host "  • API Base:         http://152.53.130.177:8080" -ForegroundColor Yellow
Write-Host ""


