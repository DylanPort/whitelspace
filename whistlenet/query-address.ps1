# Query transactions for a specific address
param(
    [string]$address = "64pR7tmBvKvnPnWBht4Nni1vHuqWmx42XkzJDE1KnyYK",
    [int]$limit = 10
)

Write-Host "`n🔍 Querying MAINNET for address: $address`n" -ForegroundColor Cyan

# Transactions
Write-Host "📊 Fetching last $limit transactions...`n" -ForegroundColor Yellow
$txUrl = "http://localhost:8080/api/transactions?wallet=$address&limit=$limit"
try {
    $txs = Invoke-WebRequest -Uri $txUrl -UseBasicParsing | ConvertFrom-Json
    Write-Host "✅ Found $($txs.count) transactions`n" -ForegroundColor Green
    Write-Host ($txs | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error fetching transactions: $_" -ForegroundColor Red
}

Write-Host "`n`n💰 Fetching balance...`n" -ForegroundColor Yellow
$balUrl = "http://localhost:8080/api/balance/$address"
try {
    $balance = Invoke-WebRequest -Uri $balUrl -UseBasicParsing | ConvertFrom-Json
    Write-Host "✅ Balance retrieved`n" -ForegroundColor Green
    Write-Host "SOL: $($balance.balance_sol)" -ForegroundColor White
    Write-Host "USD: `$$($balance.balance_usd)" -ForegroundColor White
    Write-Host "Tokens: $($balance.token_count)" -ForegroundColor White
} catch {
    Write-Host "❌ Error fetching balance: $_" -ForegroundColor Red
}

Write-Host "`n✅ Query complete!`n" -ForegroundColor Green


