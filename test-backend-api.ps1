# Quick test of WHISTLE backend API
Write-Host "Testing WHISTLE Backend API..." -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://152.53.130.177:8080"

# Test 1: Health Check
Write-Host "1. Health Check" -ForegroundColor Green
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get
    Write-Host "   Status: $($health.status)" -ForegroundColor Yellow
    Write-Host "   Database: $($health.database)" -ForegroundColor Yellow
    Write-Host "   Uptime: $([math]::Round($health.uptime / 3600, 2)) hours" -ForegroundColor Yellow
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Provider Stats
Write-Host "2. Provider Stats" -ForegroundColor Green
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/providers/stats" -Method Get
    Write-Host "   Response: $($stats | ConvertTo-Json -Depth 3)" -ForegroundColor Yellow
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}

Write-Host ""

# Test 3: Latest Tokens
Write-Host "3. Latest Tokens" -ForegroundColor Green
try {
    $tokens = Invoke-RestMethod -Uri "$baseUrl/tokens/latest" -Method Get
    Write-Host "   Found $($tokens.Count) tokens" -ForegroundColor Yellow
    if ($tokens.Count -gt 0) {
        Write-Host "   Latest: $($tokens[0].name)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}

Write-Host ""

# Test 4: WHISTLE Token Query
Write-Host "4. WHISTLE Token Info" -ForegroundColor Green
$whistleAddress = "6Hb2xgEhyN9iVVH3cgSxYjfN774ExzgiCftwiWdjpump"
try {
    $whistle = Invoke-RestMethod -Uri "$baseUrl/tokens/$whistleAddress" -Method Get
    Write-Host "   Name: $($whistle.name)" -ForegroundColor Yellow
    Write-Host "   Symbol: $($whistle.symbol)" -ForegroundColor Yellow
    Write-Host "   Address: $($whistle.address)" -ForegroundColor Cyan
} catch {
    Write-Host "   FAILED: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Backend API Tests Complete!" -ForegroundColor Green
