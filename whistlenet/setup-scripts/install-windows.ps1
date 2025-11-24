# WHISTLE Cache Node Setup Script for Windows
# Run this script in PowerShell as Administrator

Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         WHISTLE Cache Node Setup - Windows               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Function to check if running as Administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check if running as Administrator
if (-not (Test-Administrator)) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

# Step 1: Check if Docker is installed
Write-Host "Step 1: Checking Docker installation..." -ForegroundColor Yellow
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if ($dockerInstalled) {
    Write-Host "✅ Docker is already installed" -ForegroundColor Green
    docker --version
} else {
    Write-Host "📦 Docker not found. Installing Docker Desktop..." -ForegroundColor Yellow
    
    # Check if Chocolatey is installed
    $chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue
    
    if ($chocoInstalled) {
        Write-Host "Installing Docker Desktop via Chocolatey..." -ForegroundColor Cyan
        choco install docker-desktop -y
    } else {
        Write-Host "Downloading Docker Desktop installer..." -ForegroundColor Cyan
        $dockerUrl = "https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe"
        $installerPath = "$env:TEMP\DockerDesktopInstaller.exe"
        
        try {
            Invoke-WebRequest -Uri $dockerUrl -OutFile $installerPath
            Write-Host "Starting Docker Desktop installation..." -ForegroundColor Cyan
            Start-Process -FilePath $installerPath -Wait
            Remove-Item $installerPath
            Write-Host "✅ Docker Desktop installed successfully" -ForegroundColor Green
            Write-Host "⚠️  Please restart your computer and run this script again" -ForegroundColor Yellow
            pause
            exit 0
        } catch {
            Write-Host "❌ Failed to download Docker Desktop" -ForegroundColor Red
            Write-Host "Please install Docker Desktop manually from: https://docker.com" -ForegroundColor Yellow
            pause
            exit 1
        }
    }
}

# Step 2: Start Docker Desktop if not running
Write-Host ""
Write-Host "Step 2: Starting Docker Desktop..." -ForegroundColor Yellow
$dockerRunning = docker info 2>$null

if (-not $dockerRunning) {
    Write-Host "Starting Docker Desktop..." -ForegroundColor Cyan
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
    
    Write-Host "Waiting for Docker to start (this may take a minute)..." -ForegroundColor Yellow
    $timeout = 60
    $elapsed = 0
    
    while ((-not (docker info 2>$null)) -and ($elapsed -lt $timeout)) {
        Start-Sleep -Seconds 5
        $elapsed += 5
        Write-Host "." -NoNewline
    }
    
    if ($elapsed -ge $timeout) {
        Write-Host ""
        Write-Host "❌ Docker failed to start. Please start Docker Desktop manually." -ForegroundColor Red
        pause
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Docker is running" -ForegroundColor Green

# Step 3: Get wallet address
Write-Host ""
Write-Host "Step 3: Configure your wallet" -ForegroundColor Yellow
$wallet = Read-Host "Enter your Solana wallet address"

if ([string]::IsNullOrWhiteSpace($wallet)) {
    Write-Host "❌ Wallet address is required" -ForegroundColor Red
    pause
    exit 1
}

# Step 4: Choose location
Write-Host ""
Write-Host "Step 4: Select your geographic location" -ForegroundColor Yellow
Write-Host "1. US-East" -ForegroundColor White
Write-Host "2. US-West" -ForegroundColor White
Write-Host "3. Europe" -ForegroundColor White
Write-Host "4. Asia" -ForegroundColor White
Write-Host "5. Other" -ForegroundColor White

$locationChoice = Read-Host "Enter choice (1-5)"
$location = switch ($locationChoice) {
    "1" { "US-East" }
    "2" { "US-West" }
    "3" { "Europe" }
    "4" { "Asia" }
    default { "Global" }
}

# Step 5: Stop existing container if running
Write-Host ""
Write-Host "Step 5: Checking for existing cache node..." -ForegroundColor Yellow
$existingContainer = docker ps -a --filter "name=whistle-cache" --format "{{.Names}}" 2>$null

if ($existingContainer) {
    Write-Host "Stopping existing cache node..." -ForegroundColor Yellow
    docker stop whistle-cache 2>$null | Out-Null
    docker rm whistle-cache 2>$null | Out-Null
    Write-Host "✅ Existing node stopped" -ForegroundColor Green
}

# Step 6: Run the cache node
Write-Host ""
Write-Host "Step 6: Starting WHISTLE cache node..." -ForegroundColor Yellow

$runCommand = @"
docker run -d `
  --name whistle-cache `
  -e WALLET_ADDRESS=$wallet `
  -e NODE_LOCATION=$location `
  -p 8545:8545 `
  --restart unless-stopped `
  --memory="2g" `
  --cpus="1" `
  whistlenet/cache-node:latest
"@

Write-Host "Running command:" -ForegroundColor Cyan
Write-Host $runCommand -ForegroundColor White

try {
    $result = Invoke-Expression $runCommand 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Cache node started successfully!" -ForegroundColor Green
        
        # Wait a moment for container to start
        Start-Sleep -Seconds 3
        
        # Show container status
        Write-Host ""
        Write-Host "Container Status:" -ForegroundColor Yellow
        docker ps --filter "name=whistle-cache" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        # Show logs
        Write-Host ""
        Write-Host "Node Logs:" -ForegroundColor Yellow
        docker logs whistle-cache --tail 20
        
        Write-Host ""
        Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║              🎉 Setup Complete!                          ║" -ForegroundColor Green
        Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Green
        Write-Host "║  Your cache node is now running and earning SOL!         ║" -ForegroundColor Green
        Write-Host "║                                                          ║" -ForegroundColor Green
        Write-Host "║  Monitor your node:                                      ║" -ForegroundColor Green
        Write-Host "║  > Logs: docker logs whistle-cache                       ║" -ForegroundColor Green
        Write-Host "║  > Stats: curl http://localhost:8545/metrics             ║" -ForegroundColor Green
        Write-Host "║  > Stop: docker stop whistle-cache                       ║" -ForegroundColor Green
        Write-Host "║                                                          ║" -ForegroundColor Green
        Write-Host "║  Dashboard: https://whistle.network/provider             ║" -ForegroundColor Green
        Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
        
        # Create desktop shortcut
        Write-Host ""
        $createShortcut = Read-Host "Create desktop shortcut for monitoring? (Y/N)"
        if ($createShortcut -eq "Y" -or $createShortcut -eq "y") {
            $desktopPath = [Environment]::GetFolderPath("Desktop")
            $shortcutPath = "$desktopPath\WHISTLE Node Monitor.lnk"
            
            $shell = New-Object -ComObject WScript.Shell
            $shortcut = $shell.CreateShortcut($shortcutPath)
            $shortcut.TargetPath = "powershell.exe"
            $shortcut.Arguments = "-NoExit -Command `"docker logs whistle-cache --tail 50 --follow`""
            $shortcut.IconLocation = "C:\Windows\System32\cmd.exe"
            $shortcut.Save()
            
            Write-Host "✅ Desktop shortcut created" -ForegroundColor Green
        }
        
    } else {
        Write-Host "❌ Failed to start cache node" -ForegroundColor Red
        Write-Host "Error: $result" -ForegroundColor Red
    }
} catch {
        Write-Host "Error starting cache node: $_" -ForegroundColor Red
}

Write-Host ""
pause


Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         WHISTLE Cache Node Setup - Windows               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Function to check if running as Administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check if running as Administrator
if (-not (Test-Administrator)) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

# Step 1: Check if Docker is installed
Write-Host "Step 1: Checking Docker installation..." -ForegroundColor Yellow
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if ($dockerInstalled) {
    Write-Host "✅ Docker is already installed" -ForegroundColor Green
    docker --version
} else {
    Write-Host "📦 Docker not found. Installing Docker Desktop..." -ForegroundColor Yellow
    
    # Check if Chocolatey is installed
    $chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue
    
    if ($chocoInstalled) {
        Write-Host "Installing Docker Desktop via Chocolatey..." -ForegroundColor Cyan
        choco install docker-desktop -y
    } else {
        Write-Host "Downloading Docker Desktop installer..." -ForegroundColor Cyan
        $dockerUrl = "https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe"
        $installerPath = "$env:TEMP\DockerDesktopInstaller.exe"
        
        try {
            Invoke-WebRequest -Uri $dockerUrl -OutFile $installerPath
            Write-Host "Starting Docker Desktop installation..." -ForegroundColor Cyan
            Start-Process -FilePath $installerPath -Wait
            Remove-Item $installerPath
            Write-Host "✅ Docker Desktop installed successfully" -ForegroundColor Green
            Write-Host "⚠️  Please restart your computer and run this script again" -ForegroundColor Yellow
            pause
            exit 0
        } catch {
            Write-Host "❌ Failed to download Docker Desktop" -ForegroundColor Red
            Write-Host "Please install Docker Desktop manually from: https://docker.com" -ForegroundColor Yellow
            pause
            exit 1
        }
    }
}

# Step 2: Start Docker Desktop if not running
Write-Host ""
Write-Host "Step 2: Starting Docker Desktop..." -ForegroundColor Yellow
$dockerRunning = docker info 2>$null

if (-not $dockerRunning) {
    Write-Host "Starting Docker Desktop..." -ForegroundColor Cyan
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
    
    Write-Host "Waiting for Docker to start (this may take a minute)..." -ForegroundColor Yellow
    $timeout = 60
    $elapsed = 0
    
    while ((-not (docker info 2>$null)) -and ($elapsed -lt $timeout)) {
        Start-Sleep -Seconds 5
        $elapsed += 5
        Write-Host "." -NoNewline
    }
    
    if ($elapsed -ge $timeout) {
        Write-Host ""
        Write-Host "❌ Docker failed to start. Please start Docker Desktop manually." -ForegroundColor Red
        pause
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Docker is running" -ForegroundColor Green

# Step 3: Get wallet address
Write-Host ""
Write-Host "Step 3: Configure your wallet" -ForegroundColor Yellow
$wallet = Read-Host "Enter your Solana wallet address"

if ([string]::IsNullOrWhiteSpace($wallet)) {
    Write-Host "❌ Wallet address is required" -ForegroundColor Red
    pause
    exit 1
}

# Step 4: Choose location
Write-Host ""
Write-Host "Step 4: Select your geographic location" -ForegroundColor Yellow
Write-Host "1. US-East" -ForegroundColor White
Write-Host "2. US-West" -ForegroundColor White
Write-Host "3. Europe" -ForegroundColor White
Write-Host "4. Asia" -ForegroundColor White
Write-Host "5. Other" -ForegroundColor White

$locationChoice = Read-Host "Enter choice (1-5)"
$location = switch ($locationChoice) {
    "1" { "US-East" }
    "2" { "US-West" }
    "3" { "Europe" }
    "4" { "Asia" }
    default { "Global" }
}

# Step 5: Stop existing container if running
Write-Host ""
Write-Host "Step 5: Checking for existing cache node..." -ForegroundColor Yellow
$existingContainer = docker ps -a --filter "name=whistle-cache" --format "{{.Names}}" 2>$null

if ($existingContainer) {
    Write-Host "Stopping existing cache node..." -ForegroundColor Yellow
    docker stop whistle-cache 2>$null | Out-Null
    docker rm whistle-cache 2>$null | Out-Null
    Write-Host "✅ Existing node stopped" -ForegroundColor Green
}

# Step 6: Run the cache node
Write-Host ""
Write-Host "Step 6: Starting WHISTLE cache node..." -ForegroundColor Yellow

$runCommand = @"
docker run -d `
  --name whistle-cache `
  -e WALLET_ADDRESS=$wallet `
  -e NODE_LOCATION=$location `
  -p 8545:8545 `
  --restart unless-stopped `
  --memory="2g" `
  --cpus="1" `
  whistlenet/cache-node:latest
"@

Write-Host "Running command:" -ForegroundColor Cyan
Write-Host $runCommand -ForegroundColor White

try {
    $result = Invoke-Expression $runCommand 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Cache node started successfully!" -ForegroundColor Green
        
        # Wait a moment for container to start
        Start-Sleep -Seconds 3
        
        # Show container status
        Write-Host ""
        Write-Host "Container Status:" -ForegroundColor Yellow
        docker ps --filter "name=whistle-cache" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        # Show logs
        Write-Host ""
        Write-Host "Node Logs:" -ForegroundColor Yellow
        docker logs whistle-cache --tail 20
        
        Write-Host ""
        Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║              🎉 Setup Complete!                          ║" -ForegroundColor Green
        Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Green
        Write-Host "║  Your cache node is now running and earning SOL!         ║" -ForegroundColor Green
        Write-Host "║                                                          ║" -ForegroundColor Green
        Write-Host "║  Monitor your node:                                      ║" -ForegroundColor Green
        Write-Host "║  > Logs: docker logs whistle-cache                       ║" -ForegroundColor Green
        Write-Host "║  > Stats: curl http://localhost:8545/metrics             ║" -ForegroundColor Green
        Write-Host "║  > Stop: docker stop whistle-cache                       ║" -ForegroundColor Green
        Write-Host "║                                                          ║" -ForegroundColor Green
        Write-Host "║  Dashboard: https://whistle.network/provider             ║" -ForegroundColor Green
        Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
        
        # Create desktop shortcut
        Write-Host ""
        $createShortcut = Read-Host "Create desktop shortcut for monitoring? (Y/N)"
        if ($createShortcut -eq "Y" -or $createShortcut -eq "y") {
            $desktopPath = [Environment]::GetFolderPath("Desktop")
            $shortcutPath = "$desktopPath\WHISTLE Node Monitor.lnk"
            
            $shell = New-Object -ComObject WScript.Shell
            $shortcut = $shell.CreateShortcut($shortcutPath)
            $shortcut.TargetPath = "powershell.exe"
            $shortcut.Arguments = "-NoExit -Command `"docker logs whistle-cache --tail 50 --follow`""
            $shortcut.IconLocation = "C:\Windows\System32\cmd.exe"
            $shortcut.Save()
            
            Write-Host "✅ Desktop shortcut created" -ForegroundColor Green
        }
        
    } else {
        Write-Host "❌ Failed to start cache node" -ForegroundColor Red
        Write-Host "Error: $result" -ForegroundColor Red
    }
} catch {
        Write-Host "Error starting cache node: $_" -ForegroundColor Red
}

Write-Host ""
pause
