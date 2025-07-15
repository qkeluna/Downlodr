# Notarization Setup Guide

To eliminate the macOS security warning, you need to set up notarization with Apple.

## Prerequisites

✅ You have Developer ID Application certificate (for signing apps)
✅ You have Developer ID Installer certificate (for signing PKG files)  
❓ You need to set up notarization credentials

## Step 1: Get Apple Credentials

### 1. Apple ID

Use your Apple Developer account email.

### 2. App-Specific Password

1. Go to https://appleid.apple.com/account/manage
2. Navigate to **Sign-In and Security** > **App-Specific Passwords**
3. Click **Generate Password**
4. Label it "Downlodr Notarization"
5. Save the generated password

### 3. Team ID

1. Go to https://developer.apple.com/account
2. Click **Membership Details**
3. Copy your Team ID (yours is: `36J4F965UC`)

## Step 2: Set Environment Variables

Create a `.env` file in the project root:

```bash
# Apple Developer Account for Notarization
APPLE_ID=your-apple-id@example.com
APPLE_APP_SPECIFIC_PASSWORD=your-app-specific-password
APPLE_TEAM_ID=36J4F965UC
```

## Step 3: Build Notarized App

```bash
npm run make
```

The build process will now:

1. Sign the app with your Developer ID
2. Upload to Apple for notarization
3. Wait for Apple approval
4. Create signed, notarized DMG and PKG files

## Result

✅ No more security warnings on user machines
✅ Professional distribution-ready installers
✅ Users can install with just double-click

## Troubleshooting

If notarization fails:

- Check your Apple ID credentials
- Ensure app-specific password is correct
- Verify Team ID matches your account
- Check Apple Developer account is in good standing
