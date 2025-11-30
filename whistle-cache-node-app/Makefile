# WHISTLE Cache Node - Makefile for Linux Builds
# ═══════════════════════════════════════════════════════════════════
#
# Usage:
#   make install      - Install dependencies
#   make build        - Build all Linux packages
#   make build-deb    - Build .deb package only
#   make build-rpm    - Build .rpm package only
#   make build-appimage - Build AppImage only
#   make icons        - Generate icon files
#   make clean        - Clean build artifacts
#   make run          - Run in development mode
#
# ═══════════════════════════════════════════════════════════════════

.PHONY: all install build build-linux build-deb build-rpm build-appimage build-tar icons clean run help

# Default target
all: install icons build

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	npm install
	npm run postinstall

# Rebuild native modules
rebuild:
	@echo "🔧 Rebuilding native modules..."
	npm run rebuild

# Generate icons from SVG/PNG
icons:
	@echo "🎨 Generating icons..."
	@if [ -f scripts/generate-icons.sh ]; then \
		chmod +x scripts/generate-icons.sh && \
		./scripts/generate-icons.sh; \
	else \
		echo "Icon generation script not found"; \
		mkdir -p assets/icons; \
		if [ -f ../public/whistel_logo_top_right_2048.png ]; then \
			cp ../public/whistel_logo_top_right_2048.png assets/icon.png; \
			echo "Copied icon from public folder"; \
		fi; \
	fi

# Build all Linux packages
build: build-linux

build-linux:
	@echo "🏗️  Building Linux packages..."
	npm run build:linux

# Build specific formats
build-deb:
	@echo "📦 Building .deb package..."
	npm run build:linux:deb

build-rpm:
	@echo "📦 Building .rpm package..."
	npm run build:linux:rpm

build-appimage:
	@echo "📦 Building AppImage..."
	npm run build:linux:appimage

build-tar:
	@echo "📦 Building tar.gz..."
	npm run build:linux:tar

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf dist/
	rm -rf node_modules/.cache/

# Run in development mode
run:
	@echo "🚀 Starting in development mode..."
	npm start

# Docker commands for testing
docker-build:
	@echo "🐳 Building Docker test image..."
	docker build -t whistle-cache-test .

docker-run:
	@echo "🐳 Running Docker test container..."
	docker run -it --rm -p 8546:8545 whistle-cache-test

# Help
help:
	@echo ""
	@echo "WHISTLE Cache Node - Build Commands"
	@echo "════════════════════════════════════"
	@echo ""
	@echo "  make install      - Install npm dependencies"
	@echo "  make rebuild      - Rebuild native modules for Electron"
	@echo "  make icons        - Generate icon files from source"
	@echo "  make build        - Build all Linux packages"
	@echo "  make build-deb    - Build .deb package only"
	@echo "  make build-rpm    - Build .rpm package only"
	@echo "  make build-appimage - Build AppImage only"
	@echo "  make build-tar    - Build tar.gz archive"
	@echo "  make clean        - Remove build artifacts"
	@echo "  make run          - Run in development mode"
	@echo ""
	@echo "Build outputs go to: dist/"
	@echo ""

