import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerPKG } from '@electron-forge/maker-pkg';
import { MakerZIP } from '@electron-forge/maker-zip';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import MakerNSIS from '@felixrieseberg/electron-forge-maker-nsis';
import fs from 'fs/promises';
import path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './src/Assets/AppLogo/256x256',
    name: 'Downlodr',
    executableName: 'Downlodr',
    extraResource: [
      './src/Assets/AppLogo',
      './yt-dlp_macos', // Include the macOS yt-dlp binary
    ],
    // macOS signing configuration
    osxSign: {
      identity: 'Developer ID Application: Magtangol Roque (36J4F965UC)',
      entitlements: './entitlements.plist',
      'entitlements-inherit': './entitlements.plist',
      'hardened-runtime': true,
      'gatekeeper-assess': false,
    } as any, // Type assertion to bypass strict typing

    // Notarization configuration
    // Note: Run with 'source .env && npm run make' to load environment variables
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    } as any,
  },
  rebuildConfig: {},
  makers: [
    // macOS DMG installer
    new MakerDMG({
      name: 'Downlodr',
      icon: './src/Assets/AppLogo/256x256.ico',
      format: 'ULFO',
      overwrite: true,
    }),

    // macOS PKG installer
    new MakerPKG({
      identity: 'Developer ID Installer: Magtangol Roque (36J4F965UC)', // Use installer identity
    }),

    // Windows NSIS installer
    new MakerNSIS({
      async getAppBuilderConfig() {
        return {
          nsis: {
            artifactName: '${productName}-${version}-${arch}.${ext}',
            oneClick: false,
            allowElevation: true,
            installerIcon: './src/Assets/AppLogo/256x256.ico',
            uninstallerIcon: './src/Assets/AppLogo/256x256.ico',
            allowToChangeInstallationDirectory: true,
            createDesktopShortcut: true,
            createStartMenuShortcut: true,
            shortcutName: 'Downlodr',
            uninstallDisplayName: 'Downlodr',
            deleteAppDataOnUninstall: false,
            warningsAsErrors: false,
            perMachine: false, // Changed to false - install per-user, not machine-wide
            include: './installer.nsh', // Keep this for admin privileges at runtime
          },
        };
      },
    }),

    // Cross-platform ZIP packages
    new MakerZIP({}, ['darwin', 'win32', 'linux']),
  ],
  hooks: {
    postPackage: async (forgeConfig, packageResult) => {
      const { execSync } = await import('child_process');
      const DEVELOPER_ID = 'D2DEA35BE4FA871AE56C94DE8F41BF4AD6D6CD6B';

      for (const outputPath of packageResult.outputPaths) {
        try {
          // Copy yt-dlp for Windows builds
          if (process.platform === 'win32') {
            await fs.copyFile(
              path.resolve(__dirname, 'yt-dlp.exe'),
              path.join(outputPath, 'yt-dlp.exe'),
            );
          }

          // Handle macOS yt-dlp binary and re-signing
          if (process.platform === 'darwin' && outputPath.includes('darwin')) {
            // Copy and set up yt-dlp_macos binary
            const bundledYtdlpPath = path.resolve(__dirname, 'yt-dlp_macos');
            const srcYtdlpPath = path.resolve(
              __dirname,
              'src/Assets/bin/yt-dlp_macos',
            );
            const appResourcesPath = path.join(
              outputPath,
              'Downlodr.app/Contents/Resources',
            );
            const ytdlpDestPath = path.join(appResourcesPath, 'yt-dlp_macos');

            try {
              // Remove any existing file or symlink
              if (
                await fs
                  .access(ytdlpDestPath)
                  .then(() => true)
                  .catch(() => false)
              ) {
                await fs.unlink(ytdlpDestPath);
              }

              // Priority: bundled yt-dlp_macos > src/Assets/bin/yt-dlp_macos
              let sourcePath: string;
              if (
                await fs
                  .access(bundledYtdlpPath)
                  .then(() => true)
                  .catch(() => false)
              ) {
                sourcePath = bundledYtdlpPath;
                console.log('📦 Using bundled yt-dlp_macos from project root');
              } else if (
                await fs
                  .access(srcYtdlpPath)
                  .then(() => true)
                  .catch(() => false)
              ) {
                sourcePath = srcYtdlpPath;
                console.log('📦 Using yt-dlp_macos from src/Assets/bin');
              } else {
                throw new Error('No yt-dlp_macos binary found in project');
              }

              // Copy the actual binary file (not a symlink)
              await fs.copyFile(sourcePath, ytdlpDestPath);

              // Make it executable
              await fs.chmod(ytdlpDestPath, '755');

              console.log('✅ Copied and made yt-dlp_macos executable');
            } catch (ytdlpError) {
              console.error('⚠️ Failed to set up yt-dlp_macos:', ytdlpError);
            }

            const frameworkPath = path.join(
              outputPath,
              'Downlodr.app/Contents/Frameworks/Electron Framework.framework/Versions/A',
            );
            const librariesPath = path.join(frameworkPath, 'Libraries');

            console.log('🔐 Re-signing Electron Framework libraries...');

            // Re-sign all dylibs in Libraries folder
            const libraries = [
              'libffmpeg.dylib',
              'libEGL.dylib',
              'libGLESv2.dylib',
              'libvk_swiftshader.dylib',
            ];
            for (const lib of libraries) {
              const libPath = path.join(librariesPath, lib);
              try {
                execSync(
                  `codesign --force --sign "${DEVELOPER_ID}" --options runtime "${libPath}"`,
                  { stdio: 'inherit' },
                );
                console.log(`✅ Re-signed ${lib}`);
              } catch (error) {
                console.error(`⚠️ Failed to re-sign ${lib}:`, error);
              }
            }

            // Re-sign chrome_crashpad_handler
            const crashpadPath = path.join(
              frameworkPath,
              'Helpers/chrome_crashpad_handler',
            );
            try {
              execSync(
                `codesign --force --sign "${DEVELOPER_ID}" --options runtime "${crashpadPath}"`,
                { stdio: 'inherit' },
              );
              console.log('✅ Re-signed chrome_crashpad_handler');
            } catch (error) {
              console.error(
                '⚠️ Failed to re-sign chrome_crashpad_handler:',
                error,
              );
            }

            // Sign the yt-dlp_macos binary
            try {
              execSync(
                `codesign --force --sign "${DEVELOPER_ID}" --options runtime "${ytdlpDestPath}"`,
                { stdio: 'inherit' },
              );
              console.log('✅ Signed yt-dlp_macos binary');
            } catch (error) {
              console.error('⚠️ Failed to sign yt-dlp_macos:', error);
            }

            // Re-sign the entire framework
            const fullFrameworkPath = path.join(
              outputPath,
              'Downlodr.app/Contents/Frameworks/Electron Framework.framework',
            );
            try {
              execSync(
                `codesign --force --deep --sign "${DEVELOPER_ID}" --options runtime "${fullFrameworkPath}"`,
                { stdio: 'inherit' },
              );
              console.log('✅ Re-signed Electron Framework');
            } catch (error) {
              console.error('⚠️ Failed to re-sign Electron Framework:', error);
            }

            // Re-sign the entire app bundle with entitlements (CRITICAL: must include entitlements for JIT permissions)
            const appPath = path.join(outputPath, 'Downlodr.app');
            const entitlementsPath = path.resolve(
              __dirname,
              'entitlements.plist',
            );
            try {
              execSync(
                `codesign --force --deep --sign "${DEVELOPER_ID}" --entitlements "${entitlementsPath}" --options runtime "${appPath}"`,
                { stdio: 'inherit' },
              );
              console.log('✅ Re-signed app bundle with entitlements');
            } catch (error) {
              console.error('⚠️ Failed to re-sign app bundle:', error);
            }
          }
        } catch (error) {
          console.error(`Failed to process ${outputPath}:`, error);
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
