@echo off
setlocal
title WHISTLE Provider Portal

:: Change to repo root (parent of this providers folder)
cd /d "%~dp0.."

echo.
echo   Starting WHISTLE Provider Portal (Node.js)...
echo.

:: Run the Node.js CLI
node providers\provider-portal.js

echo.
echo   Press any key to close this window.
pause >nul

endlocal
exit /b 0

