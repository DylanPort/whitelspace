# Show FULL transaction details like Helius
param(
    [string]$address = "64pR7tmBvKvnPnWBht4Nni1vHuqWmx42XkzJDE1KnyYK"
)

Write-Host "`n=== WHISTLE PROFESSIONAL API - FULL DETAILS ===`n" -ForegroundColor Cyan

# Build URL properly
$baseUrl = "http://localhost:8080/api/v1/transactions"
$params = @{
    wallet = $address
    limit = 1
}
$queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
$url = "$baseUrl?$queryString"

Write-Host "Fetching transaction data...`n" -ForegroundColor Gray

try {
    $result = Invoke-WebRequest -Uri $url -UseBasicParsing | ConvertFrom-Json
    
    if ($result.success -and $result.count -gt 0) {
        $tx = $result.transactions[0]
        
        Write-Host "TRANSACTION OVERVIEW" -ForegroundColor Yellow
        Write-Host "==========================================`n" -ForegroundColor Yellow
        Write-Host "Signature:  $($tx.signature)" -ForegroundColor White
        Write-Host "Status:     $($tx.status.ToUpper())" -ForegroundColor $(if ($tx.status -eq 'success') { 'Green' } else { 'Red' })
        Write-Host "Slot:       $($tx.slot)" -ForegroundColor White
        Write-Host "Time:       $($tx.timestamp)" -ForegroundColor White
        Write-Host "Fee:        $($tx.fee) lamports" -ForegroundColor White
        Write-Host "Fee Payer:  $($tx.feePayer)" -ForegroundColor White
        Write-Host ""
        
        # Token Transfers
        Write-Host "TOKEN TRANSFERS ($($tx.tokenTransfers.Count))" -ForegroundColor Magenta
        Write-Host "==========================================`n" -ForegroundColor Magenta
        if ($tx.tokenTransfers.Count -gt 0) {
            $i = 1
            foreach ($transfer in $tx.tokenTransfers) {
                Write-Host "  Transfer $i" -ForegroundColor Yellow
                Write-Host "    Mint:    $($transfer.mint)" -ForegroundColor White
                Write-Host "    From:    $($transfer.from)" -ForegroundColor White
                Write-Host "    To:      $($transfer.to)" -ForegroundColor White
                Write-Host "    Amount:  $($transfer.amount)" -ForegroundColor Green
                Write-Host "    Type:    $($transfer.tokenStandard)`n" -ForegroundColor Cyan
                $i++
            }
        } else {
            Write-Host "  No token transfers`n" -ForegroundColor Gray
        }
        
        # SOL Transfers
        Write-Host "SOL TRANSFERS ($($tx.nativeTransfers.Count))" -ForegroundColor Green
        Write-Host "==========================================`n" -ForegroundColor Green
        if ($tx.nativeTransfers.Count -gt 0) {
            $i = 1
            foreach ($transfer in $tx.nativeTransfers) {
                Write-Host "  Transfer $i" -ForegroundColor Yellow
                Write-Host "    From:       $($transfer.from)" -ForegroundColor White
                Write-Host "    To:         $($transfer.to)" -ForegroundColor White
                Write-Host "    Amount:     $($transfer.amount) lamports" -ForegroundColor White
                Write-Host "    Amount SOL: $($transfer.amountSol) SOL`n" -ForegroundColor Green
                $i++
            }
        }
        
        # Instructions
        Write-Host "INSTRUCTIONS ($($tx.instructions.Count))" -ForegroundColor Blue
        Write-Host "==========================================`n" -ForegroundColor Blue
        $i = 1
        foreach ($ix in $tx.instructions) {
            Write-Host "  Instruction $i" -ForegroundColor Yellow
            Write-Host "    Program: $($ix.programName)" -ForegroundColor Cyan
            Write-Host "    Type:    $($ix.type)" -ForegroundColor Green
            Write-Host "    ID:      $($ix.programId)" -ForegroundColor Gray
            
            if ($ix.data) {
                Write-Host "    Data:" -ForegroundColor Yellow
                $ix.data.PSObject.Properties | ForEach-Object {
                    Write-Host "      $($_.Name): $($_.Value)" -ForegroundColor White
                }
            }
            Write-Host ""
            $i++
        }
        
        # Account Changes
        Write-Host "ACCOUNT CHANGES ($($tx.accountData.Count))" -ForegroundColor DarkYellow
        Write-Host "==========================================`n" -ForegroundColor DarkYellow
        $i = 1
        foreach ($acc in $tx.accountData) {
            if ($acc.nativeBalanceChange -ne 0 -or $acc.tokenBalanceChanges.Count -gt 0) {
                Write-Host "  Account $i" -ForegroundColor Yellow
                Write-Host "    Address: $($acc.account)" -ForegroundColor White
                
                if ($acc.nativeBalanceChange -ne 0) {
                    $changeColor = if ($acc.nativeBalanceChange -gt 0) { 'Green' } else { 'Red' }
                    Write-Host "    SOL Change: $($acc.nativeBalanceChangeSol) SOL" -ForegroundColor $changeColor
                }
                
                if ($acc.tokenBalanceChanges.Count -gt 0) {
                    Write-Host "    Token Changes:" -ForegroundColor Cyan
                    foreach ($tokenChange in $acc.tokenBalanceChanges) {
                        Write-Host "      Mint: $($tokenChange.mint)" -ForegroundColor White
                        Write-Host "      Change: $($tokenChange.change)" -ForegroundColor $(if ($tokenChange.change -gt 0) { 'Green' } else { 'Red' })
                    }
                }
                Write-Host ""
                $i++
            }
        }
        
        # Events/Logs
        if ($tx.events.Count -gt 0) {
            Write-Host "EVENTS & LOGS ($($tx.events.Count))" -ForegroundColor DarkCyan
            Write-Host "==========================================`n" -ForegroundColor DarkCyan
            $i = 1
            foreach ($event in $tx.events) {
                Write-Host "  [$i] $event" -ForegroundColor Gray
                $i++
            }
            Write-Host ""
        }
        
        # Metadata
        Write-Host "METADATA" -ForegroundColor DarkGray
        Write-Host "==========================================`n" -ForegroundColor DarkGray
        Write-Host "Source:       $($tx.source)" -ForegroundColor White
        Write-Host "Network:      $($result.metadata.network)" -ForegroundColor White
        Write-Host "Data Quality: $($result.metadata.dataQuality)" -ForegroundColor Green
        
        Write-Host "`n=== END OF DETAILS ===`n" -ForegroundColor Cyan
        
    } else {
        Write-Host "No transactions found`n" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Error fetching data:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

