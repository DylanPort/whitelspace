@echo off
cd C:\Users\salva\Downloads\Encrypto\whistlenet\provider\indexer
ECHO.
ECHO ===========================================
ECHO   WHISTLE Blockchain Indexer
ECHO ===========================================
ECHO.

IF NOT EXIST "node_modules" (
    ECHO Installing dependencies...
    call npm install
    IF %ERRORLEVEL% NEQ 0 (
        ECHO Failed to install dependencies!
        PAUSE
        EXIT /B %ERRORLEVEL%
    )
    ECHO.
)

ECHO Starting indexer...
ECHO This will populate the database with real blockchain data.
ECHO Press Ctrl+C to stop at any time.
ECHO.
node simple-indexer.js

PAUSE

