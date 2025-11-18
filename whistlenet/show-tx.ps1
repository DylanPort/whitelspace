# Show FULL transaction details
$address = "64pR7tmBvKvnPnWBht4Nni1vHuqWmx42XkzJDE1KnyYK"

Write-Host "`n=== FULL TRANSACTION DETAILS ===" -ForegroundColor Cyan

$uri = "http://localhost:8080/api/v1/transactions"
$result = Invoke-RestMethod -Uri $uri -Method Get -Body @{wallet=$address; limit=1}

if ($result.success -and $result.count -gt 0) {
    $tx = $result.transactions[0]
    
    Write-Host "`nOVERVIEW" -ForegroundColor Yellow
    Write-Host "--------" -ForegroundColor Yellow
    Write-Host "Signature:  $($tx.signature)" -ForegroundColor White
    Write-Host "Status:     $($tx.status.ToUpper())" -ForegroundColor Green
    Write-Host "Slot:       $($tx.slot)" -ForegroundColor White
    Write-Host "Time:       $($tx.timestamp)" -ForegroundColor White
    Write-Host "Fee:        $($tx.fee) lamports ($([math]::Round($tx.fee / 1e9, 9)) SOL)" -ForegroundColor White
    Write-Host "Fee Payer:  $($tx.feePayer)" -ForegroundColor White
    
    Write-Host "`nTOKEN TRANSFERS: $($tx.tokenTransfers.Count)" -ForegroundColor Magenta
    Write-Host "--------" -ForegroundColor Magenta
    if ($tx.tokenTransfers.Count -eq 0) {
        Write-Host "None" -ForegroundColor Gray
    } else {
        $tx.tokenTransfers | ForEach-Object -Begin { $i=1 } -Process {
            Write-Host "`nTransfer $i":" -ForegroundColor Yellow
            Write-Host "  Mint:   $($_.mint)" -ForegroundColor White
            Write-Host "  From:   $($_.from)" -ForegroundColor White
            Write-Host "  To:     $($_.to)" -ForegroundColor White
            Write-Host "  Amount: $($_.amount)" -ForegroundColor Green
            Write-Host "  Type:   $($_.tokenStandard)" -ForegroundColor Cyan
            $i++
        }
    }
    
    Write-Host "`n`nSOL TRANSFERS: $($tx.nativeTransfers.Count)" -ForegroundColor Green
    Write-Host "--------" -ForegroundColor Green
    $tx.nativeTransfers | ForEach-Object -Begin { $i=1 } -Process {
        Write-Host "`nTransfer $i:" -ForegroundColor Yellow
        Write-Host "  From:   $($_.from)" -ForegroundColor White
        Write-Host "  To:     $($_.to)" -ForegroundColor White
        Write-Host "  Amount: $($_.amountSol) SOL" -ForegroundColor Green
        $i++
    }
    
    Write-Host "`n`nINSTRUCTIONS: $($tx.instructions.Count)" -ForegroundColor Blue
    Write-Host "--------" -ForegroundColor Blue
    $tx.instructions | ForEach-Object -Begin { $i=1 } -Process {
        Write-Host "`nInstruction $i:" -ForegroundColor Yellow
        Write-Host "  Program: $($_.programName)" -ForegroundColor Cyan
        Write-Host "  Type:    $($_.type)" -ForegroundColor Green
        Write-Host "  ID:      $($_.programId)" -ForegroundColor Gray
        if ($_.data -and ($_.data.PSObject.Properties.Count -gt 0)) {
            Write-Host "  Data:" -ForegroundColor Yellow
            $_.data.PSObject.Properties | ForEach-Object {
                Write-Host "    $($_.Name): $($_.Value)" -ForegroundColor White
            }
        }
        $i++
    }
    
    Write-Host "`n`nACCOUNT CHANGES: $($tx.accountData.Count)" -ForegroundColor DarkYellow
    Write-Host "--------" -ForegroundColor DarkYellow
    $tx.accountData | Where-Object { $_.nativeBalanceChange -ne 0 -or $_.tokenBalanceChanges.Count -gt 0 } | ForEach-Object -Begin { $i=1 } -Process {
        Write-Host "`nAccount $i:" -ForegroundColor Yellow
        Write-Host "  Address:    $($_.account)" -ForegroundColor White
        if ($_.nativeBalanceChange -ne 0) {
            $color = if ($_.nativeBalanceChange -gt 0) { 'Green' } else { 'Red' }
            Write-Host "  SOL Change: $($_.nativeBalanceChangeSol) SOL" -ForegroundColor $color
        }
        if ($_.tokenBalanceChanges.Count -gt 0) {
            Write-Host "  Token Changes:" -ForegroundColor Cyan
            $_.tokenBalanceChanges | ForEach-Object {
                $color = if ($_.change -gt 0) { 'Green' } else { 'Red' }
                Write-Host "    $($_.mint): $($_.change)" -ForegroundColor $color
            }
        }
        $i++
    }
    
    if ($tx.events.Count -gt 0) {
        Write-Host "`n`nEVENTS & LOGS: $($tx.events.Count)" -ForegroundColor DarkCyan
        Write-Host "--------" -ForegroundColor DarkCyan
        $tx.events | ForEach-Object -Begin { $i=1 } -Process {
            Write-Host "[$i] $_" -ForegroundColor Gray
            $i++
        }
    }
    
    Write-Host "`n`nMETADATA" -ForegroundColor DarkGray
    Write-Host "--------" -ForegroundColor DarkGray
    Write-Host "Source:       $($tx.source)" -ForegroundColor White
    Write-Host "Network:      $($result.metadata.network)" -ForegroundColor White
    Write-Host "Data Quality: $($result.metadata.dataQuality)" -ForegroundColor Green
    
    Write-Host "`n=== END ===`n" -ForegroundColor Cyan
} else {
    Write-Host "No transactions found" -ForegroundColor Red
}



