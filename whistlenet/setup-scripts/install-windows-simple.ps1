# WHISTLE Cache Node Setup Script for Windows (Simplified)
# Run this script in PowerShell as Administrator

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "     WHISTLE Cache Node Setup - Windows              " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerInstalled) {
    Write-Host ""
    Write-Host "Docker is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe" -ForegroundColor Cyan
    Write-Host "2. Install Docker Desktop" -ForegroundColor Cyan
    Write-Host "3. Restart your computer" -ForegroundColor Cyan
    Write-Host "4. Run this script again" -ForegroundColor Cyan
    Write-Host ""
    
    $openBrowser = Read-Host "Open Docker download page now? (Y/N)"
    if ($openBrowser -eq "Y" -or $openBrowser -eq "y") {
        Start-Process "https://www.docker.com/products/docker-desktop/"
    }
    
    pause
    exit 1
}

Write-Host "Docker is installed!" -ForegroundColor Green
docker --version

# Check if Docker is running
Write-Host ""
Write-Host "Checking if Docker is running..." -ForegroundColor Yellow

$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "Docker is not running. Trying to start Docker Desktop..." -ForegroundColor Yellow
    
    # Try to start Docker Desktop
    $dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktopPath) {
        Start-Process $dockerDesktopPath
        Write-Host "Waiting for Docker to start (this may take a minute)..." -ForegroundColor Yellow
        
        $attempts = 0
        while ((-not (docker info 2>$null)) -and ($attempts -lt 12)) {
            Start-Sleep -Seconds 5
            $attempts++
            Write-Host "." -NoNewline
        }
        Write-Host ""
    }
    
    # Check again
    $dockerRunning = docker info 2>$null
    if (-not $dockerRunning) {
        Write-Host ""
        Write-Host "Docker is not running!" -ForegroundColor Red
        Write-Host "Please start Docker Desktop manually and run this script again." -ForegroundColor Yellow
        pause
        exit 1
    }
}

Write-Host "Docker is running!" -ForegroundColor Green

# Get wallet address
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "                 WALLET CONFIGURATION                " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Enter your Solana wallet address" -ForegroundColor Yellow
Write-Host "(This is where your earnings will be tracked)" -ForegroundColor Gray
$wallet = Read-Host "Wallet Address"

if ([string]::IsNullOrWhiteSpace($wallet)) {
    Write-Host "Wallet address is required!" -ForegroundColor Red
    pause
    exit 1
}

# Choose location
Write-Host ""
Write-Host "Select your geographic location:" -ForegroundColor Yellow
Write-Host "1. US-East" -ForegroundColor White
Write-Host "2. US-West" -ForegroundColor White
Write-Host "3. Europe" -ForegroundColor White
Write-Host "4. Asia" -ForegroundColor White
Write-Host "5. Other" -ForegroundColor White
Write-Host ""

$locationChoice = Read-Host "Enter choice (1-5)"
$location = switch ($locationChoice) {
    "1" { "US-East" }
    "2" { "US-West" }
    "3" { "Europe" }
    "4" { "Asia" }
    default { "Global" }
}

Write-Host "Location set to: $location" -ForegroundColor Green

# Stop existing container if running
Write-Host ""
Write-Host "Checking for existing cache node..." -ForegroundColor Yellow

$existingContainer = docker ps -a --filter "name=whistle-cache" --format "{{.Names}}" 2>$null
if ($existingContainer) {
    Write-Host "Stopping existing cache node..." -ForegroundColor Yellow
    docker stop whistle-cache 2>$null | Out-Null
    docker rm whistle-cache 2>$null | Out-Null
    Write-Host "Existing node removed" -ForegroundColor Green
}

# Run the cache node
Write-Host ""
Write-Host "Starting WHISTLE cache node..." -ForegroundColor Yellow
Write-Host ""

$runCommand = "docker run -d --name whistle-cache -e WALLET_ADDRESS=$wallet -e NODE_LOCATION=$location -p 8545:8545 --restart unless-stopped --memory=`"2g`" --cpus=`"1`" whistlenet/cache-node:latest"

Write-Host "Running command:" -ForegroundColor Cyan
Write-Host $runCommand -ForegroundColor Gray
Write-Host ""

# Execute the command
$result = Invoke-Expression $runCommand 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host "           CACHE NODE STARTED SUCCESSFULLY!          " -ForegroundColor Green
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host ""
    
    # Wait a moment for container to start
    Start-Sleep -Seconds 3
    
    # Show container status
    Write-Host "Container Status:" -ForegroundColor Yellow
    docker ps --filter "name=whistle-cache" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"
    
    Write-Host ""
    Write-Host "Your cache node is now running and earning SOL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Useful Commands:" -ForegroundColor Cyan
    Write-Host "  View logs:    docker logs whistle-cache -f" -ForegroundColor White
    Write-Host "  Check stats:  curl http://localhost:8545/metrics" -ForegroundColor White
    Write-Host "  Stop node:    docker stop whistle-cache" -ForegroundColor White
    Write-Host "  Start node:   docker start whistle-cache" -ForegroundColor White
    Write-Host ""
    Write-Host "Dashboard: https://whistle.network/provider" -ForegroundColor Cyan
    Write-Host "(Use your wallet address to track earnings)" -ForegroundColor Gray
    Write-Host ""
    
    # Show initial logs
    Write-Host "Initial Node Logs:" -ForegroundColor Yellow
    docker logs whistle-cache --tail 10
    
} else {
    Write-Host ""
    Write-Host "Failed to start cache node!" -ForegroundColor Red
    Write-Host "Error: $result" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. Docker not running - Start Docker Desktop" -ForegroundColor White
    Write-Host "2. Port 8545 in use - Close other applications using this port" -ForegroundColor White
    Write-Host "3. Not enough resources - Check Docker Desktop settings" -ForegroundColor White
}

Write-Host ""
pause

# Run this script in PowerShell as Administrator

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "     WHISTLE Cache Node Setup - Windows              " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerInstalled) {
    Write-Host ""
    Write-Host "Docker is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe" -ForegroundColor Cyan
    Write-Host "2. Install Docker Desktop" -ForegroundColor Cyan
    Write-Host "3. Restart your computer" -ForegroundColor Cyan
    Write-Host "4. Run this script again" -ForegroundColor Cyan
    Write-Host ""
    
    $openBrowser = Read-Host "Open Docker download page now? (Y/N)"
    if ($openBrowser -eq "Y" -or $openBrowser -eq "y") {
        Start-Process "https://www.docker.com/products/docker-desktop/"
    }
    
    pause
    exit 1
}

Write-Host "Docker is installed!" -ForegroundColor Green
docker --version

# Check if Docker is running
Write-Host ""
Write-Host "Checking if Docker is running..." -ForegroundColor Yellow

$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "Docker is not running. Trying to start Docker Desktop..." -ForegroundColor Yellow
    
    # Try to start Docker Desktop
    $dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktopPath) {
        Start-Process $dockerDesktopPath
        Write-Host "Waiting for Docker to start (this may take a minute)..." -ForegroundColor Yellow
        
        $attempts = 0
        while ((-not (docker info 2>$null)) -and ($attempts -lt 12)) {
            Start-Sleep -Seconds 5
            $attempts++
            Write-Host "." -NoNewline
        }
        Write-Host ""
    }
    
    # Check again
    $dockerRunning = docker info 2>$null
    if (-not $dockerRunning) {
        Write-Host ""
        Write-Host "Docker is not running!" -ForegroundColor Red
        Write-Host "Please start Docker Desktop manually and run this script again." -ForegroundColor Yellow
        pause
        exit 1
    }
}

Write-Host "Docker is running!" -ForegroundColor Green

# Get wallet address
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "                 WALLET CONFIGURATION                " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Enter your Solana wallet address" -ForegroundColor Yellow
Write-Host "(This is where your earnings will be tracked)" -ForegroundColor Gray
$wallet = Read-Host "Wallet Address"

if ([string]::IsNullOrWhiteSpace($wallet)) {
    Write-Host "Wallet address is required!" -ForegroundColor Red
    pause
    exit 1
}

# Choose location
Write-Host ""
Write-Host "Select your geographic location:" -ForegroundColor Yellow
Write-Host "1. US-East" -ForegroundColor White
Write-Host "2. US-West" -ForegroundColor White
Write-Host "3. Europe" -ForegroundColor White
Write-Host "4. Asia" -ForegroundColor White
Write-Host "5. Other" -ForegroundColor White
Write-Host ""

$locationChoice = Read-Host "Enter choice (1-5)"
$location = switch ($locationChoice) {
    "1" { "US-East" }
    "2" { "US-West" }
    "3" { "Europe" }
    "4" { "Asia" }
    default { "Global" }
}

Write-Host "Location set to: $location" -ForegroundColor Green

# Stop existing container if running
Write-Host ""
Write-Host "Checking for existing cache node..." -ForegroundColor Yellow

$existingContainer = docker ps -a --filter "name=whistle-cache" --format "{{.Names}}" 2>$null
if ($existingContainer) {
    Write-Host "Stopping existing cache node..." -ForegroundColor Yellow
    docker stop whistle-cache 2>$null | Out-Null
    docker rm whistle-cache 2>$null | Out-Null
    Write-Host "Existing node removed" -ForegroundColor Green
}

# Run the cache node
Write-Host ""
Write-Host "Starting WHISTLE cache node..." -ForegroundColor Yellow
Write-Host ""

$runCommand = "docker run -d --name whistle-cache -e WALLET_ADDRESS=$wallet -e NODE_LOCATION=$location -p 8545:8545 --restart unless-stopped --memory=`"2g`" --cpus=`"1`" whistlenet/cache-node:latest"

Write-Host "Running command:" -ForegroundColor Cyan
Write-Host $runCommand -ForegroundColor Gray
Write-Host ""

# Execute the command
$result = Invoke-Expression $runCommand 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host "           CACHE NODE STARTED SUCCESSFULLY!          " -ForegroundColor Green
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host ""
    
    # Wait a moment for container to start
    Start-Sleep -Seconds 3
    
    # Show container status
    Write-Host "Container Status:" -ForegroundColor Yellow
    docker ps --filter "name=whistle-cache" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"
    
    Write-Host ""
    Write-Host "Your cache node is now running and earning SOL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Useful Commands:" -ForegroundColor Cyan
    Write-Host "  View logs:    docker logs whistle-cache -f" -ForegroundColor White
    Write-Host "  Check stats:  curl http://localhost:8545/metrics" -ForegroundColor White
    Write-Host "  Stop node:    docker stop whistle-cache" -ForegroundColor White
    Write-Host "  Start node:   docker start whistle-cache" -ForegroundColor White
    Write-Host ""
    Write-Host "Dashboard: https://whistle.network/provider" -ForegroundColor Cyan
    Write-Host "(Use your wallet address to track earnings)" -ForegroundColor Gray
    Write-Host ""
    
    # Show initial logs
    Write-Host "Initial Node Logs:" -ForegroundColor Yellow
    docker logs whistle-cache --tail 10
    
} else {
    Write-Host ""
    Write-Host "Failed to start cache node!" -ForegroundColor Red
    Write-Host "Error: $result" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. Docker not running - Start Docker Desktop" -ForegroundColor White
    Write-Host "2. Port 8545 in use - Close other applications using this port" -ForegroundColor White
    Write-Host "3. Not enough resources - Check Docker Desktop settings" -ForegroundColor White
}

Write-Host ""
pause
