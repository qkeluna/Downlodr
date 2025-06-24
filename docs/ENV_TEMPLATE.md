# Environment Variables Template for macOS Code Signing

Create a `.env` file in your project root with the following content:

```bash
# Apple Developer Credentials for Code Signing and Notarization
# Replace these with your actual values

# Your Apple ID (email address)
APPLE_ID=your.email@example.com

# App-specific password from appleid.apple.com
# To create one:
# 1. Go to https://appleid.apple.com/account/manage
# 2. Sign in with your Apple ID
# 3. Navigate to Security > App-Specific Passwords
# 4. Click "Generate Password"
# 5. Name it "Downlodr Notarization"
# Format: xxxx-xxxx-xxxx-xxxx
APPLE_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Your Team ID (from your certificate)
APPLE_TEAM_ID=36J4F965UC

# Developer ID Application certificate for app signing
APPLE_IDENTITY="Developer ID Application: Magtangol Roque (36J4F965UC)"

# Developer ID Installer certificate for PKG signing
APPLE_PKG_IDENTITY="Developer ID Installer: Magtangol Roque (36J4F965UC)"
```

## Important Notes

1. **Never commit the .env file** - It's already in .gitignore
2. **App-specific password** is different from your Apple ID password
3. **Team ID** can be found in your Apple Developer account or certificate details
4. **Certificate names** must match exactly what's shown in `security find-identity -v -p codesigning`
