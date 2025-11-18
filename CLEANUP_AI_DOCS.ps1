# Cleanup AI-Generated Documentation
# This script removes unnecessary AI session logs and process docs

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WHISTLE PROJECT - AI DOCS CLEANUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$cleanupRoot = $PSScriptRoot
$docsToDelete = @(
    "ACCESS_TOKENS_FIX.md",
    "ALL_DATA_INTEGRATED.md",
    "BORSH_DESERIALIZATION_FIX.md",
    "CENTRAL_CORE_INTERACTIVE_FEATURES.md",
    "FINAL_MAINNET_DEPLOYMENT.md",
    "FRONTEND_INTEGRATION_COMPLETE.md",
    "FRONTEND_UPDATED_155.md",
    "HELIUS_RPC_CONFIGURED.md",
    "MAINNET_FRONTEND_SETUP.md",
    "POOL_STATS_CENTER_DISPLAY.md",
    "PROGRAM_UPGRADE_SUCCESS.md",
    "REAL_STAKER_COUNT_NO_UPGRADE.md",
    "UNSTAKE_WITH_COOLDOWN.md",
    "WHISTLENET_MAINNET_COMPLETE.md",
    "WHISTLENET_MAINNET_DEPLOYMENT.md"
)

Write-Host "Deleting unnecessary AI-generated docs..." -ForegroundColor Yellow
Write-Host ""

$deletedCount = 0
$skippedCount = 0

foreach ($doc in $docsToDelete) {
    $filePath = Join-Path $cleanupRoot $doc
    if (Test-Path $filePath) {
        Remove-Item $filePath -Force
        Write-Host "  [DELETED] $doc" -ForegroundColor Red
        $deletedCount++
    } else {
        Write-Host "  [SKIP   ] $doc (not found)" -ForegroundColor Gray
        $skippedCount++
    }
}

Write-Host ""
Write-Host "Deleting old docs archives..." -ForegroundColor Yellow

# Delete old-docs-archive in root
$archivePath1 = Join-Path $cleanupRoot "docs\archive\old-docs-archive"
if (Test-Path $archivePath1) {
    Remove-Item $archivePath1 -Recurse -Force
    Write-Host "  [DELETED] docs/archive/old-docs-archive/" -ForegroundColor Red
    $deletedCount++
}

# Delete old-docs-archive in whistle-dashboard
$archivePath2 = Join-Path $cleanupRoot "whistle-dashboard\public\docs\archive\old-docs-archive"
if (Test-Path $archivePath2) {
    Remove-Item $archivePath2 -Recurse -Force
    Write-Host "  [DELETED] whistle-dashboard/public/docs/archive/old-docs-archive/" -ForegroundColor Red
    $deletedCount++
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Deleted: $deletedCount files/folders" -ForegroundColor Green
Write-Host "  Skipped: $skippedCount files (not found)" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT DOCS KEPT:" -ForegroundColor Cyan
Write-Host "  ✅ README.md" -ForegroundColor White
Write-Host "  ✅ PRODUCTION_DEPLOYMENT.md" -ForegroundColor White
Write-Host "  ✅ UNIFIED_SETUP.md" -ForegroundColor White
Write-Host "  ✅ WHISTLENET_AS_HOMEPAGE.md" -ForegroundColor White
Write-Host "  ✅ BUILD.md" -ForegroundColor White
Write-Host "  ✅ All user-facing documentation" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Read SECURITY_CLEANUP_REPORT.md" -ForegroundColor White
Write-Host "  2. Rotate API keys (Helius, HIBP)" -ForegroundColor White
Write-Host "  3. Update .gitignore" -ForegroundColor White
Write-Host "  4. Verify wallet keys are secure" -ForegroundColor White
Write-Host ""

