const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function signBinary(binaryPath) {
  console.log(`🔐 Signing ${path.basename(binaryPath)}...`);

  const identity =
    process.env.APPLE_IDENTITY ||
    "Developer ID Application: Magtangol Roque (36J4F965UC)";

  try {
    // Sign with hardened runtime, timestamp, and entitlements
    const signCommand = `codesign --force --deep --sign "${identity}" --timestamp --options runtime "${binaryPath}"`;

    console.log("Running:", signCommand);
    execSync(signCommand, { stdio: "inherit" });

    // Verify the signature
    execSync(`codesign --verify --verbose "${binaryPath}"`, {
      stdio: "inherit",
    });

    console.log(`✅ Successfully signed ${path.basename(binaryPath)}`);
  } catch (error) {
    console.error(
      `❌ Failed to sign ${path.basename(binaryPath)}:`,
      error.message,
    );
    throw error;
  }
}

// Sign the yt-dlp binary in the source directory
const ytDlpPath = path.join(
  __dirname,
  "..",
  "src",
  "Assets",
  "bin",
  "yt-dlp_macos",
);

if (fs.existsSync(ytDlpPath)) {
  signBinary(ytDlpPath);
} else {
  console.error(`❌ yt-dlp_macos not found at ${ytDlpPath}`);
  process.exit(1);
}
