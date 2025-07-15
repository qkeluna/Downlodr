#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Constants - Using SHA1 fingerprints to avoid ambiguity
const DEVELOPER_ID_APP = 'D2DEA35BE4FA871AE56C94DE8F41BF4AD6D6CD6B';
const DEVELOPER_ID_INSTALLER = 'D2DEA35BE4FA871AE56C94DE8F41BF4AD6D6CD6B'; // Using same cert for both
const TEAM_ID = '36J4F965UC';

console.log('🚀 Starting signed macOS build process...\n');

async function buildSigned() {
  try {
    // Step 1: Clean previous builds
    console.log('🧹 Cleaning previous builds...');
    try {
      execSync('rm -rf out', { stdio: 'inherit' });
    } catch (error) {
      // Ignore if out directory doesn't exist
    }

    // Step 2: Pre-build - fetch yt-dlp
    console.log('📥 Fetching yt-dlp binary...');
    execSync('node scripts/fetch-yt-dlp.js', { stdio: 'inherit' });

    // Step 3: Update forge config for signing
    console.log('⚙️ Updating Forge config for signing...');
    updateForgeConfigForSigning();

    // Step 4: Package the app
    console.log('📦 Packaging application...');
    execSync('npx electron-forge package --platform=darwin', {
      stdio: 'inherit',
    });

    // Step 5: Sign the app bundle
    console.log('✍️ Signing application bundle...');
    const appPath = findAppPath();
    if (appPath) {
      signAppBundle(appPath);
    } else {
      throw new Error('Could not find packaged app bundle');
    }

    // Step 6: Create signed PKG
    console.log('📦 Creating signed PKG installer...');
    createSignedPKG(appPath);

    // Step 7: Verify signatures
    console.log('🔍 Verifying signatures...');
    verifySignatures();

    console.log('\n✅ Signed build completed successfully!');
    console.log('📂 Output files available in: out/make/');
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

function updateForgeConfigForSigning() {
  // The forge.config.ts already has basic signing setup
  // This could be enhanced to dynamically update the config if needed
  console.log('Using existing forge configuration with signing...');
}

function findAppPath() {
  const outDir = path.join(process.cwd(), 'out');
  if (!fs.existsSync(outDir)) {
    return null;
  }

  // Look for the app bundle
  const dirs = fs.readdirSync(outDir);
  for (const dir of dirs) {
    const fullPath = path.join(outDir, dir);
    if (fs.statSync(fullPath).isDirectory()) {
      const appPath = path.join(fullPath, 'Downlodr.app');
      if (fs.existsSync(appPath)) {
        return appPath;
      }
    }
  }
  return null;
}

function signAppBundle(appPath) {
  try {
    // Sign the app bundle with Developer ID Application certificate and entitlements
    const entitlementsPath = path.join(process.cwd(), 'entitlements.plist');

    // First, check if entitlements file exists
    if (!fs.existsSync(entitlementsPath)) {
      console.warn(
        '⚠️ entitlements.plist not found, signing without entitlements',
      );
      const signCmd = `codesign --force --deep --sign "${DEVELOPER_ID_APP}" --options runtime "${appPath}"`;
      execSync(signCmd, { stdio: 'inherit' });
    } else {
      // Sign with entitlements
      const signCmd = `codesign --force --deep --sign "${DEVELOPER_ID_APP}" --options runtime --entitlements "${entitlementsPath}" "${appPath}"`;
      execSync(signCmd, { stdio: 'inherit' });
      console.log('✅ App bundle signed successfully with entitlements');
    }
  } catch (error) {
    throw new Error(`Failed to sign app bundle: ${error.message}`);
  }
}

function createSignedPKG(appPath) {
  try {
    // Ensure make directory exists
    const makeDir = path.join(process.cwd(), 'out', 'make');
    if (!fs.existsSync(makeDir)) {
      fs.mkdirSync(makeDir, { recursive: true });
    }

    // Get version from package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = packageJson.version;
    const pkgName = `Downlodr-${version}-arm64.pkg`;
    const pkgPath = path.join(makeDir, pkgName);

    // Create and sign PKG
    const pkgCmd = `productbuild --component "${appPath}" /Applications --sign "${DEVELOPER_ID_INSTALLER}" "${pkgPath}"`;
    execSync(pkgCmd, { stdio: 'inherit' });

    console.log(`✅ Signed PKG created: ${pkgName}`);

    // Show file size
    const stats = fs.statSync(pkgPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    console.log(`📊 PKG size: ${fileSizeMB}MB`);
  } catch (error) {
    throw new Error(`Failed to create signed PKG: ${error.message}`);
  }
}

function verifySignatures() {
  try {
    // Find the PKG file
    const makeDir = path.join(process.cwd(), 'out', 'make');
    const pkgFiles = fs.readdirSync(makeDir).filter((f) => f.endsWith('.pkg'));

    if (pkgFiles.length > 0) {
      const pkgPath = path.join(makeDir, pkgFiles[0]);

      console.log('\n🔍 Verifying PKG signature...');
      execSync(`pkgutil --check-signature "${pkgPath}"`, { stdio: 'inherit' });

      console.log('\n🔍 Verifying app bundle signature...');
      const appPath = findAppPath();
      if (appPath) {
        execSync(`codesign --verify --deep --verbose=2 "${appPath}"`, {
          stdio: 'inherit',
        });
      }
    }
  } catch (error) {
    console.warn('⚠️ Signature verification failed:', error.message);
  }
}

// Run the build
buildSigned();
