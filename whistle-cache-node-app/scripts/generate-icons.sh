#!/bin/bash
# Generate Linux icon sizes from the main logo
# Requires: ImageMagick (convert command)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
ICONS_DIR="$APP_DIR/assets/icons"
SOURCE_ICON="$APP_DIR/../public/whistel_logo_top_right_2048.png"

# Create icons directory
mkdir -p "$ICONS_DIR"

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "Source icon not found at: $SOURCE_ICON"
    echo "Looking for alternative..."
    
    if [ -f "$APP_DIR/../whistel_logo_top_right_2048.png" ]; then
        SOURCE_ICON="$APP_DIR/../whistel_logo_top_right_2048.png"
    else
        echo "No source icon found. Please provide whistel_logo_top_right_2048.png"
        exit 1
    fi
fi

echo "Using source icon: $SOURCE_ICON"

# Generate different sizes for Linux
SIZES=(16 24 32 48 64 128 256 512 1024)

for size in "${SIZES[@]}"; do
    echo "Generating ${size}x${size} icon..."
    convert "$SOURCE_ICON" -resize "${size}x${size}" "$ICONS_DIR/${size}x${size}.png"
done

# Also copy as icon.png for general use
cp "$ICONS_DIR/256x256.png" "$APP_DIR/assets/icon.png"

echo "Icons generated successfully in $ICONS_DIR"
ls -la "$ICONS_DIR"

