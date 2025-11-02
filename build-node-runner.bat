@echo off
REM Ghost Whistle Node Runner - Build Script (Windows)
REM Creates standalone executables for Linux, Windows, and macOS

echo ========================================
echo Ghost Whistle Node Runner - Build Script
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [INFO] Building executables...
echo.

REM Create dist directory
if not exist dist mkdir dist

echo Select build option:
echo 1) Build Linux executable
echo 2) Build Windows executable
echo 3) Build macOS executable
echo 4) Build all platforms
echo.
set /p choice="Enter choice [1-4]: "

if "%choice%"=="1" (
    echo [INFO] Building Linux executable...
    call npm run build:linux
    echo [SUCCESS] Linux executable created: .\dist\ghost-node-runner-linux
) else if "%choice%"=="2" (
    echo [INFO] Building Windows executable...
    call npm run build:windows
    echo [SUCCESS] Windows executable created: .\dist\ghost-node-runner-win.exe
) else if "%choice%"=="3" (
    echo [INFO] Building macOS executable...
    call npm run build:macos
    echo [SUCCESS] macOS executable created: .\dist\ghost-node-runner-macos
) else if "%choice%"=="4" (
    echo [INFO] Building all platforms...
    call npm run build:node-runner
    echo [SUCCESS] All executables created in .\dist\ directory
) else (
    echo [ERROR] Invalid choice
    pause
    exit /b 1
)

echo.
echo ========================================
echo [SUCCESS] Build complete!
echo.
echo Executables location: .\dist\
echo.
echo To run the node:
echo   Linux:   .\dist\ghost-node-runner-linux
echo   Windows: .\dist\ghost-node-runner-win.exe
echo   macOS:   .\dist\ghost-node-runner-macos
echo.
echo File sizes:
dir dist /s
echo.
echo ========================================
pause

