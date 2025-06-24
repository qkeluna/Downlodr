# macOS Build Guide - Code Signing & Notarization

This guide provides step-by-step instructions for building a properly signed and notarized Downlodr app for macOS distribution.

## Prerequisites

### 1. Apple Developer Account

- Required for Developer ID certificates ($99/year)
- Sign up at https://developer.apple.com

### 2. Developer ID Certificates

You need these certificates installed in your macOS Keychain:

- **Developer ID Application**: For signing the app
- **Developer ID Installer**: For signing PKG installers (optional)

Check your certificates:

```bash
security find-identity -v -p codesigning
```

You should see:

```
1) XXXXXXXXXX "Developer ID Application: Your Name (TEAM_ID)"
2) XXXXXXXXXX "Developer ID Installer: Your Name (TEAM_ID)"
```

### 3. App-Specific Password

1. Go to https://appleid.apple.com/account/manage
2. Sign in with your Apple ID
3. Navigate to Security > App-Specific Passwords
4. Click "Generate Password"
5. Name it "Downlodr Notarization"
6. Save the password (format: xxxx-xxxx-xxxx-xxxx)

## Setup Instructions

### Step 1: Configure Environment Variables

1. Copy the environment template:

```bash
# Create .env file from the template
cp docs/ENV_TEMPLATE.md .env
```

2. Edit `.env` and fill in your credentials:

```bash
APPLE_ID=your.email@example.com
APPLE_PASSWORD=xxxx-xxxx-xxxx-xxxx  # App-specific password
APPLE_TEAM_ID=36J4F965UC
APPLE_IDENTITY="Developer ID Application: Magtangol Roque (36J4F965UC)"
```

### Step 2: Install Dependencies

```bash
# Install all dependencies including dotenv
npm install
```

### Step 3: Build Signed Application

Use the automated build script:

```bash
node scripts/build-macos-signed.js
```

Or manually:

```bash
# Load environment variables and build
source .env && npm run make
```

## Build Process

The build script will:

1. ✅ Clean previous builds
2. ✅ Sign the app with Developer ID certificate
3. ✅ Submit to Apple for notarization (5-10 minutes)
4. ✅ Staple the notarization ticket
5. ✅ Create distributable packages (PKG, ZIP)
6. ✅ Verify signatures

## Output Files

After successful build, you'll find:

```
out/make/
├── pkg/darwin/arm64/
│   └── Downlodr-1.3.7-arm64.pkg    # Signed PKG installer
└── zip/darwin/arm64/
    └── Downlodr-darwin-arm64-1.3.7.zip  # Signed ZIP archive
```

## Verification

### Verify App Signature

```bash
codesign --verify --deep --verbose=2 "out/Downlodr-darwin-arm64/Downlodr.app"
```

### Verify PKG Signature

```bash
pkgutil --check-signature "out/make/pkg/darwin/arm64/Downlodr-*.pkg"
```

### Verify Notarization

```bash
spctl --assess --type execute -vv "out/Downlodr-darwin-arm64/Downlodr.app"
# Should show: "source=Notarized Developer ID"
```

## Distribution

### Option 1: ZIP Distribution (Recommended)

- Simple drag-and-drop installation
- Users extract and move to Applications folder
- No installation issues

### Option 2: PKG Installer

- Traditional installer experience
- May require manual extraction if installation fails
- Provide installation guide for users

## Troubleshooting

### "Unable to find identity"

- Ensure Developer ID certificates are installed
- Check certificate name matches exactly in .env

### "Invalid credentials"

- Verify Apple ID email is correct
- Use app-specific password, not regular password
- Check Team ID matches your certificate

### "Package is invalid"

- Ensure all binaries are signed
- Check entitlements.plist is correct
- Verify no unsigned third-party binaries

### Notarization Failed

- Check Apple Developer account is active
- Verify app-specific password is valid
- Review notarization logs for specific errors

## Alternative: DMG Creation

For a more professional distribution:

```bash
# Create DMG (requires additional setup)
./scripts/create-dmg.sh
```

## Best Practices

1. **Always test** on a clean macOS system before distribution
2. **Keep certificates updated** - they expire annually
3. **Monitor notarization** - Apple may change requirements
4. **Version your builds** - helps with troubleshooting
5. **Document issues** - maintain a troubleshooting log

## Quick Reference

```bash
# Full build process
node scripts/build-macos-signed.js

# Manual commands
source .env                          # Load credentials
npm run make                         # Build and sign
codesign --verify --deep -v "*.app" # Verify signature
pkgutil --check-signature "*.pkg"   # Verify PKG
```

## Support

- Apple Developer Forums: https://developer.apple.com/forums/
- Electron Forge Docs: https://www.electronforge.io/
- Project Issues: [Create an issue in the repository]
