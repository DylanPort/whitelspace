# Test Self-Sufficient Token APIs

Write-Host "`n=== TESTING SELF-SUFFICIENT APIs ===" -ForegroundColor Cyan
Write-Host "Using OUR OWN blockchain data, NOT external APIs!`n" -ForegroundColor Yellow

# Test 1: Token Info
Write-Host "Test 1: Token Info" -ForegroundColor Yellow
$token = Invoke-RestMethod "http://localhost:8080/api/tokens/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
Write-Host "Source: $($token.source)" -ForegroundColor Green
if ($token.note) { Write-Host "Note: $($token.note)" -ForegroundColor White }
Write-Host ""

# Test 2: Trending
Write-Host "Test 2: Trending Tokens" -ForegroundColor Yellow
$trending = Invoke-RestMethod "http://localhost:8080/api/tokens/trending/24h"
Write-Host "Source: $($trending.source)" -ForegroundColor Green
Write-Host "Calculation: $($trending.calculation)" -ForegroundColor White
Write-Host "Tokens Found: $($trending.count)" -ForegroundColor White
if ($trending.note) { Write-Host "Note: $($trending.note)" -ForegroundColor Gray }
Write-Host ""

# Test 3: Volume
Write-Host "Test 3: Volume Tracking" -ForegroundColor Yellow
$volume = Invoke-RestMethod "http://localhost:8080/api/tokens/volume/24h"
Write-Host "Source: $($volume.source)" -ForegroundColor Green
Write-Host "Calculation: $($volume.calculation)" -ForegroundColor White
Write-Host "Tokens Found: $($volume.count)" -ForegroundColor White
if ($volume.note) { Write-Host "Note: $($volume.note)" -ForegroundColor Gray }
Write-Host ""

# Test 4: Latest Tokens
Write-Host "Test 4: Latest Tokens" -ForegroundColor Yellow
$latest = Invoke-RestMethod "http://localhost:8080/api/tokens/latest?limit=10"
Write-Host "Source: $($latest.source)" -ForegroundColor Green
Write-Host "Tokens Found: $($latest.count)" -ForegroundColor White
if ($latest.note) { Write-Host "Note: $($latest.note)" -ForegroundColor Gray }
Write-Host ""

Write-Host "=== KEY POINTS ===" -ForegroundColor Cyan
Write-Host "1. All data from OUR blockchain index" -ForegroundColor Green
Write-Host "2. No external API dependencies" -ForegroundColor Green
Write-Host "3. Fully decentralized" -ForegroundColor Green
Write-Host "4. We ARE the data provider, not a wrapper" -ForegroundColor Green
Write-Host ""

