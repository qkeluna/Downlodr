#!/usr/bin/env node

/**
 * Script to check notarization status of built packages
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔍 Checking Notarization Status\n");

const packages = [
  {
    name: "PKG Installer",
    path: "out/make/Downlodr.pkg",
    type: "install",
  },
  {
    name: "App Bundle",
    path: "out/Downlodr-darwin-arm64/Downlodr.app",
    type: "execute",
  },
];

packages.forEach((pkg) => {
  const fullPath = path.join(__dirname, "..", pkg.path);

  if (fs.existsSync(fullPath)) {
    console.log(`📦 ${pkg.name}:`);
    console.log(`   Path: ${pkg.path}`);

    try {
      const result = execSync(
        `spctl --assess --type ${pkg.type} -vv "${fullPath}" 2>&1`,
        { encoding: "utf8" }
      );

      if (result.includes("source=Notarized Developer ID")) {
        console.log("   ✅ Status: Notarized and ready for distribution!");
      } else if (result.includes("source=Developer ID")) {
        console.log("   ⚠️  Status: Signed but not notarized");
        console.log("   Users will see security warnings");
      } else if (result.includes("rejected")) {
        const source = result.match(/source=(.+)/)?.[1] || "Unknown";
        console.log(`   ❌ Status: Rejected (${source})`);
        console.log("   Users cannot install without overriding security");
      } else {
        console.log("   ❓ Status: Unknown");
        console.log(`   Output: ${result.trim()}`);
      }
    } catch (error) {
      // spctl returns non-zero exit code for rejected packages
      const output = error.stdout || error.message;
      if (output.includes("source=")) {
        const source = output.match(/source=(.+)/)?.[1] || "Unknown";
        console.log(`   ❌ Status: ${source}`);
      } else {
        console.log("   ❌ Error checking status:", error.message);
      }
    }
    console.log("");
  } else {
    console.log(`📦 ${pkg.name}: Not found at ${pkg.path}\n`);
  }
});

console.log("📋 Next Steps:\n");
console.log("If packages are not notarized:");
console.log("1. Set up your Apple credentials: node scripts/setup-env.js");
console.log("2. Rebuild with notarization: node scripts/build-macos-signed.js");
console.log("\nFor more details, see: docs/NOTARIZATION_GUIDE.md");
