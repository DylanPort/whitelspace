# Start Netlify Dev Server with Correct API Keys

Write-Host "Cleaning up old environment variables..." -ForegroundColor Cyan

# Kill any existing netlify processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Free up ports
npx kill-port 3999 8888 2>&1 | Out-Null

# Remove old OPENAI_API_KEY from current session
Remove-Item Env:\OPENAI_API_KEY -ErrorAction SilentlyContinue

Write-Host "Environment cleaned" -ForegroundColor Green
Write-Host ""
Write-Host "Starting Netlify Dev Server..." -ForegroundColor Cyan
Write-Host "API keys will be loaded from .env file" -ForegroundColor Gray
Write-Host ""

# Start netlify dev
netlify dev

