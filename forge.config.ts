import { MakerPKG } from '@electron-forge/maker-pkg';
import { MakerZIP } from '@electron-forge/maker-zip';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './src/Assets/AppLogo/256x256',
    name: 'Downlodr',
    executableName: 'Downlodr',
    extraResource: ['./src/Assets/AppLogo', './src/Assets/bin/yt-dlp_macos'],
    // App signing configuration for macOS
    appBundleId: 'com.downlodr.app',
    osxSign: {
      identity: 'Apple Development: Magtangol Roque (XM7C9JRJ82)',
    },
  },
  rebuildConfig: {},
  makers: [
    // macOS PKG installer (unsigned for development)
    new MakerPKG({
      name: 'Downlodr',
      // Skip signing - creates unsigned PKG for development/testing
    }),

    // macOS ZIP package
    new MakerZIP({}, ['darwin']),
  ],
  hooks: {
    postPackage: async (forgeConfig, packageResult) => {
      for (const outputPath of packageResult.outputPaths) {
        try {
          const platform = packageResult.platform;

          if (platform === 'darwin') {
            const binaryName = 'yt-dlp_macos';
            const sourcePath = path.resolve(
              __dirname,
              'src',
              'Assets',
              'bin',
              binaryName,
            );

            // Copy to Resources directory (this is where app resources go)
            const resourcesDir = path.join(
              outputPath,
              'Downlodr.app',
              'Contents',
              'Resources',
            );
            const destPath = path.join(resourcesDir, binaryName);

            if (existsSync(sourcePath)) {
              await fs.copyFile(sourcePath, destPath);
              console.log(`✅ Copied ${binaryName} to Resources directory`);

              // Make executable and code-sign to fix macOS issues
              execSync(`chmod +x "${destPath}"`);
              execSync(`codesign --force --deep --sign - "${destPath}"`);
              console.log(
                `✅ Code-signed ${binaryName} for macOS compatibility`,
              );
            } else {
              console.warn(`⚠️  ${binaryName} not found at ${sourcePath}`);
            }
          }
        } catch (error) {
          console.error('❌ Error in postPackage hook:', error);
        }
      }
    },
  },
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
