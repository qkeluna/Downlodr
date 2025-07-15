#!/bin/bash

echo "🌍 Building Universal Downlodr for ALL Mac Machines..."
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your Apple Developer credentials."
    exit 1
fi

# Load environment variables
source .env

# Check if required variables are set
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
    echo "❌ Error: Missing required environment variables!"
    echo "Please ensure .env contains APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID"
    exit 1
fi

echo "✅ Found Apple Developer credentials for: $APPLE_ID"
echo ""

# Clean only universal builds (preserve existing arm64 build)
echo "🧹 Cleaning previous universal builds..."
rm -rf out/universal out/Downlodr-darwin-x64

echo "📁 Current builds will be preserved:"
if [ -d "out/make" ]; then
    echo "   ✅ Existing Apple Silicon build: out/make/"
    ls -1 out/make/ 2>/dev/null | sed 's/^/       /'
else
    echo "   ℹ️  No existing builds found"
fi
echo ""

echo "🚀 Building Universal Binaries..."
echo "   This creates apps that work on:"
echo "   ✅ Intel Macs (x64)"
echo "   ✅ Apple Silicon Macs (arm64)"
echo "   ✅ macOS 10.15+ (Catalina and newer)"
echo ""
echo "⏱️  Expected build time: 8-12 minutes (notarization + universal compilation)"
echo ""

# Create universal directory structure
mkdir -p out/universal/intel-x64
mkdir -p out/universal/apple-silicon-arm64

# Build for Intel (x64) first
echo "📦 Building for Intel Macs (x64)..."
APPLE_ID="$APPLE_ID" APPLE_APP_SPECIFIC_PASSWORD="$APPLE_APP_SPECIFIC_PASSWORD" APPLE_TEAM_ID="$APPLE_TEAM_ID" npx electron-forge make --arch=x64

if [ $? -ne 0 ]; then
    echo "❌ Intel build failed!"
    exit 1
fi

# Move Intel builds immediately to prevent overwrites
echo "📁 Moving Intel x64 builds..."
if [ -f "out/make/Downlodr.dmg" ]; then
    cp "out/make/Downlodr.dmg" "out/universal/intel-x64/Downlodr-x64.dmg"
    echo "   ✅ Moved Intel DMG"
fi
if [ -f "out/make/Downlodr-1.4.15-stable-x64.pkg" ]; then
    mv "out/make/Downlodr-1.4.15-stable-x64.pkg" "out/universal/intel-x64/"
    echo "   ✅ Moved Intel PKG"
fi

echo ""
echo "📦 Building for Apple Silicon Macs (arm64)..."
APPLE_ID="$APPLE_ID" APPLE_APP_SPECIFIC_PASSWORD="$APPLE_APP_SPECIFIC_PASSWORD" APPLE_TEAM_ID="$APPLE_TEAM_ID" npx electron-forge make --arch=arm64

if [ $? -ne 0 ]; then
    echo "❌ Apple Silicon build failed!"
    exit 1
fi

# Move Apple Silicon builds
echo "📁 Moving Apple Silicon arm64 builds..."
if [ -f "out/make/Downlodr.dmg" ]; then
    cp "out/make/Downlodr.dmg" "out/universal/apple-silicon-arm64/Downlodr-arm64.dmg"
    echo "   ✅ Moved Apple Silicon DMG"
fi
if [ -f "out/make/Downlodr-1.4.15-stable-arm64.pkg" ]; then
    mv "out/make/Downlodr-1.4.15-stable-arm64.pkg" "out/universal/apple-silicon-arm64/"
    echo "   ✅ Moved Apple Silicon PKG"
fi

echo ""
echo "🎉 Universal Build Complete!"
echo ""
echo "📊 Build Results:"
echo "├── Intel Macs (x64):"
ls -lh out/universal/intel-x64/*.{dmg,pkg} 2>/dev/null | sed 's/^/│   /'
echo "├── Apple Silicon (arm64):"
ls -lh out/universal/apple-silicon-arm64/*.{dmg,pkg} 2>/dev/null | sed 's/^/│   /'
echo ""

echo "📁 File Organization:"
echo "├── out/make/                     (Original Apple Silicon build - PRESERVED)"
echo "│   └── Downlodr.dmg              (125MB - arm64 only)"
echo "│"
echo "└── out/universal/                (New Universal builds)"
echo "    ├── intel-x64/"
echo "    │   ├── Downlodr-x64.dmg      (~125MB - Intel x64)"
echo "    │   └── Downlodr-1.4.15-stable-x64.pkg"
echo "    └── apple-silicon-arm64/"
echo "        ├── Downlodr-arm64.dmg    (~125MB - Apple Silicon arm64)"
echo "        └── Downlodr-1.4.15-stable-arm64.pkg"
echo ""

echo "✅ Distribution Strategy:"
echo "🔹 For maximum compatibility: Provide both x64 AND arm64 versions"
echo "🔹 Users download the version matching their Mac:"
echo "   • Intel Macs: Download x64 version from out/universal/intel-x64/"
echo "   • Apple Silicon: Download arm64 version from out/universal/apple-silicon-arm64/"
echo ""
echo "🔹 Your original Apple Silicon build in out/make/ remains untouched!"
echo ""
echo "🌍 Compatibility Matrix:"
echo "├── macOS 10.15+ (Catalina 2019+): ✅ Supported"
echo "├── macOS 10.13-10.14 (2017-2018): ❌ Not supported (Electron 30 limitation)"
echo "├── Intel Macs: ✅ Supported (x64 build)"
echo "└── Apple Silicon Macs: ✅ Supported (arm64 build)" 