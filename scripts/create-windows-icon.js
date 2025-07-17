#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createWindowsIcon() {
  try {
    console.log('🪟 Creating Windows icon from SVG...');

    // Read SVG file
    const svgPath = path.join(
      __dirname,
      '../src/Assets/Logo/DownlodrLogo-NoName.svg',
    );
    const svgBuffer = fs.readFileSync(svgPath);

    // Create a 256x256 PNG first
    const tempPngPath = path.join(__dirname, '../temp-icon.png');

    console.log('📐 Generating 256x256 PNG...');
    await sharp(svgBuffer).resize(256, 256).png().toFile(tempPngPath);

    // Convert PNG to ICO using sips (macOS tool)
    console.log('🔨 Converting to ICO format...');
    const { execSync } = require('child_process');
    const icoPath = path.join(__dirname, '../src/Assets/AppLogo/Downlodr.ico');

    // Use sips to convert PNG to ICO
    execSync(`sips -s format ico "${tempPngPath}" --out "${icoPath}"`);

    // Clean up temp file
    fs.unlinkSync(tempPngPath);

    console.log(`✅ Successfully created: ${icoPath}`);
    console.log('🎉 Windows icon creation complete!');
  } catch (error) {
    console.error('❌ Error creating Windows icon:', error);
    process.exit(1);
  }
}

createWindowsIcon();
