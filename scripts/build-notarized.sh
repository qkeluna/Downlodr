#!/bin/bash

echo "🔐 Building Downlodr with Notarization..."
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your Apple Developer credentials."
    echo "See scripts/setup-notarization.md for instructions."
    exit 1
fi

# Load environment variables
source .env

# Check if required variables are set
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
    echo "❌ Error: Missing required environment variables!"
    echo "Please ensure .env contains:"
    echo "  - APPLE_ID"
    echo "  - APPLE_APP_SPECIFIC_PASSWORD"
    echo "  - APPLE_TEAM_ID"
    exit 1
fi

echo "✅ Found Apple Developer credentials for: $APPLE_ID"
echo "✅ Team ID: $APPLE_TEAM_ID"
echo ""

# Clean previous build
echo "🧹 Cleaning previous builds..."
rm -rf out/make out/Downlodr-darwin-arm64

echo "🚀 Starting notarized build..."
echo "   This will take 3-5 minutes due to Apple notarization process..."
echo ""

# Run the build
npm run make

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Notarized build completed successfully!"
    echo ""
    echo "📦 Distribution files:"
    ls -lh out/make/*.{dmg,pkg} 2>/dev/null || echo "   No distribution files found"
    echo ""
    echo "✅ Files are signed and notarized - no security warnings for users!"
else
    echo ""
    echo "❌ Build failed. Check the error messages above."
    exit 1
fi 