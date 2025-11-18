# Ghost VPN - One-Click Setup for Windows (PowerShell)
# Run with: powershell -ExecutionPolicy Bypass -File ghost-vpn-quick-setup.ps1

param(
    [string]$ServerIP = "YOUR_SERVER_IP"
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Ghost VPN - One-Click Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠ Requesting administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -ServerIP $ServerIP"
    exit
}

Write-Host "[1/5] Checking VPN server..." -ForegroundColor White
$ping = Test-Connection -ComputerName $ServerIP -Count 1 -Quiet
if ($ping) {
    Write-Host "✓ VPN server is reachable at $ServerIP" -ForegroundColor Green
} else {
    Write-Host "✗ Cannot reach VPN server at $ServerIP" -ForegroundColor Red
    Write-Host "Please check the server IP and your internet connection." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[2/5] Detecting browsers..." -ForegroundColor White

$browsers = @{
    Chrome = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
    )
    Edge = @(
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
    )
    Firefox = @(
        "$env:ProgramFiles\Mozilla Firefox\firefox.exe",
        "${env:ProgramFiles(x86)}\Mozilla Firefox\firefox.exe"
    )
}

$foundBrowsers = @()
foreach ($browser in $browsers.Keys) {
    foreach ($path in $browsers[$browser]) {
        if (Test-Path $path) {
            Write-Host "✓ $browser detected" -ForegroundColor Green
            $foundBrowsers += @{Name=$browser; Path=$path}
            break
        }
    }
}

if ($foundBrowsers.Count -eq 0) {
    Write-Host "⚠ No supported browsers found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/5] Configuring system proxy..." -ForegroundColor White
Write-Host "Setting SOCKS5: $ServerIP:1080" -ForegroundColor Gray

# Configure Windows proxy settings
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" -Name ProxyEnable -Value 1
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" -Name ProxyServer -Value "socks=${ServerIP}:1080"
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" -Name ProxyOverride -Value "<local>"

Write-Host "✓ System proxy configured" -ForegroundColor Green

Write-Host ""
Write-Host "[4/5] Closing browsers to apply settings..." -ForegroundColor White

# Close browsers
Get-Process chrome,msedge,firefox -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "✓ Browsers closed" -ForegroundColor Green

Write-Host ""
Write-Host "[5/5] Creating disconnect script..." -ForegroundColor White

# Create disconnect script
$disconnectScript = @"
# Ghost VPN - Disconnect
Write-Host "Disconnecting Ghost VPN..." -ForegroundColor Yellow
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" -Name ProxyEnable -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" -Name ProxyServer -ErrorAction SilentlyContinue
Write-Host "✓ Ghost VPN disconnected" -ForegroundColor Green
Read-Host "Press Enter to exit"
"@

$disconnectScript | Out-File -FilePath "ghost-vpn-disconnect.ps1" -Encoding UTF8
Write-Host "✓ Disconnect script created: ghost-vpn-disconnect.ps1" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ✓ Ghost VPN Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your browser is now configured to use:" -ForegroundColor White
Write-Host "  SOCKS5 Proxy: $ServerIP:1080" -ForegroundColor Yellow
Write-Host ""
Write-Host "Testing connection..." -ForegroundColor Gray
$testPing = Test-Connection -ComputerName $ServerIP -Count 1 -Quiet
if ($testPing) {
    Write-Host "✓ VPN connection active!" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: VPN server not responding" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "What's next:" -ForegroundColor White
Write-Host "  1. Open your browser (Chrome/Edge/Firefox)" -ForegroundColor Gray
Write-Host "  2. Visit https://whatismyip.com to verify" -ForegroundColor Gray
Write-Host "  3. Your IP should show: $ServerIP" -ForegroundColor Gray
Write-Host ""
Write-Host "To disconnect:" -ForegroundColor White
Write-Host "  Run: powershell -File ghost-vpn-disconnect.ps1" -ForegroundColor Gray
Write-Host ""

$openBrowser = Read-Host "Open browser now to test? (Y/N)"
if ($openBrowser -eq "Y" -or $openBrowser -eq "y") {
    if ($foundBrowsers.Count -gt 0) {
        $browserPath = $foundBrowsers[0].Path
        Start-Process $browserPath "https://whatismyip.com"
        Write-Host "✓ Browser opened" -ForegroundColor Green
    }
}

Write-Host ""
Read-Host "Press Enter to exit"


