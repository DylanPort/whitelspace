@echo off
echo ========================================
echo   WHISTLE UNIFIED DEVELOPMENT SERVER
echo ========================================
echo.
echo Starting all three servers:
echo   - Whistlenet Dashboard (MAIN): http://localhost:3000
echo   - Original Website: http://localhost:3001/main
echo   - Backend API: http://localhost:8080
echo.
echo NOTE: Opening localhost:3001 redirects to Whistlenet Dashboard
echo.
echo Press Ctrl+C to stop all servers
echo ========================================
echo.

cd /d "%~dp0"
npm run dev

pause

