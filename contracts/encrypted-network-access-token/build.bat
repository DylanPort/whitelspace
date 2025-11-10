@echo off
REM ENAT Smart Contract Build Script (Windows)

echo.
echo Building Encrypted Network Access Token Contract...
echo.

REM Check if Rust is installed
where cargo >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Cargo not found. Please install Rust from https://rustup.rs/
    exit /b 1
)

REM Check if Solana CLI is installed
where solana >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Solana CLI not found. Please install from https://docs.solana.com/cli/install-solana-cli-tools
    exit /b 1
)

echo ✅ Dependencies verified
echo.

REM Build the program
echo Building smart contract...
cargo build-bpf

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Build successful!
    echo.
    echo Binary location:
    dir target\deploy\*.so
    echo.
    echo Next steps:
    echo   1. Deploy to localnet: solana program deploy target\deploy\encrypted_network_access_token.so
    echo   2. Deploy to devnet: solana config set --url devnet ^&^& solana program deploy target\deploy\encrypted_network_access_token.so
    echo.
    echo ⚠️  Remember to update PROGRAM_ID in client\enat-client.js after deployment!
) else (
    echo.
    echo ❌ Build failed
    exit /b 1
)

