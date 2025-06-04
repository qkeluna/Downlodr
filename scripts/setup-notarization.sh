#!/bin/bash

# Script to help set up Apple notarization credentials

echo "🔐 Setting up Apple Notarization Credentials"
echo "==========================================="
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env file with template
cat > .env << 'EOF'
# Apple Developer Credentials for Code Signing and Notarization
# Fill in your actual credentials below

# Your Apple ID (email address associated with your Apple Developer account)
APPLE_ID=your.email@example.com

# App-specific password generated from https://appleid.apple.com/account/manage
# Go to Security > App-Specific Passwords > Generate Password
APPLE_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Your Apple Developer Team ID
APPLE_TEAM_ID=36J4F965UC

# Your signing identity (already set correctly)
APPLE_IDENTITY="Developer ID Application: Magtangol Roque (36J4F965UC)"
EOF

echo "✅ Created .env file with template"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env and replace:"
echo "   - APPLE_ID with your Apple ID email"
echo "   - APPLE_PASSWORD with your app-specific password"
echo ""
echo "2. To generate an app-specific password:"
echo "   a. Go to https://appleid.apple.com/account/manage"
echo "   b. Sign in with your Apple ID"
echo "   c. Navigate to Security > App-Specific Passwords"
echo "   d. Click 'Generate Password'"
echo "   e. Name it 'Electron Forge' or similar"
echo "   f. Copy the generated password (xxxx-xxxx-xxxx-xxxx format)"
echo ""
echo "3. After updating .env, run:"
echo "   source .env && npm run make"
echo ""

# Make the script executable
chmod +x scripts/setup-notarization.sh 