# Test Whistlenet Mainnet Connection
Write-Host "🧪 Testing Whistlenet Mainnet Connection..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if program exists
Write-Host "Test 1: Verifying Smart Contract Deployment" -ForegroundColor Yellow
$programCheck = solana program show WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt --url mainnet-beta 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Smart contract deployed and accessible" -ForegroundColor Green
    Write-Host "   Program ID: WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt" -ForegroundColor Gray
}
else {
    Write-Host "❌ Failed to access smart contract" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Check staking pool account
Write-Host "Test 2: Verifying Staking Pool" -ForegroundColor Yellow
$poolCheck = solana account F7BtDzqpATy6dQ8gaxoLJzHWVVEuaopJBhUkGNuFzdmh --url mainnet-beta 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Staking Pool initialized" -ForegroundColor Green
    Write-Host "   Address: F7BtDzqpATy6dQ8gaxoLJzHWVVEuaopJBhUkGNuFzdmh" -ForegroundColor Gray
}
else {
    Write-Host "⚠️  Staking Pool account not found" -ForegroundColor Yellow
}

Write-Host ""

# Test 3: Check token vault
Write-Host "Test 3: Verifying Token Vault" -ForegroundColor Yellow
$vaultCheck = solana account F4BPRL7wJS67bKVT8d8UvGFdVouEZ1ae1EoDrKeL3hkZ --url mainnet-beta 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Token Vault initialized" -ForegroundColor Green
    Write-Host "   Address: F4BPRL7wJS67bKVT8d8UvGFdVouEZ1ae1EoDrKeL3hkZ" -ForegroundColor Gray
}
else {
    Write-Host "⚠️  Token Vault account not found" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Check payment vault
Write-Host "Test 4: Verifying Payment Vault" -ForegroundColor Yellow
$paymentCheck = solana account Ey5yKxziYHTUzAGKuBhFJdCokzqUqPKcfVo2TMSyvSeP --url mainnet-beta 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Payment Vault initialized" -ForegroundColor Green
    Write-Host "   Address: Ey5yKxziYHTUzAGKuBhFJdCokzqUqPKcfVo2TMSyvSeP" -ForegroundColor Gray
    
    # Get balance
    $balance = solana balance Ey5yKxziYHTUzAGKuBhFJdCokzqUqPKcfVo2TMSyvSeP --url mainnet-beta
    Write-Host "   Balance: $balance" -ForegroundColor Gray
}
else {
    Write-Host "⚠️  Payment Vault account not found" -ForegroundColor Yellow
}

Write-Host ""

# Test 5: Check WHISTLE token
Write-Host "Test 5: Verifying WHISTLE Token" -ForegroundColor Yellow
$tokenCheck = solana account 6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump --url mainnet-beta 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ WHISTLE Token mint exists" -ForegroundColor Green
    Write-Host "   Mint: 6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump" -ForegroundColor Gray
}
else {
    Write-Host "❌ WHISTLE Token not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "Connection Test Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "View on Explorers:" -ForegroundColor Yellow
Write-Host "Solscan: https://solscan.io/account/WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt" -ForegroundColor Cyan
Write-Host "Explorer: https://explorer.solana.com/address/WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt" -ForegroundColor Cyan
Write-Host ""

