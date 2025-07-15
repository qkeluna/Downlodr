#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const YTDLP_VERSION = "2024.12.23";
const BINARY_NAME = "yt-dlp_macos";
const BINARY_DIR = path.join(__dirname, "..", "src", "Assets", "bin");
const BINARY_PATH = path.join(BINARY_DIR, BINARY_NAME);
const DOWNLOAD_URL = `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp_macos`;

// Check if binary needs to be downloaded
function needsDownload() {
  if (!fs.existsSync(BINARY_PATH)) {
    console.log("yt-dlp_macos binary not found, downloading...");
    return true;
  }

  // Check if binary is older than 24 hours
  const stats = fs.statSync(BINARY_PATH);
  const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);

  if (ageInHours > 24) {
    console.log(
      "yt-dlp_macos binary is older than 24 hours, downloading update..."
    );
    return true;
  }

  // Check if binary is empty (0 bytes)
  if (stats.size === 0) {
    console.log("yt-dlp_macos binary is empty, re-downloading...");
    return true;
  }

  return false;
}

// Function to remove quarantine attributes (macOS security feature)
function removeQuarantine(filePath) {
  if (process.platform === "darwin") {
    try {
      // Remove quarantine attribute
      execSync(
        `xattr -d com.apple.quarantine "${filePath}" 2>/dev/null || true`
      );
      // Make sure it's executable
      execSync(`chmod +x "${filePath}"`);
      console.log("✅ Removed quarantine attributes and made executable");
    } catch (error) {
      console.log("⚠️  Could not remove quarantine attributes:", error.message);
    }
  }
}

// Download using curl (more reliable than Node.js https)
function downloadBinaryWithCurl(url, outputPath) {
  try {
    console.log(`Downloading yt-dlp from: ${url}`);
    console.log(`Output path: ${outputPath}`);

    // Use curl to download with follow redirects
    execSync(`curl -L -o "${outputPath}" "${url}"`, { stdio: "inherit" });

    // Verify download
    const stats = fs.statSync(outputPath);
    if (stats.size === 0) {
      throw new Error("Downloaded file is empty");
    }

    console.log(
      `✅ Downloaded ${(stats.size / 1024 / 1024).toFixed(
        1
      )}MB to ${outputPath}`
    );

    // Remove quarantine and make executable
    removeQuarantine(outputPath);

    return true;
  } catch (error) {
    console.error("❌ Download failed:", error.message);
    throw error;
  }
}

// Main function
async function main() {
  try {
    if (needsDownload()) {
      // Ensure directory exists
      if (!fs.existsSync(BINARY_DIR)) {
        fs.mkdirSync(BINARY_DIR, { recursive: true });
      }

      downloadBinaryWithCurl(DOWNLOAD_URL, BINARY_PATH);
      console.log(`✅ yt-dlp_macos v${YTDLP_VERSION} ready at: ${BINARY_PATH}`);
    } else {
      console.log("yt-dlp_macos binary is up to date");
    }
  } catch (error) {
    console.error("❌ Failed to download yt-dlp_macos:", error.message);
    process.exit(1);
  }
}

// Run the main function
main();

module.exports = { main, BINARY_PATH };
