@echo off
echo Stopping server on port 3000...
taskkill /F /PID 22780 >nul 2>&1
timeout /t 2 /nobreak >nul
echo Starting server...
start "Whistle Server" cmd /k "node server.js"
echo Server restarted!
echo Wait 3 seconds, then refresh your browser with Ctrl+F5
timeout /t 3 /nobreak

