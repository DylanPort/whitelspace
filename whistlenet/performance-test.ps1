# Performance Test Script
Write-Host "`n🚀 WHISTLE API PERFORMANCE TEST`n" -ForegroundColor Cyan

$url = "http://localhost:8080/api/health"
$iterations = 20

Write-Host "Running $iterations requests..." -ForegroundColor Yellow
Write-Host ""

$results = @()

for ($i = 1; $i -le $iterations; $i++) {
    $start = Get-Date
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop
        $end = Get-Date
        $duration = ($end - $start).TotalMilliseconds
        $results += $duration
        
        $color = "Green"
        if ($duration -gt 100) { $color = "Yellow" }
        if ($duration -gt 500) { $color = "Red" }
        
        Write-Host ("Request {0,2}: {1,7:F2} ms" -f $i, $duration) -ForegroundColor $color
    }
    catch {
        Write-Host "Request $i : FAILED" -ForegroundColor Red
    }
}

Write-Host "`n📊 PERFORMANCE RESULTS:" -ForegroundColor Cyan
Write-Host ("  Average: {0:F2} ms" -f ($results | Measure-Object -Average).Average) -ForegroundColor White
Write-Host ("  Minimum: {0:F2} ms" -f ($results | Measure-Object -Minimum).Minimum) -ForegroundColor Green
Write-Host ("  Maximum: {0:F2} ms" -f ($results | Measure-Object -Maximum).Maximum) -ForegroundColor Yellow
Write-Host ("  Requests: {0}" -f $results.Count) -ForegroundColor White

# Calculate percentiles
$sorted = $results | Sort-Object
$p50 = $sorted[[math]::Floor($sorted.Count * 0.5)]
$p95 = $sorted[[math]::Floor($sorted.Count * 0.95)]
$p99 = $sorted[[math]::Floor($sorted.Count * 0.99)]

Write-Host "`n📈 PERCENTILES:" -ForegroundColor Cyan
Write-Host ("  P50 (median): {0:F2} ms" -f $p50) -ForegroundColor White
Write-Host ("  P95: {0:F2} ms" -f $p95) -ForegroundColor White
Write-Host ("  P99: {0:F2} ms" -f $p99) -ForegroundColor White

# Performance rating
$avg = ($results | Measure-Object -Average).Average
Write-Host "`n⭐ RATING:" -ForegroundColor Cyan
if ($avg -lt 50) {
    Write-Host "  EXCELLENT - <50ms average" -ForegroundColor Green
} elseif ($avg -lt 100) {
    Write-Host "  GOOD - <100ms average" -ForegroundColor Green
} elseif ($avg -lt 500) {
    Write-Host "  ACCEPTABLE - <500ms average" -ForegroundColor Yellow
} else {
    Write-Host "  NEEDS IMPROVEMENT - >500ms average" -ForegroundColor Red
}

Write-Host ""

