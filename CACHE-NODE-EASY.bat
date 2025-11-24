@echo off
color 0A
cls

echo  ============================================
echo      WHISTLE CACHE NODE - EASY START
echo      No Port Conflicts - Uses Port 8546
echo  ============================================
echo.

:: Hardcode your wallet here to make it even easier
:: Replace this with your actual wallet address
set WALLET=7BZQtBPn2yotP2vAWNi3Vf2SPNq7Ffrs1Ti5FVUAEkHr

echo  Your Wallet: %WALLET%
echo.
echo  Starting cache node on port 8546...
echo.

:: Clean up any old container
docker stop whistle-cache 2>nul
docker rm whistle-cache 2>nul

:: Start the node on port 8546 (avoiding common port conflicts)
docker run -d --name whistle-cache -e WALLET_ADDRESS=%WALLET% -p 8546:8545 whistlenet/cache-node:latest

if %errorlevel% == 0 (
    echo.
    echo  ============================================
    echo       SUCCESS! NODE IS EARNING SOL!
    echo  ============================================
    echo.
    echo  Check metrics: http://localhost:8546/metrics
    echo  View logs: docker logs whistle-cache -f
    echo.
    echo  Earnings: $50-500/month
    echo.
) else (
    echo.
    echo  ERROR: Make sure Docker Desktop is running!
    echo.
)

pause

color 0A
cls

echo  ============================================
echo      WHISTLE CACHE NODE - EASY START
echo      No Port Conflicts - Uses Port 8546
echo  ============================================
echo.

:: Hardcode your wallet here to make it even easier
:: Replace this with your actual wallet address
set WALLET=7BZQtBPn2yotP2vAWNi3Vf2SPNq7Ffrs1Ti5FVUAEkHr

echo  Your Wallet: %WALLET%
echo.
echo  Starting cache node on port 8546...
echo.

:: Clean up any old container
docker stop whistle-cache 2>nul
docker rm whistle-cache 2>nul

:: Start the node on port 8546 (avoiding common port conflicts)
docker run -d --name whistle-cache -e WALLET_ADDRESS=%WALLET% -p 8546:8545 whistlenet/cache-node:latest

if %errorlevel% == 0 (
    echo.
    echo  ============================================
    echo       SUCCESS! NODE IS EARNING SOL!
    echo  ============================================
    echo.
    echo  Check metrics: http://localhost:8546/metrics
    echo  View logs: docker logs whistle-cache -f
    echo.
    echo  Earnings: $50-500/month
    echo.
) else (
    echo.
    echo  ERROR: Make sure Docker Desktop is running!
    echo.
)

pause
