const { notarize } = require("@electron/notarize");
const path = require("path");

async function notarizeApp(appPath) {
  console.log("🔐 Starting notarization process...");

  if (
    !process.env.APPLE_ID ||
    !process.env.APPLE_PASSWORD ||
    !process.env.APPLE_TEAM_ID
  ) {
    console.error("❌ Missing notarization credentials!");
    console.error(
      "Please set APPLE_ID, APPLE_PASSWORD, and APPLE_TEAM_ID environment variables.",
    );
    return;
  }

  try {
    await notarize({
      appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });
    console.log("✅ Notarization successful!");
  } catch (error) {
    console.error("❌ Notarization failed:", error);
    throw error;
  }
}

// If called directly
if (require.main === module) {
  const appPath = process.argv[2];
  if (!appPath) {
    console.error("Usage: node notarize.js <path-to-app>");
    process.exit(1);
  }

  notarizeApp(appPath)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { notarizeApp };
