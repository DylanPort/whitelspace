@echo off
REM Ghost VPN - One-Click Setup for Windows
REM This script automatically configures your browser to use Ghost VPN

echo ========================================
echo    Ghost VPN - One-Click Setup
echo ========================================
echo.

REM Get server IP from command line argument or use default
set SERVER_IP=%1
if "%SERVER_IP%"=="" set SERVER_IP=YOUR_SERVER_IP

echo [1/4] Checking system...
ping -n 1 %SERVER_IP% >nul 2>&1
if errorlevel 1 (
    echo ERROR: Cannot reach VPN server at %SERVER_IP%
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)
echo ✓ VPN server is reachable

echo.
echo [2/4] Detecting browsers...
set CHROME_FOUND=0
set EDGE_FOUND=0
set FIREFOX_FOUND=0

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set CHROME_FOUND=1
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set CHROME_FOUND=1
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set CHROME_FOUND=1

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set EDGE_FOUND=1
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set EDGE_FOUND=1

if exist "%ProgramFiles%\Mozilla Firefox\firefox.exe" set FIREFOX_FOUND=1
if exist "%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe" set FIREFOX_FOUND=1

if %CHROME_FOUND%==1 echo ✓ Chrome detected
if %EDGE_FOUND%==1 echo ✓ Edge detected
if %FIREFOX_FOUND%==1 echo ✓ Firefox detected

echo.
echo [3/4] Configuring SOCKS5 proxy...
echo Proxy: %SERVER_IP%:1080

REM Create registry file for Chrome/Edge proxy
echo Windows Registry Editor Version 5.00 > "%TEMP%\ghost-vpn-proxy.reg"
echo. >> "%TEMP%\ghost-vpn-proxy.reg"
echo [HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Internet Settings] >> "%TEMP%\ghost-vpn-proxy.reg"
echo "ProxyEnable"=dword:00000001 >> "%TEMP%\ghost-vpn-proxy.reg"
echo "ProxyServer"="socks=%SERVER_IP%:1080" >> "%TEMP%\ghost-vpn-proxy.reg"
echo "ProxyOverride"="<local>" >> "%TEMP%\ghost-vpn-proxy.reg"

REM Apply registry settings
reg import "%TEMP%\ghost-vpn-proxy.reg" >nul 2>&1
if errorlevel 1 (
    echo ⚠ Need administrator rights to apply system-wide settings
    echo Attempting to elevate permissions...
    powershell -Command "Start-Process '%~f0' -Verb RunAs -ArgumentList '%SERVER_IP%'"
    exit /b
)

echo ✓ System proxy configured

REM Kill browser processes to apply settings
echo.
echo [4/4] Applying settings...
taskkill /F /IM chrome.exe >nul 2>&1
taskkill /F /IM msedge.exe >nul 2>&1
taskkill /F /IM firefox.exe >nul 2>&1
timeout /t 2 >nul

echo ✓ Settings applied

echo.
echo ========================================
echo    ✓ Ghost VPN Setup Complete!
echo ========================================
echo.
echo Your browser is now configured to use:
echo   SOCKS5 Proxy: %SERVER_IP%:1080
echo.
echo Testing connection...
ping -n 1 %SERVER_IP% >nul 2>&1
if errorlevel 1 (
    echo ⚠ Warning: VPN server not responding
) else (
    echo ✓ VPN connection active!
)

echo.
echo What's next:
echo 1. Open your browser (Chrome/Edge/Firefox)
echo 2. Visit https://whatismyip.com to verify
echo 3. Your IP should show: %SERVER_IP%
echo.
echo To disconnect: Run "ghost-vpn-disconnect.bat"
echo.

REM Create disconnect script
echo @echo off > ghost-vpn-disconnect.bat
echo echo Disconnecting Ghost VPN... >> ghost-vpn-disconnect.bat
echo reg delete "HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable /f ^>nul 2^>^&1 >> ghost-vpn-disconnect.bat
echo reg delete "HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyServer /f ^>nul 2^>^&1 >> ghost-vpn-disconnect.bat
echo echo ✓ Ghost VPN disconnected >> ghost-vpn-disconnect.bat
echo pause >> ghost-vpn-disconnect.bat

echo [Disconnect script created: ghost-vpn-disconnect.bat]

REM Open browser to test
echo.
set /p OPEN_BROWSER="Open browser now to test? (Y/N): "
if /i "%OPEN_BROWSER%"=="Y" (
    if %CHROME_FOUND%==1 (
        start chrome.exe https://whatismyip.com
    ) else if %EDGE_FOUND%==1 (
        start msedge.exe https://whatismyip.com
    ) else if %FIREFOX_FOUND%==1 (
        start firefox.exe https://whatismyip.com
    )
)

echo.
pause


