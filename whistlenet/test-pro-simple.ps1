# Test Professional API - Simple Version
$address = "64pR7tmBvKvnPnWBht4Nni1vHuqWmx42XkzJDE1KnyYK"

Write-Host "`n=== PROFESSIONAL-GRADE API TEST ===`n" -ForegroundColor Cyan

# Test 1: Health
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
$health = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing | ConvertFrom-Json
Write-Host "Mode: $($health.mode)" -ForegroundColor Green
Write-Host "Quality: $($health.dataQuality)`n" -ForegroundColor Green

# Test 2: Enhanced Transactions
Write-Host "Test 2: Enhanced Transaction Data" -ForegroundColor Yellow
$url = "http://localhost:8080/api/v1/transactions?wallet=$address&limit=2"
$txs = Invoke-WebRequest -Uri $url -UseBasicParsing | ConvertFrom-Json

Write-Host "Found: $($txs.count) transactions" -ForegroundColor Green
Write-Host "Quality: $($txs.metadata.dataQuality)`n" -ForegroundColor Green

if ($txs.count -gt 0) {
    $tx = $txs.transactions[0]
    Write-Host "First Transaction:" -ForegroundColor Cyan
    Write-Host "  Signature: $($tx.signature)" -ForegroundColor White
    Write-Host "  Status: $($tx.status)" -ForegroundColor White
    Write-Host "  Fee: $($tx.fee) lamports" -ForegroundColor White
    Write-Host "  Token Transfers: $($tx.tokenTransfers.Count)" -ForegroundColor White
    Write-Host "  SOL Transfers: $($tx.nativeTransfers.Count)" -ForegroundColor White
    Write-Host "  Instructions: $($tx.instructions.Count)" -ForegroundColor White
    Write-Host "  Account Changes: $($tx.accountData.Count)`n" -ForegroundColor White
}

# Test 3: Enhanced Balance
Write-Host "Test 3: Enhanced Balance Data" -ForegroundColor Yellow
$balance = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/balance/$address" -UseBasicParsing | ConvertFrom-Json

Write-Host "SOL: $($balance.balance.sol.sol)" -ForegroundColor Green
Write-Host "USD: $($balance.balance.sol.usd)" -ForegroundColor Green
Write-Host "Fungible Tokens: $($balance.balance.tokens.count)" -ForegroundColor Green
Write-Host "NFTs: $($balance.balance.nfts.count)`n" -ForegroundColor Green

Write-Host "=== PROFESSIONAL-GRADE DATA ===`n" -ForegroundColor Green
Write-Host "This is Helius-level organization!`n" -ForegroundColor Cyan



