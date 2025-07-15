#!/bin/bash

# DMG Creation Script for Downlodr
# This script creates a professionally signed DMG installer

set -e  # Exit on any error

echo "🚀 Starting DMG creation process..."

# Constants - Using SHA1 fingerprint to avoid ambiguity
DEVELOPER_ID_APP="D2DEA35BE4FA871AE56C94DE8F41BF4AD6D6CD6B"
APP_NAME="Downlodr"
VERSION=$(node -p "require('./package.json').version")
DMG_NAME="${APP_NAME}-${VERSION}-arm64.dmg"

# Paths
BUILD_DIR="out"
MAKE_DIR="${BUILD_DIR}/make"
DMG_PATH="${MAKE_DIR}/${DMG_NAME}"
TEMP_DMG_DIR="temp_dmg"

echo "📦 Building app bundle first..."

# Step 1: Build the app if not already built
if [ ! -d "${BUILD_DIR}" ] || [ ! -f "${BUILD_DIR}/Downlodr-darwin-arm64/Downlodr.app/Contents/MacOS/Downlodr" ]; then
    echo "🔨 App not found, building from scratch..."
    npm run package
fi

# Step 2: Find the app bundle
APP_PATH=$(find "${BUILD_DIR}" -name "Downlodr.app" -type d | head -1)
if [ -z "$APP_PATH" ]; then
    echo "❌ Could not find Downlodr.app bundle"
    exit 1
fi

echo "📁 Found app bundle: $APP_PATH"

# Step 3: Sign the app bundle
echo "✍️ Checking app signature..."
# Check if the app is already properly signed
if codesign --verify --deep --strict "${APP_PATH}" 2>/dev/null; then
    echo "✅ App bundle already properly signed"
else
    echo "⚠️ App not signed or signature invalid, signing now..."
    # Check if entitlements file exists
    if [ -f "entitlements.plist" ]; then
        codesign --force --sign "${DEVELOPER_ID_APP}" --options runtime --entitlements "entitlements.plist" "${APP_PATH}"
        echo "✅ App bundle signed with entitlements"
    else
        codesign --force --sign "${DEVELOPER_ID_APP}" --options runtime "${APP_PATH}"
        echo "✅ App bundle signed (no entitlements file found)"
    fi
fi

# Step 4: Create DMG staging directory
echo "📂 Creating DMG staging area..."
rm -rf "$TEMP_DMG_DIR"
mkdir -p "$TEMP_DMG_DIR"

# Copy app to staging area
cp -R "$APP_PATH" "$TEMP_DMG_DIR/"

# Create Applications symlink
ln -s /Applications "$TEMP_DMG_DIR/Applications"

# Create custom DMG background (optional - can be enhanced later)
mkdir -p "$TEMP_DMG_DIR/.background"

# Step 5: Create the DMG
echo "💿 Creating DMG..."
mkdir -p "$MAKE_DIR"

# Remove existing DMG if it exists
rm -f "$DMG_PATH"

# Create temporary DMG
TEMP_DMG="${MAKE_DIR}/temp_${APP_NAME}.dmg"
rm -f "$TEMP_DMG"

# Calculate size needed (app size + 50MB buffer)
APP_SIZE=$(du -sm "$APP_PATH" | cut -f1)
DMG_SIZE=$((APP_SIZE + 50))

echo "📊 App size: ${APP_SIZE}MB, DMG size: ${DMG_SIZE}MB"

# Create the DMG
hdiutil create -srcfolder "$TEMP_DMG_DIR" -volname "$APP_NAME" -fs HFS+ -fsargs "-c c=64,a=16,e=16" -format UDRW -size ${DMG_SIZE}m "$TEMP_DMG"

# Mount the DMG for customization
echo "🔧 Mounting DMG for customization..."
DMG_MOUNT=$(hdiutil attach -readwrite -noverify -noautoopen "$TEMP_DMG" | egrep '^/dev/' | sed 1q | awk '{print $1}')
VOLUME_PATH="/Volumes/$APP_NAME"

# Wait for mount
sleep 2

# Set DMG window properties using AppleScript
osascript << EOF
tell application "Finder"
    tell disk "$APP_NAME"
        open
        set current view of container window to icon view
        set toolbar visible of container window to false
        set statusbar visible of container window to false
        set the bounds of container window to {400, 100, 900, 400}
        set theViewOptions to the icon view options of container window
        set arrangement of theViewOptions to not arranged
        set icon size of theViewOptions to 72
        set position of item "Downlodr.app" of container window to {125, 150}
        set position of item "Applications" of container window to {375, 150}
        close
        open
        update without registering applications
        delay 2
    end tell
end tell
EOF

# Unmount the DMG
echo "📤 Unmounting DMG..."
hdiutil detach "$DMG_MOUNT"

# Step 6: Convert to final compressed DMG
echo "🗜️ Converting to final DMG..."
hdiutil convert "$TEMP_DMG" -format UDZO -imagekey zlib-level=9 -o "$DMG_PATH"

# Clean up temporary DMG
rm -f "$TEMP_DMG"

# Step 7: Sign the DMG
echo "✍️ Signing DMG..."
codesign --force --sign "$DEVELOPER_ID_APP" "$DMG_PATH"

# Step 8: Verify signatures
echo "🔍 Verifying signatures..."
echo "DMG signature:"
codesign --verify --deep --verbose=2 "$DMG_PATH"

echo "App bundle signature:"
codesign --verify --deep --verbose=2 "$APP_PATH"

# Step 9: Show final results
echo ""
echo "✅ DMG creation completed successfully!"
echo "📂 DMG location: $DMG_PATH"

# Show file size
DMG_SIZE_MB=$(du -m "$DMG_PATH" | cut -f1)
echo "📊 DMG size: ${DMG_SIZE_MB}MB"

# Clean up
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DMG_DIR"

echo ""
echo "🎉 Ready for distribution!"
echo "Users can now:"
echo "  1. Download $DMG_NAME"
echo "  2. Double-click to mount"
echo "  3. Drag Downlodr.app to Applications"
echo "  4. Launch without security warnings" 