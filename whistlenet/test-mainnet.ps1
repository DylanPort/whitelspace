# Test MAINNET API

Write-Host "`n🔥🔥🔥 TESTING MAINNET API 🔥🔥🔥`n" -ForegroundColor Red

Write-Host "Test 1: Health Check (MAINNET)" -ForegroundColor Yellow
$health = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing | ConvertFrom-Json
Write-Host ($health | ConvertTo-Json -Depth 10)

Write-Host "`n`nTest 2: Stats (MAINNET)" -ForegroundColor Yellow
$stats = Invoke-WebRequest -Uri "http://localhost:8080/api/stats" -UseBasicParsing | ConvertFrom-Json
Write-Host ($stats | ConvertTo-Json -Depth 10)

Write-Host "`n`nTest 3: Real Mainnet Transactions" -ForegroundColor Yellow
$url = "http://localhost:8080/api/transactions?wallet=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU&limit=3"
$txs = Invoke-WebRequest -Uri $url -UseBasicParsing | ConvertFrom-Json
Write-Host ($txs | ConvertTo-Json -Depth 10)

Write-Host "`n`nTest 4: Real Mainnet Balance" -ForegroundColor Yellow
$balance = Invoke-WebRequest -Uri "http://localhost:8080/api/balance/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" -UseBasicParsing | ConvertFrom-Json
Write-Host ($balance | ConvertTo-Json -Depth 10)

Write-Host "`n`n✅ ALL TESTS COMPLETE!" -ForegroundColor Green
Write-Host "`n🔥 WHISTLE IS NOW RUNNING ON MAINNET! 🔥`n" -ForegroundColor Red





