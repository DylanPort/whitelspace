# Test Professional-Grade API
param(
    [string]$address = "64pR7tmBvKvnPnWBht4Nni1vHuqWmx42XkzJDE1KnyYK"
)

Write-Host "`n🏆🏆🏆 TESTING PROFESSIONAL-GRADE API 🏆🏆🏆`n" -ForegroundColor Cyan

# Health check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing | ConvertFrom-Json
    Write-Host "✅ Status: $($health.mode)" -ForegroundColor Green
    Write-Host "✅ Data Quality: $($health.dataQuality)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit
}

# Enhanced transactions
Write-Host "Test 2: Professional Transaction Data for $address" -ForegroundColor Yellow
try {
    $url = "http://localhost:8080/api/v1/transactions?wallet=$address&limit=3"
    $txs = Invoke-WebRequest -Uri $url -UseBasicParsing | ConvertFrom-Json
    
    Write-Host "✅ Found $($txs.count) transactions" -ForegroundColor Green
    Write-Host "✅ Data Quality: $($txs.metadata.dataQuality)" -ForegroundColor Green
    Write-Host ""
    
    if ($txs.count -gt 0) {
        Write-Host "📊 Transaction Details (First Transaction):`n" -ForegroundColor Cyan
        $tx = $txs.transactions[0]
        
        Write-Host "Signature: $($tx.signature.Substring(0, 40))..." -ForegroundColor White
        Write-Host "Status: $($tx.status)" -ForegroundColor $(if ($tx.status -eq 'success') { 'Green' } else { 'Red' })
        Write-Host "Fee: $($tx.fee) lamports" -ForegroundColor White
        Write-Host "Time: $($tx.timestamp)" -ForegroundColor White
        Write-Host ""
        
        Write-Host "💰 Token Transfers: $($tx.tokenTransfers.Count)" -ForegroundColor Cyan
        foreach ($transfer in $tx.tokenTransfers) {
            Write-Host "  • Mint: $($transfer.mint)" -ForegroundColor White
            Write-Host "    Amount: $($transfer.amount)" -ForegroundColor White
            Write-Host "    Type: $($transfer.tokenStandard)" -ForegroundColor White
            Write-Host ""
        }
        
        Write-Host "🔄 Native SOL Transfers: $($tx.nativeTransfers.Count)" -ForegroundColor Cyan
        foreach ($transfer in $tx.nativeTransfers) {
            Write-Host "  • Amount: $($transfer.amountSol) SOL" -ForegroundColor White
            Write-Host ""
        }
        
        Write-Host "📝 Instructions: $($tx.instructions.Count)" -ForegroundColor Cyan
        foreach ($ix in $tx.instructions) {
            Write-Host "  • $($ix.programName) - $($ix.type)" -ForegroundColor White
        }
        Write-Host ""
        
        Write-Host "💼 Account Changes: $($tx.accountData.Count)" -ForegroundColor Cyan
        foreach ($acc in $tx.accountData) {
            if ($acc.nativeBalanceChange -ne 0) {
                Write-Host "  • $($acc.account.Substring(0, 20))..." -ForegroundColor White
                Write-Host "    SOL Change: $($acc.nativeBalanceChangeSol)" -ForegroundColor White
            }
        }
        Write-Host ""
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Enhanced balance
Write-Host "Test 3: Professional Balance Data" -ForegroundColor Yellow
try {
    $balance = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/balance/$address" -UseBasicParsing | ConvertFrom-Json
    
    Write-Host "✅ Balance retrieved" -ForegroundColor Green
    Write-Host ""
    Write-Host "SOL Balance:" -ForegroundColor Cyan
    Write-Host "  Lamports: $($balance.balance.sol.lamports)" -ForegroundColor White
    Write-Host "  SOL: $($balance.balance.sol.sol)" -ForegroundColor White
    Write-Host "  USD: `$$($balance.balance.sol.usd)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "🪙 Fungible Tokens: $($balance.balance.tokens.count)" -ForegroundColor Cyan
    Write-Host "🖼️  NFTs: $($balance.balance.nfts.count)" -ForegroundColor Cyan
    Write-Host ""
    
    if ($balance.balance.tokens.count -gt 0) {
        Write-Host "Top 3 Tokens:" -ForegroundColor Yellow
        $topTokens = $balance.balance.tokens.items | Select-Object -First 3
        foreach ($token in $topTokens) {
            Write-Host "  • $($token.mint.Substring(0, 30))..." -ForegroundColor White
            Write-Host "    Balance: $($token.balance)" -ForegroundColor White
            Write-Host "    Type: $($token.tokenStandard)" -ForegroundColor White
            Write-Host ""
        }
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n🏆 PROFESSIONAL-GRADE API TEST COMPLETE! 🏆`n" -ForegroundColor Green
Write-Host "This is Helius-level data organization!" -ForegroundColor Cyan
Write-Host ""

