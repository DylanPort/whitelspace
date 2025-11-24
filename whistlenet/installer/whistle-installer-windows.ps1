# WHISTLE Cache Node - All-in-One Windows Installer
# This script installs everything needed automatically

$ErrorActionPreference = "Stop"

# ASCII Art Header
Write-Host @"

╦ ╦╦ ╦╦╔═╗╔╦╗╦  ╔═╗  ╔╗╔╔═╗╔╦╗╦ ╦╔═╗╦═╗╦╔═
║║║╠═╣║╚═╗ ║ ║  ║╣   ║║║║╣  ║ ║║║║ ║╠╦╝╠╩╗
╚╩╝╩ ╩╩╚═╝ ╩ ╩═╝╚═╝  ╝╚╝╚═╝ ╩ ╚╩╝╚═╝╩╚═╩ ╩
     💰 Earn $50-500/month automatically 💰
     
"@ -ForegroundColor Cyan

# Simple prompts
Write-Host "Welcome! Let's get you earning SOL in 60 seconds." -ForegroundColor Green
Write-Host ""

# Get wallet
Write-Host "Step 1: What's your Solana wallet address?" -ForegroundColor Yellow
Write-Host "(This is where your earnings will be sent)" -ForegroundColor Gray
$wallet = Read-Host "Wallet"

if ($wallet.Length -lt 30) {
    Write-Host "That doesn't look like a valid wallet address. Please try again." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Wallet saved!" -ForegroundColor Green
Write-Host ""

# Auto-detect best location based on timezone
$timezone = (Get-TimeZone).Id
$location = "US-East"  # Default

if ($timezone -like "*Pacific*") { $location = "US-West" }
elseif ($timezone -like "*Central Europe*") { $location = "Europe" }
elseif ($timezone -like "*Asia*") { $location = "Asia" }

Write-Host "Step 2: We've selected '$location' as your location" -ForegroundColor Yellow
Write-Host "(Based on your timezone: $timezone)" -ForegroundColor Gray
$changeLocation = Read-Host "Press Enter to continue or type a different location (US-East/US-West/Europe/Asia)"
if ($changeLocation) { $location = $changeLocation }

Write-Host "✓ Location set to $location!" -ForegroundColor Green
Write-Host ""

# Check and install Docker if needed
Write-Host "Step 3: Checking requirements..." -ForegroundColor Yellow

$hasDocker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $hasDocker) {
    Write-Host "Docker not found. Installing Docker Desktop..." -ForegroundColor Cyan
    Write-Host "This will take 2-3 minutes..." -ForegroundColor Gray
    
    # Download Docker silently
    $dockerUrl = "https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe"
    $installerPath = "$env:TEMP\DockerInstaller.exe"
    
    Write-Host "Downloading Docker Desktop..." -ForegroundColor White
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $dockerUrl -OutFile $installerPath -UseBasicParsing
        
        Write-Host "Installing Docker Desktop (this window may freeze for a minute)..." -ForegroundColor White
        Start-Process -FilePath $installerPath -ArgumentList "install", "--quiet", "--accept-license" -Wait
        
        Write-Host "✓ Docker Desktop installed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Your computer needs to restart for Docker to work." -ForegroundColor Yellow
        Write-Host ""
        
        # Save config for after restart
        $configPath = "$env:USERPROFILE\Desktop\whistle-start.bat"
        @"
@echo off
echo Starting WHISTLE Cache Node...
docker run -d --name whistle-cache -e WALLET_ADDRESS=$wallet -e NODE_LOCATION=$location -p 8545:8545 --restart unless-stopped whistlenet/cache-node:latest
if %errorlevel% == 0 (
    echo SUCCESS! Your node is earning SOL!
    echo.
    echo View earnings: https://whistle.network/provider
    pause
) else (
    echo Docker is starting. Please wait 30 seconds and try again.
    pause
)
"@ | Out-File -FilePath $configPath -Encoding ASCII
        
        Write-Host "✅ Created 'whistle-start.bat' on your Desktop" -ForegroundColor Green
        Write-Host ""
        Write-Host "After restart:" -ForegroundColor Cyan
        Write-Host "1. Docker Desktop will start automatically" -ForegroundColor White
        Write-Host "2. Double-click 'whistle-start.bat' on your Desktop" -ForegroundColor White
        Write-Host "3. Start earning SOL!" -ForegroundColor White
        Write-Host ""
        
        $restart = Read-Host "Restart now? (Y/N)"
        if ($restart -eq "Y" -or $restart -eq "y") {
            Restart-Computer -Force
        } else {
            Write-Host "Please restart your computer manually and run 'whistle-start.bat' from Desktop" -ForegroundColor Yellow
        }
        exit 0
        
    } catch {
        Write-Host "Failed to download Docker. Please install manually from https://docker.com" -ForegroundColor Red
        Start-Process "https://docker.com"
        exit 1
    }
} else {
    Write-Host "✓ Docker is already installed!" -ForegroundColor Green
}

# Check if Docker is running
Write-Host ""
Write-Host "Starting Docker if needed..." -ForegroundColor Yellow

$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    # Try to start Docker Desktop
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Write-Host "Starting Docker Desktop..." -ForegroundColor Cyan
        Start-Process $dockerPath
        
        Write-Host "Waiting for Docker to start (up to 60 seconds)..." -ForegroundColor Gray
        $attempts = 0
        while ($attempts -lt 12) {
            Start-Sleep -Seconds 5
            $dockerRunning = docker info 2>$null
            if ($dockerRunning) { break }
            $attempts++
            Write-Host "." -NoNewline
        }
        Write-Host ""
    }
}

if (-not $dockerRunning) {
    Write-Host "⚠️  Docker Desktop needs to be running." -ForegroundColor Yellow
    Write-Host "Please start Docker Desktop manually (look for the whale icon)" -ForegroundColor White
    Write-Host "Then run this installer again." -ForegroundColor White
    pause
    exit 1
}

Write-Host "✓ Docker is running!" -ForegroundColor Green
Write-Host ""

# Install the cache node
Write-Host "Step 4: Installing your cache node..." -ForegroundColor Yellow

# Remove any existing container
docker stop whistle-cache 2>$null | Out-Null
docker rm whistle-cache 2>$null | Out-Null

# Run the cache node
Write-Host "Starting cache node..." -ForegroundColor Cyan
$result = docker run -d `
    --name whistle-cache `
    -e WALLET_ADDRESS=$wallet `
    -e NODE_LOCATION=$location `
    -p 8545:8545 `
    --restart unless-stopped `
    whistlenet/cache-node:latest 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "    🎉 SUCCESS! YOUR NODE IS EARNING SOL! 🎉" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Your Setup:" -ForegroundColor Cyan
    Write-Host "   Wallet: $wallet" -ForegroundColor White
    Write-Host "   Location: $location" -ForegroundColor White
    Write-Host "   Status: " -NoNewline
    Write-Host "EARNING" -ForegroundColor Green
    Write-Host ""
    
    Start-Sleep -Seconds 3
    
    # Show node status
    $status = docker ps --filter "name=whistle-cache" --format "table {{.Status}}" | Select-Object -Last 1
    Write-Host "🟢 Node Status: $status" -ForegroundColor Green
    Write-Host ""
    
    # Create desktop shortcuts
    Write-Host "Creating desktop shortcuts..." -ForegroundColor Yellow
    
    $desktop = [Environment]::GetFolderPath("Desktop")
    
    # View Logs shortcut
    $logsPath = "$desktop\WHISTLE - View Logs.bat"
    "@echo off`ndocker logs whistle-cache -f" | Out-File -FilePath $logsPath -Encoding ASCII
    
    # Check Earnings shortcut  
    $earningsPath = "$desktop\WHISTLE - Check Earnings.bat"
    "@echo off`ncurl http://localhost:8545/metrics`npause" | Out-File -FilePath $earningsPath -Encoding ASCII
    
    # Stop Node shortcut
    $stopPath = "$desktop\WHISTLE - Stop Node.bat"
    "@echo off`ndocker stop whistle-cache`necho Node stopped`npause" | Out-File -FilePath $stopPath -Encoding ASCII
    
    Write-Host "✓ Desktop shortcuts created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Check your Desktop for:" -ForegroundColor Cyan
    Write-Host "   • WHISTLE - View Logs (see what your node is doing)" -ForegroundColor White
    Write-Host "   • WHISTLE - Check Earnings (see how much you've earned)" -ForegroundColor White
    Write-Host "   • WHISTLE - Stop Node (pause earning if needed)" -ForegroundColor White
    Write-Host ""
    Write-Host "💰 Expected Earnings:" -ForegroundColor Yellow
    Write-Host "   • Per day: 0.7-3.5 SOL" -ForegroundColor White
    Write-Host "   • Per month: 21-105 SOL" -ForegroundColor White
    Write-Host "   • In USD: $50-500/month" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 View Dashboard: https://whistle.network/provider" -ForegroundColor Cyan
    Write-Host ""
    
    # Show initial logs
    Write-Host "📋 Node Logs (last 10 lines):" -ForegroundColor Yellow
    docker logs whistle-cache --tail 10
    
} else {
    Write-Host ""
    Write-Host "❌ Failed to start cache node" -ForegroundColor Red
    Write-Host "Error: $result" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running this command manually:" -ForegroundColor Yellow
    Write-Host "docker run -d --name whistle-cache -e WALLET_ADDRESS=$wallet -e NODE_LOCATION=$location -p 8545:8545 whistlenet/cache-node:latest" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# This script installs everything needed automatically

$ErrorActionPreference = "Stop"

# ASCII Art Header
Write-Host @"

╦ ╦╦ ╦╦╔═╗╔╦╗╦  ╔═╗  ╔╗╔╔═╗╔╦╗╦ ╦╔═╗╦═╗╦╔═
║║║╠═╣║╚═╗ ║ ║  ║╣   ║║║║╣  ║ ║║║║ ║╠╦╝╠╩╗
╚╩╝╩ ╩╩╚═╝ ╩ ╩═╝╚═╝  ╝╚╝╚═╝ ╩ ╚╩╝╚═╝╩╚═╩ ╩
     💰 Earn $50-500/month automatically 💰
     
"@ -ForegroundColor Cyan

# Simple prompts
Write-Host "Welcome! Let's get you earning SOL in 60 seconds." -ForegroundColor Green
Write-Host ""

# Get wallet
Write-Host "Step 1: What's your Solana wallet address?" -ForegroundColor Yellow
Write-Host "(This is where your earnings will be sent)" -ForegroundColor Gray
$wallet = Read-Host "Wallet"

if ($wallet.Length -lt 30) {
    Write-Host "That doesn't look like a valid wallet address. Please try again." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Wallet saved!" -ForegroundColor Green
Write-Host ""

# Auto-detect best location based on timezone
$timezone = (Get-TimeZone).Id
$location = "US-East"  # Default

if ($timezone -like "*Pacific*") { $location = "US-West" }
elseif ($timezone -like "*Central Europe*") { $location = "Europe" }
elseif ($timezone -like "*Asia*") { $location = "Asia" }

Write-Host "Step 2: We've selected '$location' as your location" -ForegroundColor Yellow
Write-Host "(Based on your timezone: $timezone)" -ForegroundColor Gray
$changeLocation = Read-Host "Press Enter to continue or type a different location (US-East/US-West/Europe/Asia)"
if ($changeLocation) { $location = $changeLocation }

Write-Host "✓ Location set to $location!" -ForegroundColor Green
Write-Host ""

# Check and install Docker if needed
Write-Host "Step 3: Checking requirements..." -ForegroundColor Yellow

$hasDocker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $hasDocker) {
    Write-Host "Docker not found. Installing Docker Desktop..." -ForegroundColor Cyan
    Write-Host "This will take 2-3 minutes..." -ForegroundColor Gray
    
    # Download Docker silently
    $dockerUrl = "https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe"
    $installerPath = "$env:TEMP\DockerInstaller.exe"
    
    Write-Host "Downloading Docker Desktop..." -ForegroundColor White
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $dockerUrl -OutFile $installerPath -UseBasicParsing
        
        Write-Host "Installing Docker Desktop (this window may freeze for a minute)..." -ForegroundColor White
        Start-Process -FilePath $installerPath -ArgumentList "install", "--quiet", "--accept-license" -Wait
        
        Write-Host "✓ Docker Desktop installed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Your computer needs to restart for Docker to work." -ForegroundColor Yellow
        Write-Host ""
        
        # Save config for after restart
        $configPath = "$env:USERPROFILE\Desktop\whistle-start.bat"
        @"
@echo off
echo Starting WHISTLE Cache Node...
docker run -d --name whistle-cache -e WALLET_ADDRESS=$wallet -e NODE_LOCATION=$location -p 8545:8545 --restart unless-stopped whistlenet/cache-node:latest
if %errorlevel% == 0 (
    echo SUCCESS! Your node is earning SOL!
    echo.
    echo View earnings: https://whistle.network/provider
    pause
) else (
    echo Docker is starting. Please wait 30 seconds and try again.
    pause
)
"@ | Out-File -FilePath $configPath -Encoding ASCII
        
        Write-Host "✅ Created 'whistle-start.bat' on your Desktop" -ForegroundColor Green
        Write-Host ""
        Write-Host "After restart:" -ForegroundColor Cyan
        Write-Host "1. Docker Desktop will start automatically" -ForegroundColor White
        Write-Host "2. Double-click 'whistle-start.bat' on your Desktop" -ForegroundColor White
        Write-Host "3. Start earning SOL!" -ForegroundColor White
        Write-Host ""
        
        $restart = Read-Host "Restart now? (Y/N)"
        if ($restart -eq "Y" -or $restart -eq "y") {
            Restart-Computer -Force
        } else {
            Write-Host "Please restart your computer manually and run 'whistle-start.bat' from Desktop" -ForegroundColor Yellow
        }
        exit 0
        
    } catch {
        Write-Host "Failed to download Docker. Please install manually from https://docker.com" -ForegroundColor Red
        Start-Process "https://docker.com"
        exit 1
    }
} else {
    Write-Host "✓ Docker is already installed!" -ForegroundColor Green
}

# Check if Docker is running
Write-Host ""
Write-Host "Starting Docker if needed..." -ForegroundColor Yellow

$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    # Try to start Docker Desktop
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Write-Host "Starting Docker Desktop..." -ForegroundColor Cyan
        Start-Process $dockerPath
        
        Write-Host "Waiting for Docker to start (up to 60 seconds)..." -ForegroundColor Gray
        $attempts = 0
        while ($attempts -lt 12) {
            Start-Sleep -Seconds 5
            $dockerRunning = docker info 2>$null
            if ($dockerRunning) { break }
            $attempts++
            Write-Host "." -NoNewline
        }
        Write-Host ""
    }
}

if (-not $dockerRunning) {
    Write-Host "⚠️  Docker Desktop needs to be running." -ForegroundColor Yellow
    Write-Host "Please start Docker Desktop manually (look for the whale icon)" -ForegroundColor White
    Write-Host "Then run this installer again." -ForegroundColor White
    pause
    exit 1
}

Write-Host "✓ Docker is running!" -ForegroundColor Green
Write-Host ""

# Install the cache node
Write-Host "Step 4: Installing your cache node..." -ForegroundColor Yellow

# Remove any existing container
docker stop whistle-cache 2>$null | Out-Null
docker rm whistle-cache 2>$null | Out-Null

# Run the cache node
Write-Host "Starting cache node..." -ForegroundColor Cyan
$result = docker run -d `
    --name whistle-cache `
    -e WALLET_ADDRESS=$wallet `
    -e NODE_LOCATION=$location `
    -p 8545:8545 `
    --restart unless-stopped `
    whistlenet/cache-node:latest 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "    🎉 SUCCESS! YOUR NODE IS EARNING SOL! 🎉" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Your Setup:" -ForegroundColor Cyan
    Write-Host "   Wallet: $wallet" -ForegroundColor White
    Write-Host "   Location: $location" -ForegroundColor White
    Write-Host "   Status: " -NoNewline
    Write-Host "EARNING" -ForegroundColor Green
    Write-Host ""
    
    Start-Sleep -Seconds 3
    
    # Show node status
    $status = docker ps --filter "name=whistle-cache" --format "table {{.Status}}" | Select-Object -Last 1
    Write-Host "🟢 Node Status: $status" -ForegroundColor Green
    Write-Host ""
    
    # Create desktop shortcuts
    Write-Host "Creating desktop shortcuts..." -ForegroundColor Yellow
    
    $desktop = [Environment]::GetFolderPath("Desktop")
    
    # View Logs shortcut
    $logsPath = "$desktop\WHISTLE - View Logs.bat"
    "@echo off`ndocker logs whistle-cache -f" | Out-File -FilePath $logsPath -Encoding ASCII
    
    # Check Earnings shortcut  
    $earningsPath = "$desktop\WHISTLE - Check Earnings.bat"
    "@echo off`ncurl http://localhost:8545/metrics`npause" | Out-File -FilePath $earningsPath -Encoding ASCII
    
    # Stop Node shortcut
    $stopPath = "$desktop\WHISTLE - Stop Node.bat"
    "@echo off`ndocker stop whistle-cache`necho Node stopped`npause" | Out-File -FilePath $stopPath -Encoding ASCII
    
    Write-Host "✓ Desktop shortcuts created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Check your Desktop for:" -ForegroundColor Cyan
    Write-Host "   • WHISTLE - View Logs (see what your node is doing)" -ForegroundColor White
    Write-Host "   • WHISTLE - Check Earnings (see how much you've earned)" -ForegroundColor White
    Write-Host "   • WHISTLE - Stop Node (pause earning if needed)" -ForegroundColor White
    Write-Host ""
    Write-Host "💰 Expected Earnings:" -ForegroundColor Yellow
    Write-Host "   • Per day: 0.7-3.5 SOL" -ForegroundColor White
    Write-Host "   • Per month: 21-105 SOL" -ForegroundColor White
    Write-Host "   • In USD: $50-500/month" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 View Dashboard: https://whistle.network/provider" -ForegroundColor Cyan
    Write-Host ""
    
    # Show initial logs
    Write-Host "📋 Node Logs (last 10 lines):" -ForegroundColor Yellow
    docker logs whistle-cache --tail 10
    
} else {
    Write-Host ""
    Write-Host "❌ Failed to start cache node" -ForegroundColor Red
    Write-Host "Error: $result" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running this command manually:" -ForegroundColor Yellow
    Write-Host "docker run -d --name whistle-cache -e WALLET_ADDRESS=$wallet -e NODE_LOCATION=$location -p 8545:8545 whistlenet/cache-node:latest" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
