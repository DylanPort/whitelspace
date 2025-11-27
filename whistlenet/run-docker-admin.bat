@echo off
echo Starting Docker Desktop with Administrator privileges...
echo.
echo Please wait for Docker to fully start (30-60 seconds)...
echo.

REM Start Docker Desktop as Administrator
powershell -Command "Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe' -Verb RunAs"

echo.
echo Docker Desktop is starting...
echo Close this window once Docker is running.
echo.
pause





