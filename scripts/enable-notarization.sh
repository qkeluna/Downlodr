#!/bin/bash

echo "🔐 Re-enabling notarization in forge.config.ts..."

# Uncomment the notarization configuration
sed -i '' 's|^    // osxNotarize:|    osxNotarize:|' forge.config.ts
sed -i '' 's|^    //   tool:|      tool:|' forge.config.ts
sed -i '' 's|^    //   appleId:|      appleId:|' forge.config.ts
sed -i '' 's|^    //   appleIdPassword:|      appleIdPassword:|' forge.config.ts
sed -i '' 's|^    //   teamId:|      teamId:|' forge.config.ts
sed -i '' 's|^    // } as any,|    } as any,|' forge.config.ts

echo "✅ Notarization re-enabled!"
echo ""
echo "🧪 Testing Apple credentials..."

# Test credentials
source .env
xcrun notarytool store-credentials "downlodr-notarization" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --validate

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Credentials valid! Ready to build notarized DMG:"
    echo "   npm run make"
else
    echo ""
    echo "❌ Credentials still invalid. Check Apple Developer agreements."
fi 