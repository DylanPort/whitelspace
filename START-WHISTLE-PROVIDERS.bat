@echo off
setlocal

title WHISTLE Provider Suite Launcher

echo.
echo   ==============================================
echo        WHISTLE PROVIDERS - ONE CLICK LAUNCH
echo   ==============================================
echo.

REM Go to repo root (this file is expected to live there)
cd /d "%~dp0"

REM Basic checks
where node >nul 2>&1
if errorlevel 1 (
  echo   ERROR: Node.js is not installed or not in PATH.
  echo   Please install Node.js from https://nodejs.org/ and try again.
  echo.
  pause
  goto :eof
)

where npm >nul 2>&1
if errorlevel 1 (
  echo   ERROR: npm is not available.
  echo   Please ensure Node.js is installed with npm support.
  echo.
  pause
  goto :eof
)

if not exist "providers\provider-portal.js" (
  echo   ERROR: providers\provider-portal.js not found.
  echo   Make sure you are running this inside the WHISTLE repo.
  echo.
  pause
  goto :eof
)

REM Install neo-blessed if missing (lightweight check)
if not exist "node_modules\neo-blessed" (
  echo   > Installing CLI dependency: neo-blessed
  echo.
  npm install neo-blessed
  if errorlevel 1 (
    echo.
    echo   ERROR: npm install neo-blessed failed.
    echo   Check your internet connection and try again.
    echo.
    pause
    goto :eof
  )
)

REM Install figlet if missing (for ASCII title rendering)
if not exist "node_modules\figlet" (
  echo   > Installing CLI dependency: figlet
  echo.
  npm install figlet
  if errorlevel 1 (
    echo.
    echo   WARNING: npm install figlet failed. Falling back to basic ASCII header.
    echo   You can run "npm install figlet" later to enable styled headers.
    echo.
  )
)

echo.
echo   Launching WHISTLE Provider Portal...
echo   (Press Q or Ctrl+C inside the portal to exit.)
echo.

REM Run the Node-based TUI
node providers\provider-portal.js

echo.
echo   WHISTLE Provider Portal closed.
echo.
pause

endlocal
goto :eof



