# Ghost Whistle - Icon Resize Script
# Resizes app icon from 2048x2048 to 512x512 for store submission

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Ghost Whistle - Icon Resize Tool" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Set paths
$sourcePath = Join-Path $PSScriptRoot "assets\app-icon-2048x2048.png"
$targetPath = Join-Path $PSScriptRoot "assets\app-icon-512x512.png"

# Check if source file exists
if (-not (Test-Path $sourcePath)) {
    Write-Host "❌ ERROR: Source icon not found!" -ForegroundColor Red
    Write-Host "Expected: $sourcePath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please ensure app-icon-2048x2048.png is in the assets folder." -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✅ Source icon found: app-icon-2048x2048.png" -ForegroundColor Green

try {
    # Load .NET System.Drawing assembly
    Write-Host "⏳ Loading image processing library..." -ForegroundColor Yellow
    Add-Type -AssemblyName System.Drawing

    # Load the source image
    Write-Host "⏳ Loading source image..." -ForegroundColor Yellow
    $sourceImage = [System.Drawing.Image]::FromFile($sourcePath)
    
    Write-Host "   Original size: $($sourceImage.Width)x$($sourceImage.Height) pixels" -ForegroundColor Cyan

    # Create new bitmap (512x512)
    Write-Host "⏳ Resizing to 512x512..." -ForegroundColor Yellow
    $targetBitmap = New-Object System.Drawing.Bitmap(512, 512)

    # Create graphics object for high-quality resizing
    $graphics = [System.Drawing.Graphics]::FromImage($targetBitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Draw the resized image
    $graphics.DrawImage($sourceImage, 0, 0, 512, 512)

    # Save the resized image
    Write-Host "⏳ Saving resized icon..." -ForegroundColor Yellow
    $targetBitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Cleanup
    $graphics.Dispose()
    $targetBitmap.Dispose()
    $sourceImage.Dispose()

    # Verify the output
    if (Test-Path $targetPath) {
        $verifyImage = [System.Drawing.Image]::FromFile($targetPath)
        $fileSize = (Get-Item $targetPath).Length / 1KB
        
        Write-Host ""
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host "✅ SUCCESS! Icon resized!" -ForegroundColor Green
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Output file: app-icon-512x512.png" -ForegroundColor Cyan
        Write-Host "Location: assets\app-icon-512x512.png" -ForegroundColor Cyan
        Write-Host "Dimensions: $($verifyImage.Width)x$($verifyImage.Height) pixels" -ForegroundColor Cyan
        Write-Host "File size: $([Math]::Round($fileSize, 2)) KB" -ForegroundColor Cyan
        Write-Host ""
        
        if ($fileSize -lt 1024) {
            Write-Host "✅ File size is good (under 1 MB)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Warning: File size is large (over 1 MB)" -ForegroundColor Yellow
            Write-Host "   Consider optimizing with an online tool: https://tinypng.com/" -ForegroundColor Yellow
        }
        
        $verifyImage.Dispose()
        
        Write-Host ""
        Write-Host "📋 Next steps:" -ForegroundColor Cyan
        Write-Host "   1. Verify the icon looks good" -ForegroundColor White
        Write-Host "   2. Check off 'Icon resized' in SUBMISSION-CHECKLIST.md" -ForegroundColor White
        Write-Host "   3. Continue with APK build and screenshots" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "❌ ERROR: Output file was not created!" -ForegroundColor Red
    }

} catch {
    Write-Host ""
    Write-Host "❌ ERROR: Failed to resize icon!" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Alternative methods:" -ForegroundColor Cyan
    Write-Host "   1. Use online tool: https://www.iloveimg.com/resize-image" -ForegroundColor White
    Write-Host "   2. Use ImageMagick: magick assets\app-icon-2048x2048.png -resize 512x512 assets\app-icon-512x512.png" -ForegroundColor White
    Write-Host "   3. See ICON-RESIZE-GUIDE.md for more options" -ForegroundColor White
    Write-Host ""
    pause
    exit 1
}

Write-Host "Press any key to exit..." -ForegroundColor Gray
pause

