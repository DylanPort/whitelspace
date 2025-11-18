# Whistlenet Mainnet Stack - Quick Start Script
# This script starts both the Provider API and Dashboard in mainnet mode

param(
    [switch]$ApiOnly,
    [switch]$DashboardOnly,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
🚀 Whistlenet Mainnet Stack Launcher

USAGE:
    .\start-mainnet-stack.ps1           Start both API and Dashboard
    .\start-mainnet-stack.ps1 -ApiOnly         Start only the Provider API
    .\start-mainnet-stack.ps1 -DashboardOnly   Start only the Dashboard
    .\start-mainnet-stack.ps1 -Help            Show this help

PREREQUISITES:
    - Node.js 18+ installed
    - Dependencies installed (npm install in each directory)
    - .env.local files configured (see MAINNET_FRONTEND_SETUP.md)

MAINNET CONFIGURATION:
    Program ID: WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt
    Network:    Solana Mainnet-Beta
    
SERVICES:
    Provider API:  http://localhost:8080
    Dashboard:     http://localhost:3000

LOGS:
    API logs will be saved to: whistlenet/provider/api/mainnet.log
    Dashboard will output to console

"@
    exit 0
}

Write-Host "🎯 Whistlenet Mainnet Stack" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Mainnet Deployment Info:" -ForegroundColor Yellow
Write-Host "   Program ID:  WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt" -ForegroundColor Gray
Write-Host "   Network:     Solana Mainnet-Beta" -ForegroundColor Gray
Write-Host "   Query Cost:  0.00001 SOL" -ForegroundColor Gray
Write-Host ""

# Check if in correct directory
if (!(Test-Path "whistlenet") -or !(Test-Path "whistle-dashboard")) {
    Write-Host "❌ Error: Please run this script from the project root (Encrypto directory)" -ForegroundColor Red
    exit 1
}

# Function to check if Node.js is installed
function Test-NodeJs {
    try {
        $null = Get-Command node -ErrorAction Stop
        $version = node --version
        Write-Host "✅ Node.js detected: $version" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
        return $false
    }
}

# Function to start Provider API
function Start-ProviderAPI {
    Write-Host ""
    Write-Host "🔧 Starting Provider API..." -ForegroundColor Cyan
    Write-Host "   Port: 8080" -ForegroundColor Gray
    Write-Host "   Mode: Mainnet (Read-Only)" -ForegroundColor Gray
    Write-Host ""
    
    Push-Location "whistlenet\provider\api"
    
    # Check if node_modules exists
    if (!(Test-Path "node_modules")) {
        Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    # Start the server
    Write-Host "🚀 Launching API server..." -ForegroundColor Green
    Write-Host "   Logs: whistlenet\provider\api\mainnet.log" -ForegroundColor Gray
    Write-Host ""
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run mainnet 2>&1 | Tee-Object -FilePath mainnet.log"
    
    Pop-Location
    Start-Sleep -Seconds 3
    Write-Host "✅ Provider API started!" -ForegroundColor Green
}

# Function to start Dashboard
function Start-Dashboard {
    Write-Host ""
    Write-Host "🖥️  Starting Dashboard..." -ForegroundColor Cyan
    Write-Host "   Port: 3000" -ForegroundColor Gray
    Write-Host "   Mode: Production" -ForegroundColor Gray
    Write-Host ""
    
    Push-Location "whistle-dashboard"
    
    # Check if node_modules exists
    if (!(Test-Path "node_modules")) {
        Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    # Check if .env.local exists
    if (!(Test-Path ".env.local")) {
        Write-Host "⚠️  Warning: .env.local not found!" -ForegroundColor Yellow
        Write-Host "   Creating from .env.example..." -ForegroundColor Yellow
        
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env.local"
            Write-Host "✅ .env.local created. Please review and update if needed." -ForegroundColor Green
        }
        else {
            Write-Host "❌ .env.example not found. Please create .env.local manually." -ForegroundColor Red
            Write-Host "   See MAINNET_FRONTEND_SETUP.md for instructions." -ForegroundColor Gray
            Pop-Location
            return
        }
    }
    
    # Start the dashboard
    Write-Host "🚀 Launching Dashboard..." -ForegroundColor Green
    Write-Host ""
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
    
    Pop-Location
    Start-Sleep -Seconds 5
    Write-Host "✅ Dashboard started!" -ForegroundColor Green
}

# Main execution
if (!(Test-NodeJs)) {
    exit 1
}

if ($DashboardOnly) {
    Start-Dashboard
}
elseif ($ApiOnly) {
    Start-ProviderAPI
}
else {
    Start-ProviderAPI
    Start-Dashboard
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Whistlenet Mainnet Stack is running!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Services:" -ForegroundColor Yellow
Write-Host "   Provider API:  http://localhost:8080" -ForegroundColor Cyan
if (!$ApiOnly) {
    Write-Host "   Dashboard:     http://localhost:3000" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "📊 Explorers:" -ForegroundColor Yellow
Write-Host "   Solscan:  https://solscan.io/account/WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt" -ForegroundColor Gray
Write-Host "   Explorer: https://explorer.solana.com/address/WhStMSgDJz3dYtaLKt4855DDypB64Dz3PpAFMbuicbt" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Documentation:" -ForegroundColor Yellow
Write-Host "   Setup Guide:     MAINNET_FRONTEND_SETUP.md" -ForegroundColor Gray
Write-Host "   Deployment Info: WHISTLENET_MAINNET_DEPLOYMENT.md" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop services" -ForegroundColor Gray
Write-Host ""

