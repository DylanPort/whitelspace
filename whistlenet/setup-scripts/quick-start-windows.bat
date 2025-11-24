@echo off
echo.
echo =====================================================
echo      WHISTLE Cache Node - Quick Start
echo =====================================================
echo.

REM Check if wallet address was provided
if "%1"=="" (
    echo Usage: quick-start-windows.bat YOUR_WALLET_ADDRESS
    echo.
    echo Example:
    echo   quick-start-windows.bat 7xKXtg2CW87d9VRZ17kiV5vCpUJFhHJpRVZcQhNiJFHC
    echo.
    pause
    exit /b 1
)

set WALLET=%1
set LOCATION=US-East

echo Wallet: %WALLET%
echo Location: %LOCATION%
echo.

echo Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop first
    pause
    exit /b 1
)

echo Stopping any existing cache node...
docker stop whistle-cache >nul 2>&1
docker rm whistle-cache >nul 2>&1

echo Starting WHISTLE cache node...
docker run -d ^
  --name whistle-cache ^
  -e WALLET_ADDRESS=%WALLET% ^
  -e NODE_LOCATION=%LOCATION% ^
  -p 8545:8545 ^
  --restart unless-stopped ^
  --memory="2g" ^
  --cpus="1" ^
  whistlenet/cache-node:latest

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start cache node
    echo Make sure Docker Desktop is running
    pause
    exit /b 1
)

echo.
echo =====================================================
echo         CACHE NODE STARTED SUCCESSFULLY!
echo =====================================================
echo.
echo Your node is now running and earning SOL!
echo.
echo Commands:
echo   View logs:  docker logs whistle-cache -f
echo   Stop node:  docker stop whistle-cache
echo   Stats:      curl http://localhost:8545/metrics
echo.

timeout /t 3 >nul
echo Showing initial logs:
echo.
docker logs whistle-cache --tail 10

echo.
pause

echo.
echo =====================================================
echo      WHISTLE Cache Node - Quick Start
echo =====================================================
echo.

REM Check if wallet address was provided
if "%1"=="" (
    echo Usage: quick-start-windows.bat YOUR_WALLET_ADDRESS
    echo.
    echo Example:
    echo   quick-start-windows.bat 7xKXtg2CW87d9VRZ17kiV5vCpUJFhHJpRVZcQhNiJFHC
    echo.
    pause
    exit /b 1
)

set WALLET=%1
set LOCATION=US-East

echo Wallet: %WALLET%
echo Location: %LOCATION%
echo.

echo Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop first
    pause
    exit /b 1
)

echo Stopping any existing cache node...
docker stop whistle-cache >nul 2>&1
docker rm whistle-cache >nul 2>&1

echo Starting WHISTLE cache node...
docker run -d ^
  --name whistle-cache ^
  -e WALLET_ADDRESS=%WALLET% ^
  -e NODE_LOCATION=%LOCATION% ^
  -p 8545:8545 ^
  --restart unless-stopped ^
  --memory="2g" ^
  --cpus="1" ^
  whistlenet/cache-node:latest

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start cache node
    echo Make sure Docker Desktop is running
    pause
    exit /b 1
)

echo.
echo =====================================================
echo         CACHE NODE STARTED SUCCESSFULLY!
echo =====================================================
echo.
echo Your node is now running and earning SOL!
echo.
echo Commands:
echo   View logs:  docker logs whistle-cache -f
echo   Stop node:  docker stop whistle-cache
echo   Stats:      curl http://localhost:8545/metrics
echo.

timeout /t 3 >nul
echo Showing initial logs:
echo.
docker logs whistle-cache --tail 10

echo.
pause
