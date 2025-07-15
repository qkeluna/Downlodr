# Downlodr Notarization Guide

## Overview

This guide explains how to build fully notarized distributions of Downlodr that install without security warnings on macOS.

## ✅ Current Status: FULLY OPERATIONAL

**Notarization is now working!** Apple Developer Agreement issues have been resolved.

## Quick Build

### Single Architecture (Current)

For Apple Silicon Macs only:

```bash
./scripts/build-notarized.sh
```

**Output**: `out/make/` (125MB DMG + PKG, arm64 only)

### Universal Build (All Macs)

For both Intel and Apple Silicon Macs:

```bash
./scripts/build-universal.sh
```

**Output**: `out/universal/` (separate x64 and arm64 folders)  
**Note**: Preserves your existing Apple Silicon build in `out/make/`

## Manual Build

If you prefer to build manually:

```bash
source .env && npm run make
```

## What's Included

### Single Architecture Build (`./scripts/build-notarized.sh`)

Creates in `out/make/`:

1. **Downlodr.dmg** (125MB) - Signed DMG installer (arm64 only)
2. **Downlodr-1.4.15-stable-arm64.pkg** (125MB) - Signed PKG installer (arm64 only)
3. **Downlodr.app** - Fully notarized app bundle (arm64 only)

### Universal Build (`./scripts/build-universal.sh`)

Creates in `out/universal/`:

#### Intel Macs (`out/universal/intel-x64/`)

1. **Downlodr.dmg** (~125MB) - Intel x64 DMG installer
2. **Downlodr-1.4.15-stable-x64.pkg** (~125MB) - Intel x64 PKG installer

#### Apple Silicon Macs (`out/universal/apple-silicon-arm64/`)

1. **Downlodr.dmg** (~125MB) - Apple Silicon arm64 DMG installer
2. **Downlodr-1.4.15-stable-arm64.pkg** (~125MB) - Apple Silicon arm64 PKG installer

**Compatibility Matrix:**

- ✅ **Intel Macs (2006-2020)**: Use x64 versions
- ✅ **Apple Silicon Macs (2020+)**: Use arm64 versions
- ✅ **macOS 10.15+ (Catalina 2019+)**: All versions supported
- ❌ **macOS 10.13-10.14**: Not supported (Electron 30 limitation)

## Apple Developer Requirements

### Required Credentials (.env file)

```bash
APPLE_ID=admin@media-meter.com
APPLE_APP_SPECIFIC_PASSWORD=gtzk-spss-ebzx-fygt
APPLE_TEAM_ID=36J4F965UC
```

### Required Certificates (already installed)

- **Developer ID Application**: Magtangol Roque (36J4F965UC)
- **Developer ID Installer**: Magtangol Roque (36J4F965UC)

### Required Agreements (✅ Completed)

- [x] Apple Developer Program License Agreement
- [x] Developer ID Program Agreement
- [x] Notarization Service Agreement

## Build Process Details

### What Happens During Build

1. **Packaging** (30 seconds)

   - Compiles TypeScript and React code
   - Bundles app with Electron
   - Copies yt-dlp binary and resources

2. **Code Signing** (30 seconds)

   - Signs all dylibs in Electron Framework
   - Signs chrome_crashpad_handler helper
   - Signs yt-dlp_macos binary
   - Signs entire app bundle with entitlements

3. **Notarization** (3-4 minutes)

   - Uploads app to Apple notarization service
   - Apple scans for security issues
   - Apple signs with notarization ticket
   - Downloads notarized app

4. **Distribution Creation** (1 minute)
   - Creates signed DMG installer
   - Creates signed PKG installer
   - Creates ZIP archive

### Total Build Time: ~5 minutes

## User Experience

### Before Notarization

- macOS shows security warning: "Apple could not verify..."
- User must right-click → Open → Open to bypass
- Requires technical knowledge

### After Notarization ✅

- **Zero security warnings**
- Double-click to install like any Mac app
- Professional user experience
- App Store quality distribution

## Verification Commands

### Check App Signature

```bash
spctl -a -vvv -t exec out/Downlodr-darwin-arm64/Downlodr.app
# Should show: "accepted, source=Developer ID"
```

### Check PKG Signature

```bash
pkgutil --check-signature out/make/Downlodr-1.4.15-stable-arm64.pkg
# Should show full certificate chain
```

### Check DMG Contents

```bash
hdiutil attach out/make/Downlodr.dmg -nobrowse
spctl -a -vvv -t exec /Volumes/Downlodr/Downlodr.app
hdiutil detach /Volumes/Downlodr
```

## Troubleshooting

### Agreement Issues

If you get "HTTP status code: 403. A required agreement is missing":

1. Visit https://developer.apple.com/account
2. Sign in with `admin@media-meter.com`
3. Check "Agreements, Tax, and Banking"
4. Accept any pending agreements

### Environment Variable Issues

If you get "No authentication properties provided":

1. Ensure `.env` file exists with all three variables
2. Run build with: `source .env && npm run make`
3. Or use the provided script: `./scripts/build-notarized.sh`

### Certificate Issues

If you get signing errors:

1. Check certificates in Keychain Access
2. Ensure both Developer ID certificates are installed:
   - Developer ID Application: Magtangol Roque (36J4F965UC)
   - Developer ID Installer: Magtangol Roque (36J4F965UC)

## Build Scripts

### Available Scripts

- `./scripts/build-notarized.sh` - Full notarized build (Apple Silicon only)
- `./scripts/build-universal.sh` - Universal build (Intel + Apple Silicon)
- `./scripts/enable-notarization.sh` - Re-enable notarization if disabled
- `npm run make` - Standard build (requires `source .env` first)

### Script Features

- ✅ Validates .env file exists
- ✅ Checks all required environment variables
- ✅ Cleans previous builds
- ✅ Shows real-time progress
- ✅ Verifies final file sizes
- ✅ Provides success confirmation

## Security Features

### App Bundle Security

- **Hardened Runtime**: Enabled with entitlements
- **Library Validation**: All dylibs properly signed
- **Notarization**: Full Apple security scan passed
- **Gatekeeper**: Fully compatible

### Entitlements

```xml
- com.apple.security.cs.allow-jit (for V8 JavaScript engine)
- com.apple.security.cs.allow-unsigned-executable-memory (for V8)
- com.apple.security.cs.disable-library-validation (for Electron)
- com.apple.security.network.client (for internet downloads)
- com.apple.security.device.audio-input (for potential future features)
```

## Success Confirmation

When notarization is working correctly, you should see:

1. **Build output**: "Packaging for arm64 on darwin [3m55s]"
2. **File verification**: Both DMG and PKG are 125MB
3. **Signature check**: `spctl` returns "accepted, source=Developer ID"
4. **PKG verification**: Shows full Apple certificate chain
5. **User installation**: No security warnings on fresh Mac

## Final Notes

- **Automatic yt-dlp**: App includes intelligent yt-dlp download system
- **Universal compatibility**: Works on all Apple Silicon Macs
- **Professional quality**: Equivalent to Mac App Store apps
- **Zero user friction**: Install just like any commercial Mac app

The notarization process ensures users can install Downlodr with complete confidence and zero technical barriers.
