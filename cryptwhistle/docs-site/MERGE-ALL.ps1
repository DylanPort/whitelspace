# CryptWhistle - Merge ALL content files into single content.js
# This creates a complete working content.js with all 52 sections

Write-Host "`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  MERGING ALL 52 SECTIONS INTO content.js             ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝`n" -ForegroundColor Green

# Backup existing content.js
if (Test-Path "content.js") {
    Copy-Item "content.js" "content.js.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Host "✅ Backed up existing content.js" -ForegroundColor Green
}

# Start building the complete file
$output = @"
// CryptWhistle Documentation Content
// Complete documentation with ALL 52 sections - MERGED VERSION
// Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

const content = {
"@

Write-Host "📝 Reading all content files..." -ForegroundColor Yellow

# List of all content files in order
$files = @(
    "content.js",           # Base sections (portal, overview, etc.)
    "content-complete.js",  # Wallet setup, quickstart
    "content-part2.js",     # Client-side AI, TEE
    "content-part3.js",     # ZK Proofs, x402
    "content-part4.js",     # Hybrid Rails, Smart Routing
    "content-part5.js",     # FHE Oracles, ZKPaySphere
    "content-part6.js",     # Privacy Mixer, Agent Economy
    "content-part7.js",     # SDK sections
    "content-part8.js",     # More SDK sections
    "content-part9-guides.js", # Guides
    "content-part10-final-sections.js" # Final sections
)

$sections = @()

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "   Reading: $file" -ForegroundColor Gray
        $content = Get-Content $file -Raw
        
        # Extract section content (everything between first { and closing };)
        if ($content -match 'const content = \{(.*)\};?.*window\.content' -or 
            $content -match '\{(.*)\};?\s*$' -or
            $content -match 'const content = \{(.*?)(?=\};|$)') {
            
            $sectionContent = $matches[1]
            
            # Clean up and add to array
            $sectionContent = $sectionContent.Trim()
            if ($sectionContent) {
                $sections += $sectionContent
            }
        }
    }
}

Write-Host "`n🔧 Combining all sections..." -ForegroundColor Yellow

# Combine all sections
$output += ($sections -join ",`n`n")

# Close the content object
$output += @"

};

// Export for use in app.js
window.content = content;

console.log('✅ CryptWhistle Documentation Loaded - 52 Sections Available');
console.log('Sections:', Object.keys(content).length);
"@

# Write the complete file
$output | Out-File -FilePath "content.js" -Encoding UTF8

Write-Host "`n✅ MERGE COMPLETE!" -ForegroundColor Green
Write-Host "`n📊 Statistics:" -ForegroundColor Yellow
Write-Host "   Files merged: $($files.Count)" -ForegroundColor White
Write-Host "   Output file: content.js" -ForegroundColor White
Write-Host "   File size: $((Get-Item "content.js").Length / 1KB) KB" -ForegroundColor White

Write-Host "`n🚀 NEXT STEP:" -ForegroundColor Cyan
Write-Host "   Refresh your browser to see ALL 52 sections!`n" -ForegroundColor White

