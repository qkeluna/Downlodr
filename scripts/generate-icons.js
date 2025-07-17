#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define the sizes needed for macOS iconset
const iconSizes = [
  { size: 16, name: 'icon_16x16.png' },
  { size: 32, name: 'icon_16x16@2x.png' },
  { size: 32, name: 'icon_32x32.png' },
  { size: 64, name: 'icon_32x32@2x.png' },
  { size: 128, name: 'icon_128x128.png' },
  { size: 256, name: 'icon_128x128@2x.png' },
  { size: 256, name: 'icon_256x256.png' },
  { size: 512, name: 'icon_256x256@2x.png' },
  { size: 512, name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' },
];

async function generateIcons() {
  try {
    console.log('🎨 Generating Downlodr app icons from SVG...');

    // Create temporary directory for icon generation
    const tempDir = 'temp-icon-generation';
    const iconsetDir = path.join(tempDir, 'Downlodr.iconset');

    if (!fs.existsSync(iconsetDir)) {
      fs.mkdirSync(iconsetDir, { recursive: true });
    }

    // Read SVG file
    const svgPath = path.join(
      __dirname,
      '../src/Assets/Logo/DownlodrLogo-NoName.svg',
    );
    const svgBuffer = fs.readFileSync(svgPath);

    console.log('🍎 Creating macOS .icns file...');
    console.log('📐 Generating iconset sizes...');

    // Generate all required sizes for macOS iconset
    for (const { size, name } of iconSizes) {
      const outputPath = path.join(iconsetDir, name);
      console.log(`  - Creating ${name} (${size}x${size})`);

      await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
    }

    console.log('🔨 Creating .icns file...');

    // Use iconutil to create the .icns file
    const icnsPath = path.join(
      __dirname,
      '../src/Assets/AppLogo/Downlodr.icns',
    );
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);

    console.log(`✅ Successfully created: ${icnsPath}`);

    console.log('🪟 Creating Windows .ico file...');

    // Create a 256x256 PNG for Windows icon
    const tempPngPath = path.join(tempDir, 'temp-icon.png');

    console.log('📐 Generating 256x256 PNG...');
    await sharp(svgBuffer).resize(256, 256).png().toFile(tempPngPath);

    // Convert PNG to ICO using sips (macOS tool)
    console.log('🔨 Converting to ICO format...');
    const icoPath = path.join(__dirname, '../src/Assets/AppLogo/Downlodr.ico');

    // Use sips to convert PNG to ICO
    execSync(`sips -s format ico "${tempPngPath}" --out "${icoPath}"`);

    console.log(`✅ Successfully created: ${icoPath}`);

    // Clean up temporary directory
    console.log('🧹 Cleaning up...');
    execSync(`rm -rf "${tempDir}"`);

    console.log('🎉 Icon generation complete!');
    console.log('📱 macOS will use: Downlodr.icns');
    console.log('🪟 Windows will use: Downlodr.ico');
    console.log('');
    console.log('To test the new icons, run: npm start');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
