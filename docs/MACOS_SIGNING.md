# macOS Code Signing and Notarization Guide

This guide explains how to properly sign and notarize your Electron app to avoid the "unidentified developer" warning on macOS.

## Problem

When users download and run your app on macOS, they see a security warning:

- "Downlodr" cannot be opened because Apple cannot check it for malicious software.
- The app needs to be moved to trash or opened with right-click > Open.

This happens because the app isn't properly signed with a Developer ID certificate and notarized by Apple.

## Solution Overview

1. **Code Signing**: Sign your app with a Developer ID certificate (not Apple Development)
2. **Notarization**: Submit your app to Apple for automated security checks
3. **Stapling**: Attach the notarization ticket to your app

## Prerequisites

1. **Apple Developer Account** ($99/year) - Required for Developer ID certificates
2. **Developer ID Certificates**:
   - Developer ID Application certificate (for the app)
   - Developer ID Installer certificate (for PKG installers)

## Step 1: Check Your Certificates

Run this command to see your available certificates:

```bash
security find-identity -p codesigning -v
```

You should see something like:

```
1) XXXXXXXXXX "Developer ID Application: Your Name (TEAM_ID)"
2) XXXXXXXXXX "Developer ID Installer: Your Name (TEAM_ID)"
3) XXXXXXXXXX "Apple Development: Your Name (TEAM_ID)"
```

**Important**: You need "Developer ID" certificates for distribution, not "Apple Development".

## Step 2: Create an App-Specific Password

1. Go to https://appleid.apple.com/account/manage
2. Sign in with your Apple ID
3. Navigate to Security > App-Specific Passwords
4. Click "Generate Password"
5. Name it "Electron Forge Notarization" or similar
6. Save the generated password (format: xxxx-xxxx-xxxx-xxxx)

## Step 3: Set Up Environment Variables

Create a `.env` file in your project root:

```bash
# Your Apple ID (email address)
APPLE_ID=your.email@example.com

# App-specific password from Step 2
APPLE_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Your Team ID (from certificate or Apple Developer account)
APPLE_TEAM_ID=YOUR_TEAM_ID

# (Optional) Override the signing identity
APPLE_IDENTITY="Developer ID Application: Your Name (YOUR_TEAM_ID)"

# (Optional) Separate identity for PKG installer
# If not set, will use APPLE_IDENTITY
APPLE_PKG_IDENTITY="Developer ID Installer: Your Name (YOUR_TEAM_ID)"
```

## Step 4: Update forge.config.ts

The configuration has already been updated with:

```typescript
packagerConfig: {
  // ... other config ...
  osxSign: {
    identity: process.env.APPLE_IDENTITY || 'Apple Development: Magtangol Roque (XM7C9JRJ82)',
  },
  osxNotarize: {
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID
  }
},
makers: [
  new MakerPKG({
    name: "Downlodr",
    // PKG will be signed with Developer ID Installer certificate
    identity: process.env.APPLE_PKG_IDENTITY || process.env.APPLE_IDENTITY,
  }),
  // ... other makers
]
```

## Step 5: Build and Notarize

1. Load your environment variables:

   ```bash
   source .env
   # or use a tool like dotenv-cli
   ```

2. Build your app:
   ```bash
   npm run make
   ```

The build process will:

- Sign your app with the Developer ID certificate
- Submit it to Apple for notarization
- Wait for Apple's response (usually 5-10 minutes)
- Staple the notarization ticket to your app

## Step 6: Verify Notarization

After building, verify your app is properly notarized:

```bash
# For the .app bundle
spctl --assess --type execute -vv "out/Downlodr-darwin-arm64/Downlodr.app"

# For the PKG installer
spctl --assess --type install -vv "out/make/pkg/darwin/arm64/Downlodr-*.pkg"
```

You should see: "source=Notarized Developer ID"

## Troubleshooting

### "Unable to find identity"

- Make sure you have Developer ID certificates installed
- Check that APPLE_IDENTITY matches exactly what's shown in `security find-identity`

### "Invalid credentials"

- Verify your Apple ID email is correct
- Make sure you're using an app-specific password, not your Apple ID password
- Check that your Team ID is correct

### "Package is invalid"

- Ensure all binaries in your app are signed
- Check that your entitlements are correct
- Make sure you're not including any unsigned third-party binaries

## Alternative: Using Keychain

Instead of environment variables, you can store credentials in the macOS keychain:

```bash
# Store credentials
xcrun notarytool store-credentials "Downlodr-Notarization" \
  --apple-id "your.email@example.com" \
  --team-id "YOUR_TEAM_ID" \
  --password "xxxx-xxxx-xxxx-xxxx"
```

Then update forge.config.ts:

```typescript
osxNotarize: {
  keychainProfile: "Downlodr-Notarization";
}
```

## Additional Resources

- [Apple's Notarization Documentation](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Electron Forge Code Signing Guide](https://www.electronforge.io/guides/code-signing/code-signing-macos)
- [Electron Notarization Guide](https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide)
