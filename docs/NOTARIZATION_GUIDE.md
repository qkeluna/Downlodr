# macOS Notarization Guide

## What is Notarization?

Notarization is Apple's automated security scanning service that checks your app for malicious content and code-signing issues. Without notarization, users will see security warnings when installing your app.

## Current Status

Your current build is:

- ✅ **Signed** with Developer ID certificates
- ❌ **Not Notarized** - Users will see "unidentified developer" warnings

## Setting Up Notarization

### Step 1: Create App-Specific Password

1. Go to https://appleid.apple.com/account/manage
2. Sign in with your Apple ID
3. Navigate to **Security** section
4. Under **App-Specific Passwords**, click **Generate Password**
5. Name it "Downlodr Notarization"
6. Save the password (format: `xxxx-xxxx-xxxx-xxxx`)

### Step 2: Configure Environment

Run the interactive setup script:

```bash
node scripts/setup-env.js
```

Or manually create `.env` file:

```bash
APPLE_ID=your.email@example.com
APPLE_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=36J4F965UC
APPLE_IDENTITY="Developer ID Application: Magtangol Roque (36J4F965UC)"
APPLE_PKG_IDENTITY="Developer ID Installer: Magtangol Roque (36J4F965UC)"
```

### Step 3: Build with Notarization

```bash
node scripts/build-macos-signed.js
```

The build process will:

1. Sign your app with Developer ID certificates
2. Submit to Apple for notarization (5-10 minutes)
3. Wait for Apple's response
4. Staple the notarization ticket to your app
5. Create notarized packages

## Verification

### Check Notarization Status

For PKG installer:

```bash
spctl --assess --type install -vv out/make/Downlodr.pkg
# Should show: "source=Notarized Developer ID"
```

For App bundle:

```bash
spctl --assess --type execute -vv "out/Downlodr-darwin-arm64/Downlodr.app"
# Should show: "source=Notarized Developer ID"
```

### Check Notarization History

```bash
xcrun notarytool history --apple-id YOUR_APPLE_ID --team-id 36J4F965UC
```

## Troubleshooting

### "Unnotarized Developer ID"

- Ensure your Apple ID and app-specific password are correct
- Check that your Apple Developer account is active
- Verify the app-specific password hasn't expired

### "Invalid credentials"

- You must use an app-specific password, not your Apple ID password
- The password format should be: xxxx-xxxx-xxxx-xxxx
- Ensure no extra spaces in the password

### "Package is invalid"

- All binaries must be signed (including yt-dlp_macos)
- Check entitlements.plist is properly configured
- Ensure no unsigned third-party libraries

### Notarization Takes Too Long

- Normal time: 5-10 minutes
- Peak times: up to 1 hour
- Check status: `xcrun notarytool log`

## Best Practices

1. **Always notarize** before distribution
2. **Test on clean system** after notarization
3. **Keep credentials secure** - never commit .env
4. **Monitor Apple changes** - requirements may update
5. **Automate the process** - use CI/CD for consistency

## Quick Reference

```bash
# Full build with notarization
node scripts/build-macos-signed.js

# Check notarization status
spctl --assess --type install -vv "*.pkg"

# View notarization history
xcrun notarytool history --apple-id YOUR_APPLE_ID

# Get notarization log
xcrun notarytool log SUBMISSION_ID --apple-id YOUR_APPLE_ID
```

## Distribution After Notarization

Once notarized, your packages can be distributed:

- **Direct download** from your website
- **GitHub Releases**
- **Auto-update systems**
- **App stores** (with additional requirements)

Users will be able to install without any security warnings! 🎉
