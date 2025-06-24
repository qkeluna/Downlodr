#!/usr/bin/env node

/**
 * Build script for creating signed and notarized macOS distributions
 *
 * Usage: node scripts/build-macos-signed.js
 *
 * Prerequisites:
 * 1. Create a .env file with your Apple credentials (see docs/ENV_TEMPLATE.md)
 * 2. Ensure you have Developer ID certificates installed
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

// Validate environment variables
const requiredEnvVars = ["APPLE_ID", "APPLE_PASSWORD", "APPLE_TEAM_ID"];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error("\nPlease create a .env file with your Apple credentials.");
  console.error("See docs/ENV_TEMPLATE.md for the template.");
  process.exit(1);
}

console.log("🔧 Building Downlodr for macOS with code signing...\n");

// Step 1: Clean previous builds
console.log("📦 Cleaning previous builds...");
const outDir = path.join(__dirname, "..", "out");
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}

// Step 2: Run the build
console.log("🏗️  Building the application...");
try {
  execSync("npm run make", {
    stdio: "inherit",
    env: {
      ...process.env,
      // Ensure environment variables are passed to the build
      APPLE_ID: process.env.APPLE_ID,
      APPLE_PASSWORD: process.env.APPLE_PASSWORD,
      APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
      APPLE_IDENTITY: process.env.APPLE_IDENTITY,
      APPLE_PKG_IDENTITY: process.env.APPLE_PKG_IDENTITY,
    },
  });
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}

// Step 3: Verify the build outputs
console.log("\n✅ Build completed! Checking outputs...\n");

const makeDir = path.join(outDir, "make");
if (fs.existsSync(makeDir)) {
  // List all created packages
  const files = [];

  function findPackages(dir) {
    const items = fs.readdirSync(dir);
    items.forEach((item) => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findPackages(fullPath);
      } else if (
        item.endsWith(".pkg") ||
        item.endsWith(".zip") ||
        item.endsWith(".dmg")
      ) {
        files.push(fullPath);
      }
    });
  }

  findPackages(makeDir);

  if (files.length > 0) {
    console.log("📦 Created packages:");
    files.forEach((file) => {
      const size = (fs.statSync(file).size / 1024 / 1024).toFixed(2);
      console.log(`   - ${path.relative(process.cwd(), file)} (${size} MB)`);
    });

    // Verify PKG signature if created
    const pkgFile = files.find((f) => f.endsWith(".pkg"));
    if (pkgFile) {
      console.log("\n🔍 Verifying PKG signature...");
      try {
        const result = execSync(`pkgutil --check-signature "${pkgFile}"`, {
          encoding: "utf8",
        });
        if (result.includes("Status: signed")) {
          console.log("✅ PKG is properly signed!");
        } else {
          console.log("⚠️  PKG signature verification output:", result);
        }
      } catch (error) {
        console.error("❌ PKG signature verification failed:", error.message);
      }
    }

    // Check app bundle signature
    const appPath = path.join(outDir, "Downlodr-darwin-arm64", "Downlodr.app");
    if (fs.existsSync(appPath)) {
      console.log("\n🔍 Verifying app bundle signature...");
      try {
        execSync(`codesign --verify --deep --verbose=2 "${appPath}"`, {
          stdio: "inherit",
        });
        console.log("✅ App bundle is properly signed!");
      } catch (error) {
        console.error("❌ App bundle signature verification failed");
      }
    }

    console.log(
      "\n🎉 Build successful! Your signed packages are ready for distribution."
    );
    console.log("\n📋 Next steps:");
    console.log("1. Test the installation on a clean macOS system");
    console.log(
      "2. If notarization was successful, users should be able to install without security warnings"
    );
    console.log(
      '3. If you see "unidentified developer" warnings, check the notarization logs'
    );
  } else {
    console.error("❌ No packages were created");
    process.exit(1);
  }
} else {
  console.error("❌ Make directory not found");
  process.exit(1);
}
