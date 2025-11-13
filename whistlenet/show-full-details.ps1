# Show FULL transaction details like Helius
param(
    [string]$address = "64pR7tmBvKvnPnWBht4Nni1vHuqWmx42XkzJDE1KnyYK",
    [int]$limit = 1
)

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     WHISTLE PROFESSIONAL API - FULL TRANSACTION DETAILS    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Fetch transaction with full details
$url = "http://localhost:8080/api/v1/transactions?wallet=$address" + "&limit=$limit"
Write-Host "Fetching from: $url`n" -ForegroundColor Gray

try {
    $result = Invoke-WebRequest -Uri $url -UseBasicParsing | ConvertFrom-Json
    
    if ($result.success -and $result.count -gt 0) {
        $tx = $result.transactions[0]
        
        # ============ OVERVIEW ============
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
        Write-Host "                     TRANSACTION OVERVIEW                   " -ForegroundColor Yellow
        Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Yellow
        
        Write-Host "Signature:   " -NoNewline -ForegroundColor Cyan
        Write-Host $tx.signature -ForegroundColor White
        
        Write-Host "Status:      " -NoNewline -ForegroundColor Cyan
        $statusColor = if ($tx.status -eq "success") { "Green" } else { "Red" }
        Write-Host $tx.status.ToUpper() -ForegroundColor $statusColor
        
        Write-Host "Slot:        " -NoNewline -ForegroundColor Cyan
        Write-Host $tx.slot.ToString("N0") -ForegroundColor White
        
        Write-Host "Time:        " -NoNewline -ForegroundColor Cyan
        Write-Host $tx.timestamp -ForegroundColor White
        
        Write-Host "Fee:         " -NoNewline -ForegroundColor Cyan
        Write-Host "$($tx.fee) lamports" -ForegroundColor White
        
        Write-Host "Fee Payer:   " -NoNewline -ForegroundColor Cyan
        Write-Host $tx.feePayer -ForegroundColor White
        
        Write-Host ""
        
        # ============ TOKEN TRANSFERS ============
        if ($tx.tokenTransfers.Count -gt 0) {
            Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
            Write-Host "                     TOKEN TRANSFERS                        " -ForegroundColor Magenta
            Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Magenta
            
            $i = 1
            foreach ($transfer in $tx.tokenTransfers) {
                Write-Host "Transfer #$i" -ForegroundColor Yellow
                Write-Host "  Mint:      $($transfer.mint)" -ForegroundColor White
                Write-Host "  From:      $($transfer.from)" -ForegroundColor White
                Write-Host "  To:        $($transfer.to)" -ForegroundColor White
                Write-Host "  Amount:    $($transfer.amount)" -ForegroundColor Green
                Write-Host "  Decimals:  $($transfer.decimals)" -ForegroundColor White
                Write-Host "  Type:      $($transfer.tokenStandard)" -ForegroundColor Cyan
                Write-Host ""
                $i++
            }
        } else {
            Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
            Write-Host "              TOKEN TRANSFERS: None                        " -ForegroundColor Magenta
            Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Magenta
        }
        
        # ============ SOL TRANSFERS ============
        if ($tx.nativeTransfers.Count -gt 0) {
            Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
            Write-Host "                     SOL TRANSFERS                          " -ForegroundColor Green
            Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Green
            
            $i = 1
            foreach ($transfer in $tx.nativeTransfers) {
                Write-Host "Transfer #$i" -ForegroundColor Yellow
                Write-Host "  From:        $($transfer.from)" -ForegroundColor White
                Write-Host "  To:          $($transfer.to)" -ForegroundColor White
                Write-Host "  Amount:      $($transfer.amount) lamports" -ForegroundColor White
                Write-Host "  Amount SOL:  $($transfer.amountSol) SOL" -ForegroundColor Green
                Write-Host ""
                $i++
            }
        }
        
        # ============ INSTRUCTIONS ============
        if ($tx.instructions.Count -gt 0) {
            Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
            Write-Host "                     INSTRUCTIONS                           " -ForegroundColor Blue
            Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Blue
            
            $i = 1
            foreach ($ix in $tx.instructions) {
                Write-Host "Instruction #$i" -ForegroundColor Yellow
                Write-Host "  Program:     $($ix.programName)" -ForegroundColor Cyan
                Write-Host "  Program ID:  $($ix.programId)" -ForegroundColor White
                Write-Host "  Type:        $($ix.type)" -ForegroundColor Green
                
                if ($ix.data -and ($ix.data | Get-Member -MemberType Properties).Count -gt 0) {
                    Write-Host "  Data:" -ForegroundColor Yellow
                    $ix.data.PSObject.Properties | ForEach-Object {
                        Write-Host "    $($_.Name): $($_.Value)" -ForegroundColor White
                    }
                }
                Write-Host ""
                $i++
            }
        }
        
        # ============ ACCOUNT CHANGES ============
        if ($tx.accountData.Count -gt 0) {
            Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor DarkYellow
            Write-Host "                     ACCOUNT CHANGES                        " -ForegroundColor DarkYellow
            Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor DarkYellow
            
            $i = 1
            foreach ($acc in $tx.accountData) {
                if ($acc.nativeBalanceChange -ne 0 -or $acc.tokenBalanceChanges.Count -gt 0) {
                    Write-Host "Account #$i" -ForegroundColor Yellow
                    Write-Host "  Address:        $($acc.account)" -ForegroundColor White
                    
                    if ($acc.nativeBalanceChange -ne 0) {
                        $changeColor = if ($acc.nativeBalanceChange -gt 0) { "Green" } else { "Red" }
                        Write-Host "  SOL Change:     $($acc.nativeBalanceChangeSol) SOL" -ForegroundColor $changeColor
                        Write-Host "  Lamports:       $($acc.nativeBalanceChange)" -ForegroundColor White
                    }
                    
                    if ($acc.tokenBalanceChanges.Count -gt 0) {
                        Write-Host "  Token Changes:" -ForegroundColor Cyan
                        foreach ($tokenChange in $acc.tokenBalanceChanges) {
                            $changeColor = if ($tokenChange.change -gt 0) { "Green" } else { "Red" }
                            Write-Host "    • Mint: $($tokenChange.mint)" -ForegroundColor White
                            Write-Host "      Change: $($tokenChange.change)" -ForegroundColor $changeColor
                            Write-Host "      Decimals: $($tokenChange.decimals)" -ForegroundColor White
                        }
                    }
                    Write-Host ""
                    $i++
                }
            }
        }
        
        # ============ EVENTS/LOGS ============
        if ($tx.events.Count -gt 0) {
            Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
            Write-Host "                     EVENTS & LOGS                          " -ForegroundColor DarkCyan
            Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor DarkCyan
            
            $i = 1
            foreach ($event in $tx.events) {
                Write-Host "[$i] $event" -ForegroundColor Gray
                $i++
            }
            Write-Host ""
        }
        
        # ============ METADATA ============
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor DarkGray
        Write-Host "                     METADATA                               " -ForegroundColor DarkGray
        Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor DarkGray
        
        Write-Host "Source:        " -NoNewline -ForegroundColor Cyan
        Write-Host $tx.source -ForegroundColor White
        
        Write-Host "Network:       " -NoNewline -ForegroundColor Cyan
        Write-Host $result.metadata.network -ForegroundColor White
        
        Write-Host "Data Quality:  " -NoNewline -ForegroundColor Cyan
        Write-Host $result.metadata.dataQuality -ForegroundColor Green
        
        Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
        Write-Host "║               END OF TRANSACTION DETAILS                   ║" -ForegroundColor Cyan
        Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
        
    } else {
        Write-Host "No transactions found" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

