# Install PostgreSQL using Chocolatey
Write-Host "Installing PostgreSQL 15..." -ForegroundColor Green

# Check if Chocolatey is installed
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Chocolatey is not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "To install Chocolatey, run this in an ADMIN PowerShell:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host 'Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString(''https://community.chocolatey.org/install.ps1''))' -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or download PostgreSQL manually from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Install PostgreSQL
Write-Host "Installing via Chocolatey..." -ForegroundColor Green
choco install postgresql15 -y --params '/Password:password'

Write-Host ""
Write-Host "✅ PostgreSQL installation initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "Default credentials:" -ForegroundColor Cyan
Write-Host "  Username: postgres" -ForegroundColor White
Write-Host "  Password: password" -ForegroundColor White
Write-Host "  Port: 5432" -ForegroundColor White
Write-Host ""
Write-Host "After installation completes, run setup-database.ps1" -ForegroundColor Yellow





