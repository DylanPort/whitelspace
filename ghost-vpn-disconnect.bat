@echo off
TITLE Ghost VPN - Disconnect
color 0C

echo ========================================
echo    Ghost VPN - Disconnect
echo ========================================
echo.

echo [*] Checking permissions...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [+] Running with Administrator privileges
) else (
    echo [!] ERROR: This script requires Administrator privileges!
    echo [!] Please right-click and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo [*] Disabling system proxy...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyServer /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyOverride /f >nul 2>&1

if %errorLevel% == 0 (
    echo [+] Proxy disabled successfully!
) else (
    echo [!] ERROR: Failed to disable proxy
    pause
    exit /b 1
)

echo.
echo [*] Restarting browsers to apply changes...
taskkill /F /IM chrome.exe >nul 2>&1
taskkill /F /IM msedge.exe >nul 2>&1
taskkill /F /IM firefox.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo [+] Browsers closed

echo.
echo ========================================
echo    [SUCCESS] Ghost VPN Disconnected!
echo ========================================
echo.
echo Your browser is back to normal internet
echo All external resources should now load
echo.

pause

