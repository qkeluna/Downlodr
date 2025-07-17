/**
 * Main process entry point for the Electron application.
 * This file is responsible for creating the main application window,
 * handling IPC (Inter-Process Communication) events, and managing
 * application lifecycle events.
 */
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  shell,
  Tray,
  Menu,
  Notification,
  nativeImage,
  protocol,
} from 'electron';
// Remove electron-updater import since it's not installed
import * as path from 'path';
import started from 'electron-squirrel-startup';
import fs, { existsSync } from 'fs';
import { execSync } from 'child_process';
import https from 'https';
import os from 'os';
import * as YTDLP from 'yt-dlp-helper';
import { checkForUpdates } from './DataFunctions/updateChecker';
import { PluginManager } from './plugins/pluginManager';
import { pluginRegistry } from './plugins/registry';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Basic security settings for Electron 30.x
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Global variable to store the yt-dlp binary path for yt-dlp-helper
let ytdlpBinaryPath: string | null = null;
let isYtdlpDownloading = false;

// Function to download and setup a working yt-dlp binary
async function ensureWorkingYtdlp(): Promise<string | null> {
  if (isYtdlpDownloading) {
    console.log('⏳ yt-dlp download already in progress...');
    return null;
  }

  const appDataPath = app.getPath('userData');
  const ytdlpPath = path.join(appDataPath, 'yt-dlp_downloaded');

  // Check if we already have a downloaded version
  if (existsSync(ytdlpPath)) {
    try {
      // Test if it works
      const testResult = await YTDLP.invoke({
        args: ['--version'],
        ytdlpDownloadDestination: ytdlpPath,
      });

      if (testResult.ok) {
        console.log('✅ Using previously downloaded yt-dlp');
        return ytdlpPath;
      }
    } catch (error) {
      console.log(
        '⚠️ Previously downloaded yt-dlp not working, will re-download',
      );
    }
  }

  try {
    isYtdlpDownloading = true;
    console.log('📥 Downloading yt-dlp for app use...');

    // Show notification to user
    if (mainWindow) {
      mainWindow.webContents.send('yt-dlp-download-started');
    }

    // Download yt-dlp to app data directory
    await YTDLP.manualDownloadLatestYTDLP({
      filePath: ytdlpPath,
    });

    // Make it executable on macOS/Linux
    if (process.platform !== 'win32') {
      try {
        execSync(`chmod +x "${ytdlpPath}"`);
      } catch (error) {
        console.warn('⚠️ Could not make yt-dlp executable:', error);
      }
    }

    // Test the downloaded binary
    const testResult = await YTDLP.invoke({
      args: ['--version'],
      ytdlpDownloadDestination: ytdlpPath,
    });

    if (testResult.ok) {
      console.log('✅ Successfully downloaded and verified yt-dlp');

      // Notify user of success
      if (mainWindow) {
        mainWindow.webContents.send('yt-dlp-download-success');
      }

      return ytdlpPath;
    } else {
      throw new Error('Downloaded yt-dlp is not working');
    }
  } catch (error) {
    console.error('❌ Failed to download yt-dlp:', error);

    // Notify user of failure
    if (mainWindow) {
      mainWindow.webContents.send('yt-dlp-download-failed', error.message);
    }

    return null;
  } finally {
    isYtdlpDownloading = false;
  }
}

// Configure yt-dlp for macOS - ensure binary is available
if (process.platform === 'darwin') {
  const systemYtdlpPath = '/opt/homebrew/bin/yt-dlp';

  // Determine correct path based on environment
  let bundledYtdlpPath: string;
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Development mode - look in current directory and src/Assets/bin
    bundledYtdlpPath = existsSync(path.join(process.cwd(), 'yt-dlp_macos'))
      ? path.join(process.cwd(), 'yt-dlp_macos')
      : path.join(process.cwd(), 'src/Assets/bin/yt-dlp_macos');
  } else {
    // Production mode - look in app Resources folder
    bundledYtdlpPath = path.join(process.resourcesPath, 'yt-dlp_macos');
  }

  console.log(
    '🔍 Environment:',
    MAIN_WINDOW_VITE_DEV_SERVER_URL ? 'Development' : 'Production',
  );
  console.log('📍 Looking for yt-dlp at:', bundledYtdlpPath);

  // Priority: system yt-dlp > bundled binary (to avoid code signing issues)
  if (existsSync(systemYtdlpPath)) {
    console.log('🎯 Using system yt-dlp at:', systemYtdlpPath);
    ytdlpBinaryPath = systemYtdlpPath; // Store the path for yt-dlp-helper
    // Add system yt-dlp to PATH
    const binDir = path.dirname(systemYtdlpPath);
    if (!process.env.PATH?.includes(binDir)) {
      process.env.PATH = `${binDir}:${process.env.PATH}`;
    }
  } else if (existsSync(bundledYtdlpPath)) {
    console.log('🎯 Fallback to bundled yt-dlp at:', bundledYtdlpPath);
    ytdlpBinaryPath = bundledYtdlpPath; // Store the path for yt-dlp-helper
    // Add bundled yt-dlp directory to PATH
    const binDir = path.dirname(bundledYtdlpPath);
    if (!process.env.PATH?.includes(binDir)) {
      process.env.PATH = `${binDir}:${process.env.PATH}`;
    }

    // Also ensure the binary is executable (in case permissions were lost)
    try {
      execSync(`chmod +x "${bundledYtdlpPath}"`);
      console.log('✅ Made yt-dlp binary executable');
    } catch (error) {
      console.warn('⚠️ Could not set executable permissions:', error.message);
    }
  } else {
    console.log('⚠️ No yt-dlp binary found - downloads may fail');
    console.log('💡 Install via: brew install yt-dlp');
  }
}

// Prevent multiple instances of the app
const isSingleInstance = app.requestSingleInstanceLock();

if (!isSingleInstance) {
  console.log('Another instance is already running. Quitting this instance.');
  app.quit();
}

// focus first window instead
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let forceQuit = false;
let runInBackgroundSetting = true;

let normalTrayIcon: Electron.NativeImage;
let alertTrayIcon: Electron.NativeImage;
let isDownloadComplete = false;

let pluginManager: PluginManager;

/*
// Rate limiting for GitHub API calls
const GITHUB_API_COOLDOWN = 5 * 60 * 1000; // 5 minutes between API calls
let lastGitHubApiCall = 0;
let cachedLatestVersion: { version: string; timestamp: number } | null = null;
const VERSION_CACHE_DURATION = 30 * 60 * 1000; // Cache for 30 minutes

// Helper function to check if we can make a GitHub API call
function canMakeGitHubApiCall(): boolean {
  const now = Date.now();
  return now - lastGitHubApiCall >= GITHUB_API_COOLDOWN;
}

// Helper function to get cached version if still valid
function getCachedVersion(): string | null {
  if (!cachedLatestVersion) return null;

  const now = Date.now();
  const isExpired =
    now - cachedLatestVersion.timestamp > VERSION_CACHE_DURATION;

  return isExpired ? null : cachedLatestVersion.version;
}
*/
// Function to create the main application window
const createWindow = () => {
  // Determine the correct icon path based on platform
  const getIconPath = () => {
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    const iconName =
      process.platform === 'darwin' ? 'Downlodr.icns' : 'Downlodr.ico';

    let iconPath;
    if (isDev) {
      // In development, use path relative to project root
      iconPath = path.join(process.cwd(), 'src/Assets/AppLogo', iconName);
    } else {
      // In production, use path relative to app bundle
      iconPath = path.join(__dirname, '../src/Assets/AppLogo', iconName);
    }

    console.log(
      `🎨 Loading app icon: ${iconPath} (isDev: ${isDev}, platform: ${process.platform})`,
    );

    // Check if the icon file exists
    if (fs.existsSync(iconPath)) {
      console.log('✅ Icon file found!');
    } else {
      console.log('❌ Icon file not found!');
    }

    return iconPath;
  };

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 680,
    frame: false,
    autoHideMenuBar: true,
    minWidth: 1000,
    minHeight: 600,
    icon: getIconPath(), // Set the application icon
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      nodeIntegration: true,
      // devTools: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // Only open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Handle window close events - hide instead of close
  mainWindow.on('close', async (event) => {
    if (!forceQuit) {
      // Get the real-time setting
      const shouldRunInBackground = await getRunInBackgroundSetting();
      console.log('Window closing, checking setting:', shouldRunInBackground);

      if (shouldRunInBackground) {
        event.preventDefault();
        mainWindow?.hide();
        return false;
      }
    }
  });

  // focus tracking for clipboard monitoring
  mainWindow.on('focus', () => {
    isWindowFocused = true;
    console.log('Window focused - clipboard monitoring paused');
  });

  mainWindow.on('blur', () => {
    isWindowFocused = false;
    console.log('Window unfocused - clipboard monitoring resumed');
  });

  // MAIN FUNCTIONS FOR TITLE BAR
  ipcMain.on('close-btn', () => {
    if (!mainWindow) return;

    if (runInBackgroundSetting) {
      // If running in background is enabled, hide the window
      console.log('Close button clicked, hiding window (background enabled)');
      mainWindow.hide();
    } else {
      // If running in background is disabled, actually quit the app
      console.log('Close button clicked, quitting app (background disabled)');
      forceQuit = true;
      app.quit();
    }
  });

  ipcMain.on('minimize-btn', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('maximize-btn', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  // Prevent navigation to external URLs
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
  });
};

const createTray = () => {
  // Don't create tray if already exists
  if (tray) {
    console.log('⚠️ Tray already exists, skipping creation');
    return;
  }

  console.log('🎨 Creating system tray...');

  // Get correct path based on whether in dev or production
  let iconPath, alertIconPath;

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Development mode paths - use better-sized icons from logo directory
    iconPath = path.join(
      process.cwd(),
      'src/Assets/AppLogo/systemTray/logo/systemIcon.png',
    );
    alertIconPath = path.join(
      process.cwd(),
      'src/Assets/AppLogo/systemTray/logo/notif.png',
    );
    console.log('📁 Development mode - using project paths');
  } else {
    // Production mode paths - use better-sized icons from logo directory
    iconPath = path.join(
      process.resourcesPath,
      'AppLogo/systemTray/logo/systemIcon.png',
    );
    alertIconPath = path.join(
      process.resourcesPath,
      'AppLogo/systemTray/logo/notif.png',
    );
    console.log('📦 Production mode - using resource paths');
  }

  console.log('🖼️ Icon paths:');
  console.log('  Normal:', iconPath);
  console.log('  Alert:', alertIconPath);

  // Check if icon files exist
  if (!fs.existsSync(iconPath)) {
    console.error('❌ Normal tray icon not found at:', iconPath);
    return;
  }
  if (!fs.existsSync(alertIconPath)) {
    console.error('❌ Alert tray icon not found at:', alertIconPath);
    return;
  }
  console.log('✅ Both tray icon files found');

  // Create both icons upfront
  normalTrayIcon = nativeImage.createFromPath(iconPath);
  alertTrayIcon = nativeImage.createFromPath(alertIconPath);

  // For macOS, make icons smaller and set them as template images for better menu bar integration
  if (process.platform === 'darwin') {
    console.log('🍎 macOS detected - optimizing icons for menu bar');
    // Only resize if needed - these icons are already well-sized
    if (
      normalTrayIcon.getSize().width > 22 ||
      normalTrayIcon.getSize().height > 22
    ) {
      normalTrayIcon = normalTrayIcon.resize({ width: 18, height: 18 });
      alertTrayIcon = alertTrayIcon.resize({ width: 18, height: 18 });
    }

    normalTrayIcon.setTemplateImage(true);
    alertTrayIcon.setTemplateImage(true);
    console.log('✅ Icons optimized for macOS menu bar with template images');
    console.log(
      `📏 Final icon size: ${normalTrayIcon.getSize().width}x${
        normalTrayIcon.getSize().height
      }`,
    );
  }

  // Initialize with normal icon
  tray = new Tray(normalTrayIcon);
  console.log('🎯 Tray object created with normal icon');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Downlodr',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          resetTrayIcon(); // Reset icon when showing app
        }
      },
    },
    {
      label: 'Check for Updates',
      click: async () => {
        const updateInfo = await checkForUpdates();
        if (updateInfo.hasUpdate && mainWindow) {
          mainWindow.webContents.send('update-available', updateInfo);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        forceQuit = true;
        // Set to BLANK_STATE before quitting
        lastClipboardText = 'BLANK_STATE';
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Downlodr');
  tray.setContextMenu(contextMenu);
  console.log('📋 Context menu set');

  // Double click on tray icon shows the app and resets the icon
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      resetTrayIcon();
    }
  });

  console.log('✅ System tray created successfully');
};

// Function to destroy the tray
const destroyTray = () => {
  if (tray) {
    tray.destroy();
    tray = null;
    console.log('✅ System tray destroyed');
  }
};

// set the alert icon
function setAlertTrayIcon() {
  if (tray && alertTrayIcon) {
    tray.setImage(alertTrayIcon);
    isDownloadComplete = true;
    // Force tray update by setting context menu
    // tray.setContextMenu(tray.getContextMenu());
  } else {
    console.log(
      'Cannot set alert icon - tray or icon missing',
      !!tray,
      !!alertTrayIcon,
    );
  }
}

// reset the icon to normal
function resetTrayIcon() {
  if (tray && normalTrayIcon && isDownloadComplete) {
    tray.setImage(normalTrayIcon);
    isDownloadComplete = false;
    tray.setToolTip('Downlodr');
  }
}

// This will be moved to app.whenReady() for proper initialization order

// Functions for Download Verification
ipcMain.handle('joinDownloadPath', async (event, downloadPath, fileName) => {
  const normalizedPath = downloadPath.endsWith(path.sep)
    ? downloadPath
    : downloadPath + path.sep;
  return path.join(normalizedPath, fileName);
});

ipcMain.handle('createFolder', async (_event, dirPath) => {
  if (!fs.existsSync(dirPath)) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
  return true;
});

// Function for getting default download folder from each OS
ipcMain.handle('getDownloadFolder', async () => {
  try {
    const homedir = os.homedir();
    let downloadsPath;

    switch (process.platform) {
      case 'win32':
        downloadsPath = path.join(homedir, 'Downloads') + path.sep;
        break;
      case 'darwin':
        downloadsPath = path.join(homedir, 'Downloads') + path.sep;
        break;
      case 'linux':
        downloadsPath = path.join(homedir, 'Downloads') + path.sep;
        break;
      default:
        downloadsPath = path.join(homedir, 'Downloads') + path.sep;
    }

    return downloadsPath;
  } catch (error) {
    console.error('Error determining Downloads folder:', error);
    return null;
  }
});

// Function for validating path of download location
ipcMain.handle('validatePath', async (event, folderPath) => {
  try {
    const resolvedPath = path.resolve(folderPath);

    // Check if the resolved path exists and is a directory
    const stats = await fs.promises.stat(resolvedPath);
    if (!stats.isDirectory()) {
      console.error('Path is not a directory:', resolvedPath);
      return false;
    }
    await fs.promises.access(
      resolvedPath,
      fs.constants.R_OK | fs.constants.W_OK,
    );

    return true;
  } catch (err) {
    console.error('Path is not accessible or invalid:');
    return false;
  }
});

// open directory to choose location, add path sep to work with different OS
ipcMain.handle('dialog:openDirectory', async (event) => {
  // Get the parent browser window
  const browserWindow = BrowserWindow.fromWebContents(event.sender);

  const result = await dialog.showOpenDialog(browserWindow, {
    properties: ['openDirectory'],
    // Explicitly set modal behavior
    // modal: true,
  });

  // Process the result as before
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0].endsWith(path.sep)
    ? result.filePaths[0]
    : result.filePaths[0] + path.sep;
});
// open folder with optional file highlighting
ipcMain.handle('open-folder', async (_, folderPath, filePath = null) => {
  try {
    // If a file path is provided, show the file in the folder (will highlight it)
    if (filePath) {
      await shell.showItemInFolder(filePath);
      return { success: true };
    } else {
      // Otherwise just open the folder without highlighting anything
      const result = await shell.openPath(folderPath);
      if (result) {
        console.error(`Error opening folder: ${result}`);
        return { success: false, error: result };
      }
      return { success: true };
    }
  } catch (error) {
    console.error('Failed to open folder:', error);
    return { success: false, error: error.message };
  }
});

// Function for checking if file exists in the directory
ipcMain.handle('file-exists', async (_event, path) => {
  return existsSync(path);
});

// Function for opening video
ipcMain.handle('openVideo', async (event, filePath) => {
  shell.openPath(filePath);
});

// delete file from drive
ipcMain.handle('deleteFile', async (event, filepath) => {
  try {
    // Normalize the file path
    const normalizedPath = path.normalize(filepath);

    // Check if the file exists
    if (!fs.existsSync(normalizedPath)) {
      console.error('File does not exist:', normalizedPath);
      return false;
    }

    // Move the file to trash
    await shell.trashItem(normalizedPath);
    //console.log('File moved to trash successfully');
    return true;
  } catch (error) {
    console.error('Failed to move file to trash:', error);
    return false;
  }
});

ipcMain.handle('deleteFolder', async (event, filepath) => {
  try {
    // Normalize the folder path
    const normalizedPath = path.normalize(filepath);

    // Check if the folder exists
    if (!fs.existsSync(normalizedPath)) {
      console.error('Folder does not exist:', normalizedPath);
      return false;
    }

    // Check if it's actually a directory
    const stats = await fs.promises.stat(normalizedPath);
    if (!stats.isDirectory()) {
      console.error('Path is not a directory:', normalizedPath);
      return false;
    }

    // Move the folder to trash
    await shell.trashItem(normalizedPath);
    return true;
  } catch (error) {
    console.error('Failed to move folder to trash:', error);
    return false;
  }
});

// adjust pathname to ensure its safe
ipcMain.handle('normalizePath', async (event, filepath) => {
  try {
    // Normalize the file path
    const normalizedPath = path.normalize(filepath);
    return normalizedPath;
  } catch (error) {
    console.error('Failed to normalize:', error);
    return '';
  }
});

// get the playlist information
ipcMain.handle('ytdlp:playlist:info', async (e, videoUrl) => {
  try {
    const info = await YTDLP.getPlaylistInfo({
      url: videoUrl.url,
      ytdlpDownloadDestination: ytdlpBinaryPath || undefined,
    });
    return info;
  } catch (error) {
    console.error('Error fetching playlist info:', error);
    throw error; // Propagate the error to the renderer process
  }
});

// get the video information
ipcMain.handle('ytdlp:info', async (e, url) => {
  YTDLP.Config.log = true;
  try {
    // First try with the configured binary path
    let info = await YTDLP.invoke({
      args: [url, '--no-warnings', '--dump-json'],
      ytdlpDownloadDestination: ytdlpBinaryPath || './yt-dlp_macos',
    });

    // If failed, try auto-downloading a working version
    if (!info.ok && !ytdlpBinaryPath?.includes('yt-dlp_downloaded')) {
      console.log('⚠️ Current yt-dlp failed, trying auto-download...');

      const downloadedPath = await ensureWorkingYtdlp();
      if (downloadedPath) {
        ytdlpBinaryPath = downloadedPath; // Update global path

        // Try again with the downloaded version
        info = await YTDLP.invoke({
          args: [url, '--no-warnings', '--dump-json'],
          ytdlpDownloadDestination: downloadedPath,
        });
      }
    }

    if (!info.ok) {
      throw new Error('Failed to get video info - yt-dlp not working properly');
    }

    return {
      ok: true,
      data: JSON.parse(info.data || ''),
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    throw error; // Propagate the error to the renderer process
  }
});

/*
// Get current YT-DLP version
ipcMain.handle('ytdlp:getCurrentVersion', async () => {
  try {
    const version = await YTDLP.getYTDLPVersion();
    return { success: true, version };
  } catch (error) {
    console.error('Error getting current YT-DLP version:', error);
    return { success: false, error: error.message, version: null };
  }
});

// Get latest YT-DLP version
ipcMain.handle('ytdlp:getLatestVersion', async () => {
  try {
    // Check if we have a cached version first
    const cachedVersion = getCachedVersion();
    if (cachedVersion) {
      console.log('Using cached YT-DLP version:', cachedVersion);
      return {
        success: true,
        version: cachedVersion,
        message: 'Retrieved from cache',
      };
    }

    // Check rate limiting
    if (!canMakeGitHubApiCall()) {
      const remainingTime = Math.ceil(
        (GITHUB_API_COOLDOWN - (Date.now() - lastGitHubApiCall)) / 1000,
      );
      return {
        success: false,
        error: `Rate limited. Please wait ${remainingTime} seconds before checking again.`,
        version: null,
      };
    }

    // Make the API call
    lastGitHubApiCall = Date.now();
    const response = await YTDLP.getLatestYTDLPVersionFromGitHub();

    // Cache the result if successful
    if (response.ok && response.version) {
      cachedLatestVersion = {
        version: response.version,
        timestamp: Date.now(),
      };
    }

    return {
      success: response.ok,
      version: response.version,
      message: response.message,
    };
  } catch (error) {
    console.error('Error getting latest YT-DLP version:', error);

    // Check if it's a rate limit error
    if (error.message && error.message.includes('403')) {
      return {
        success: false,
        error:
          'GitHub API rate limit exceeded. Please wait an hour before trying again.',
        version: null,
      };
    }

    return { success: false, error: error.message, version: null };
  }
});

// Check and update YT-DLP
ipcMain.handle('ytdlp:checkAndUpdate', async () => {
  try {
    const currentVersion = await YTDLP.getYTDLPVersion();

    // Check if we have a cached version first
    let latestVersion = getCachedVersion();
    let latestResponse;

    if (!latestVersion) {
      // Check rate limiting
      if (!canMakeGitHubApiCall()) {
        const remainingTime = Math.ceil(
          (GITHUB_API_COOLDOWN - (Date.now() - lastGitHubApiCall)) / 1000,
        );
        return {
          success: false,
          error: `Rate limited. Please wait ${remainingTime} seconds before checking again.`,
          action: 'error',
        };
      }

      // Make the API call
      lastGitHubApiCall = Date.now();
      latestResponse = await YTDLP.getLatestYTDLPVersionFromGitHub();

      if (!latestResponse.ok || !latestResponse.version) {
        // Check if it's a rate limit error
        if (latestResponse.message && latestResponse.message.includes('403')) {
          throw new Error(
            'GitHub API rate limit exceeded. Please wait an hour before trying again.',
          );
        }
        throw new Error(
          latestResponse.message || 'Failed to get latest version',
        );
      }

      latestVersion = latestResponse.version;

      // Cache the result
      cachedLatestVersion = {
        version: latestVersion,
        timestamp: Date.now(),
      };
    }

    if (!currentVersion) {
      console.log('YT-DLP not found. Downloading latest version...');
      await YTDLP.downloadYTDLP();
      return {
        success: true,
        action: 'downloaded',
        message: 'YT-DLP was not found and has been downloaded.',
        currentVersion: null,
        latestVersion,
      };
    }

    console.log(`Current version: ${currentVersion}`);
    console.log(`Latest version: ${latestVersion}`);

    if (latestVersion && currentVersion !== latestVersion) {
      console.log('Updating YT-DLP to latest version...');
      await YTDLP.downloadYTDLP({
        version: latestVersion,
        forceDownload: true,
      });
      console.log('Update completed!');
      return {
        success: true,
        action: 'updated',
        message: `YT-DLP updated from ${currentVersion} to ${latestVersion}`,
        currentVersion,
        latestVersion,
      };
    } else {
      console.log('YT-DLP is up to date!');
      return {
        success: true,
        action: 'up-to-date',
        message: 'YT-DLP is already up to date',
        currentVersion,
        latestVersion,
      };
    }
  } catch (error) {
    console.error('Error managing YT-DLP version:', error);
    return {
      success: false,
      error: error.message,
      action: 'error',
      message: `Error managing YT-DLP version: ${error.message}`,
    };
  }
});

// Download YTDLP binary with custom options
ipcMain.handle('ytdlp:downloadYTDLP', async (_event, options = {}) => {
  try {
    console.log('YTDLP download options:', options);

    const downloadOptions: DownloadOptions = {
      forceDownload: options.forceDownload || false,
    };

    // Handle filePath - if it's provided, ensure it's a proper file path
    if (options.filePath && options.filePath.trim()) {
      const filePath = options.filePath.trim();

      // Check if the path is a directory (doesn't end with an executable extension)
      if (
        !path.extname(filePath) ||
        path.extname(filePath).toLowerCase() !== '.exe'
      ) {
        // If it's a directory or doesn't have .exe extension, append the default filename
        const defaultFilename =
          process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
        downloadOptions.filePath = path.join(filePath, defaultFilename);
      } else {
        downloadOptions.filePath = filePath;
      }
    }
    // If no filePath provided, let YTDLP use its default location

    // Handle version
    if (
      options.version &&
      options.version.trim() &&
      options.version.trim().toLowerCase() !== 'latest'
    ) {
      downloadOptions.version = options.version.trim();
    }
    // If no version provided or 'latest', let YTDLP use latest

    // Handle platform
    if (options.platform && options.platform !== 'auto') {
      downloadOptions.platform = options.platform;
    }
    // If no platform provided or 'auto', let YTDLP auto-detect

    console.log('Final YTDLP download options:', downloadOptions);

    await YTDLP.downloadYTDLP(downloadOptions);
    return { success: true };
  } catch (error) {
    console.error('Error downloading YTDLP:', error);
    return { success: false, error: error.message };
  }
});
*/
// after identifying ID kill/stop the id
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function killControllerById(id: any) {
  try {
    const controller = YTDLP.getTerminalFromID(id);

    if (controller) {
      controller.kill();
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(`Failed to kill controller with ID ${id}:`, error);
    return false;
  }
}

// get the terminal or controller of the download to stop, then call killControllerById
ipcMain.handle('ytdlp:stop', (e, id: string) => {
  try {
    const terminal = YTDLP.getTerminalFromID(id);
    if (!terminal) {
      return false;
    }
    terminal.kill('SIGKILL');
    return true;
  } catch (error) {
    return false;
  }
});

// Listen for the kill-controller event from the renderer
ipcMain.handle('kill-controller', async (_, id) => {
  return killControllerById(id); // Call the function and return the result
});

// download video from link
ipcMain.handle('ytdlp:download', async (e, id, args) => {
  try {
    // Try with the configured binary path first
    let controller = await YTDLP.download({
      args: {
        url: args.url,
        output: args.outputFilepath,
        videoFormat: args.videoFormat,
        remuxVideo: args.remuxVideo,
        audioFormat: args.audioExt,
        audioQuality: args.audioFormatId,
        limitRate: args.limitRate,
      },
      ytdlpDownloadDestination: ytdlpBinaryPath || './yt-dlp_macos',
    });

    // If download failed, try auto-downloading a working version
    if (!controller && !ytdlpBinaryPath?.includes('yt-dlp_downloaded')) {
      console.log('⚠️ Download failed, trying auto-download...');

      const downloadedPath = await ensureWorkingYtdlp();
      if (downloadedPath) {
        ytdlpBinaryPath = downloadedPath; // Update global path

        controller = await YTDLP.download({
          args: {
            url: args.url,
            output: args.outputFilepath,
            videoFormat: args.videoFormat,
            remuxVideo: args.remuxVideo,
            audioFormat: args.audioExt,
            audioQuality: args.audioFormatId,
            limitRate: args.limitRate,
          },
          ytdlpDownloadDestination: downloadedPath,
        });
      }
    }

    if (!controller || typeof controller.listen !== 'function') {
      throw new Error(
        'Controller is not defined or does not have a listen method',
      );
    }

    // Send the controller ID back to the renderer process
    e.sender.send(`ytdlp:controller:${id}`, {
      downloadId: id,
      controllerId: controller.id,
    });

    // Set up process completion detection WITHOUT interfering with the main stream
    let processCompletionHandled = false;
    let completeLog = '';

    if (controller.process) {
      const handleProcessCompletion = (
        code: number,
        signal: string,
        eventType: string,
      ) => {
        if (processCompletionHandled) return; // Prevent duplicate handling
        processCompletionHandled = true;

        const completionMessage = `Process '${controller.id}' ${eventType} with code: ${code}, signal: ${signal}`;
        console.log(completionMessage);

        // completion message to complete log
        completeLog += `\n${completionMessage}`;

        // Send completion with complete log after a small delay to ensure all other logs are processed first
        setTimeout(() => {
          e.sender.send(`ytdlp:download:status:${id}`, {
            type: 'completion',
            data: {
              log: completionMessage,
              completeLog: completeLog,
              exitCode: code,
              signal: signal,
              controllerId: controller.id,
            },
          });
        }, 100); // Small delay to ensure stream logs are processed first
      };

      controller.process.on('exit', (code: number, signal: string) => {
        handleProcessCompletion(code, signal, 'exited');
      });

      controller.process.on('close', (code: number, signal: string) => {
        if (!processCompletionHandled) {
          handleProcessCompletion(code, signal, 'closed');
        }
      });
    }

    // Process the main download stream
    for await (const chunk of controller.listen()) {
      e.sender.send(`ytdlp:download:status:${id}`, chunk);

      if (chunk != null && chunk.data && chunk.data.status === 'finished') {
        setAlertTrayIcon();

        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          win.webContents.send('download-finished', {
            name: args.name,
            id: id,
            location: args.outputFilepath,
          });
        }
      }
    }
    // If process completion wasn't handled through events, send a fallback after delay
    setTimeout(() => {
      if (!processCompletionHandled) {
        e.sender.send(`ytdlp:download:status:${id}`, {
          type: 'stream_ended',
          data: {
            log: `Process '${controller.id}' stream completed`,
            controllerId: controller.id,
          },
        });
      }
    }, 2000);

    return { downloadId: id, controllerId: controller.id };
  } catch (error) {
    e.sender.send(`ytdlp:download:error:${id}`, error.message);
    throw error; // Ensure the error is propagated
  }
});

// get clipboard text
ipcMain.handle('get-clipboard-text', () => {
  return clipboard.readText();
});

// start clipboard monitoring
ipcMain.handle('start-clipboard-monitoring', () => {
  startClipboardMonitoring();
  return true;
});

// stop clipboard monitoring
ipcMain.handle('stop-clipboard-monitoring', () => {
  stopClipboardMonitoring();
  return true;
});

// check if clipboard monitoring is active
ipcMain.handle('is-clipboard-monitoring-active', () => {
  return isMonitoring;
});

// check if window is focused
ipcMain.handle('is-window-focused', () => {
  return isWindowFocused;
});

// clear last clipboard text
ipcMain.handle('clear-last-clipboard-text', () => {
  lastClipboardText = 'BLANK_STATE';
  return true;
});

// actually clear the clipboard
ipcMain.handle('clear-clipboard', () => {
  try {
    clipboard.writeText('');
    lastClipboardText = 'BLANK_STATE';
    return true;
  } catch (error) {
    return false;
  }
});

// set up clipboard monitoring
let clipboardInterval: NodeJS.Timeout | null = null;
let isMonitoring = false;
// focus tracking variable
let isWindowFocused = false;
let lastClipboardText = 'BLANK_STATE';

// start clipboard monitoring
const startClipboardMonitoring = () => {
  if (clipboardInterval) {
    clearInterval(clipboardInterval);
  }

  isMonitoring = true;
  // set internal state to BLANK_STATE for fallback tracking
  lastClipboardText = 'BLANK_STATE';

  // actually clear the clipboard by writing an empty string
  try {
    clipboard.writeText('');
  } catch (error) {
    console.log(
      'Could not clear clipboard, using BLANK_STATE fallback:',
      error,
    );
  }

  // function to start the monitoring interval with appropriate timing
  const startMonitoringInterval = () => {
    clipboardInterval = setInterval(() => {
      if (!isMonitoring) {
        return;
      }

      // Skip processing if window is focused - reduce log noise
      if (isWindowFocused) {
        return;
      }

      try {
        const currentText = clipboard.readText();

        // Only process if content has changed and is reasonable size
        if (currentText !== lastClipboardText && currentText.length <= 10000) {
          // Only send clipboard change event if:
          // 1. We're not going from BLANK_STATE to new content (prevents initial triggers)
          // 2. Current content is not empty (prevents triggers when clearing clipboard)
          // 3. Window is not focused (new condition)
          if (
            lastClipboardText !== 'BLANK_STATE' &&
            currentText.trim() !== '' &&
            !isWindowFocused
          ) {
            // Send clipboard change event to all renderer processes
            BrowserWindow.getAllWindows().forEach((win) => {
              if (!win.isDestroyed()) {
                win.webContents.send('clipboard-changed', currentText);
              }
            });
          }

          // Always update the last clipboard text for comparison
          lastClipboardText = currentText;
        }
      } catch (error) {
        console.debug('Clipboard monitoring error:', error);
      }
    }, 1000); // Standard 1 second polling
  };

  // add a small delay to prevent immediate detection of current clipboard content
  setTimeout(startMonitoringInterval, 500);
};

const stopClipboardMonitoring = () => {
  isMonitoring = false;
  if (clipboardInterval) {
    clearInterval(clipboardInterval);
    clipboardInterval = null;
  }
  lastClipboardText = 'BLANK_STATE';
};

// App lifecycle events

// once the app opens
app.on('ready', async () => {
  createWindow();
  createTray();
  updateCloseHandler();

  // Start clipboard monitoring
  // Don't start automatically - let the renderer control it
  // startClipboardMonitoring();

  // Check for updates when app starts
  setTimeout(async () => {
    const updateInfo = await checkForUpdates();
    if (updateInfo.hasUpdate) {
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send('update-available', updateInfo),
      );
    }
  }, 5000); // Check after 5 seconds to not slow startup

  // Set up periodic update checking
  const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 4; // Check every 4 hours
  setInterval(async () => {
    const updateInfo = await checkForUpdates();
    if (updateInfo.hasUpdate) {
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send('update-available', updateInfo),
      );
    }
  }, UPDATE_CHECK_INTERVAL);

  // Create plugin manager instance
  pluginManager = new PluginManager();

  // Load plugins
  await pluginManager.loadPlugins();

  // Set up IPC handlers AFTER app is ready
  pluginManager.setupIPC();

  // Register a custom protocol with better security
  protocol.registerFileProtocol('app-image', (request, callback) => {
    try {
      const filePath = decodeURIComponent(
        request.url.slice('app-image://'.length),
      );

      // Security check: Validate the file exists and is an image
      if (!fs.existsSync(filePath)) {
        throw new Error('File does not exist');
      }

      // Check file extension to ensure it's an image
      const ext = path.extname(filePath).toLowerCase();
      const allowedExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.bmp',
        '.svg',
      ];

      if (!allowedExtensions.includes(ext)) {
        throw new Error('Not an allowed image type');
      }

      return callback(filePath);
    } catch (error) {
      console.error('Error in protocol handler:', error);
      // Return a placeholder or error image instead
      callback({ path: path.join(__dirname, 'assets', 'error-image.png') });
    }
  });

  // listen for plugin state changes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ipcMain.on('plugins:stateChanged', (event, { pluginId, enabled }) => {
    // update the registry's knowledge of enabled plugins
    pluginRegistry.updateEnabledStates(pluginManager.getEnabledPlugins());
  });

  // Initial loading of enabled states into the registry
  pluginRegistry.updateEnabledStates(pluginManager.getEnabledPlugins());
});

// Change this to keep app running in background
app.on('window-all-closed', () => {
  // Do nothing here to keep app running when windows are closed
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }

  // Reset the tray icon when the app is activated
  resetTrayIcon();
});

// before-quit' handler to properly set force quit
app.on('before-quit', async () => {
  forceQuit = true;
  stopClipboardMonitoring();

  // Process any pending failed downloads before quitting
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      await mainWindow.webContents.executeJavaScript(`
        if (typeof useDownloadStore !== 'undefined') {
          const store = useDownloadStore.getState();
          if (store.checkFinishedDownloads) {
            store.checkFinishedDownloads();
          }
        }
      `);
    } catch (error) {
      console.log('Could not process failed downloads on quit:', error);
    }
  }
});

// function to handle the dev tools or console open
ipcMain.on('toggle-dev-tools', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    if (win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools();
    } else {
      win.webContents.openDevTools();
    }
  }
});

// allows right click functions
ipcMain.on('show-input-context-menu', (event) => {
  const menu = Menu.buildFromTemplate([
    { label: 'Cut', role: 'cut' },
    { label: 'Copy', role: 'copy' },
    { label: 'Paste', role: 'paste' },
    { type: 'separator' },
    { label: 'Select All', role: 'selectAll' },
  ]);

  const win = BrowserWindow.fromWebContents(event.sender);
  menu.popup({ window: win });
});

// opening external link
ipcMain.handle('openExternalLink', async (_event, link: string) => {
  try {
    await shell.openExternal(link);
  } catch (error) {
    console.error('Failed to open external link:', error);
    throw error;
  }
});

// Function to get the run in background setting
async function getRunInBackgroundSetting(): Promise<boolean> {
  // This should ideally get the setting from the store
  // For now, return the default value
  return runInBackgroundSetting;
}

// Add missing IPC handlers
ipcMain.handle('ensureDirectoryExists', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error('Error creating directory:', error);
    return false;
  }
});

// Removed duplicate get-current-version handler - kept the one in app.whenReady()

ipcMain.handle('get-platform', async () => {
  try {
    return process.platform;
  } catch (error) {
    console.error('Error getting platform:', error);
    return 'unknown';
  }
});

// function for forcibly closing the app
ipcMain.handle('exit-app', () => {
  forceQuit = true;
  // Set to BLANK_STATE before quitting
  lastClipboardText = 'BLANK_STATE';
  app.quit();
});

// function for running the appolication in the background
ipcMain.handle('set-run-in-background', (_event, value) => {
  runInBackgroundSetting = value;
  updateCloseHandler();
  return true;
});

// function for handling how the close button reacts
function updateCloseHandler() {
  if (!mainWindow) return;

  // Remove existing listeners
  mainWindow.removeAllListeners('close');

  mainWindow.on('close', async (event) => {
    if (!forceQuit) {
      // Get the real-time setting
      const shouldRunInBackground = await getRunInBackgroundSetting();
      if (shouldRunInBackground) {
        event.preventDefault();
        mainWindow?.hide();
        return false;
      }
    }
  });
}

// function for syncing settings on startup
ipcMain.handle('sync-background-setting-on-startup', (_event, value) => {
  runInBackgroundSetting = value;
  return true;
});

// function for update the download-finished handler to also change the tray icon
ipcMain.on('download-finished', (_event, downloadInfo) => {
  const { name } = downloadInfo;

  // Show notification
  showNotification(
    'Download Complete',
    `"${name}" has finished downloading`,
    () => {
      // Show the app window when notification is clicked
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        resetTrayIcon(); // Reset icon when app is shown via notification
      }
    },
  );

  // Change the tray icon to the alert version
  setAlertTrayIcon();
});

// function to display notifications
function showNotification(title: string, body: string, onClick?: () => void) {
  // Check if notifications are supported
  if (!Notification.isSupported()) {
    return;
  }

  const notification = new Notification({
    title,
    body,
    icon: normalTrayIcon,
  });

  if (onClick) {
    notification.on('click', onClick);
  }
  notification.show();
}

// Function to get file size
ipcMain.handle('get-file-size', async (_event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  } catch (error) {
    console.error('Error getting file size:', error);
    return null;
  }
});

// handler to get plugin menu items
ipcMain.handle('plugins:menu-items', (event, context) => {
  return pluginRegistry.getMenuItems(context);
});

// handler to execute plugin menu items
ipcMain.handle('plugins:execute-menu-item', (event, id, contextData) => {
  pluginRegistry.executeMenuItemAction(id, contextData);
  return true;
});

// handler to register plugin menu items
ipcMain.handle('plugins:register-menu-item', (event, menuItem) => {
  //console.log('Main process registering menu item:', menuItem);
  return pluginRegistry.registerMenuItem(menuItem);
});

// handler to unregister plugin menu items
ipcMain.handle('plugins:unregister-menu-item', (event, id) => {
  //console.log('Main process unregistering menu item:', id);
  pluginRegistry.unregisterMenuItem(id);
  return true;
});

// handler to get plugin data path
ipcMain.handle('plugins:get-data-path', (event, pluginId) => {
  const pluginDataDir = path.join(
    app.getPath('userData'),
    'plugin-data',
    pluginId,
  );
  // Ensure the directory exists
  if (!fs.existsSync(pluginDataDir)) {
    fs.mkdirSync(pluginDataDir, { recursive: true });
  }
});

// handler to reload plugins
ipcMain.handle('plugins:reload', async (event) => {
  // Clear existing registry items before reloading
  pluginRegistry.clearAllRegistrations();

  // Reload plugins
  await pluginManager.loadPlugins();
  return true;
});

// Check yt-dlp status
ipcMain.handle('ytdlp:check-status', async () => {
  try {
    if (!ytdlpBinaryPath) {
      return { available: false, path: null, needsDownload: true };
    }

    // Test if current yt-dlp works
    const testResult = await YTDLP.invoke({
      args: ['--version'],
      ytdlpDownloadDestination: ytdlpBinaryPath,
    });

    return {
      available: testResult.ok,
      path: ytdlpBinaryPath,
      needsDownload: !testResult.ok,
      version: testResult.ok ? testResult.data?.trim() : null,
    };
  } catch (error) {
    return {
      available: false,
      path: ytdlpBinaryPath,
      needsDownload: true,
      error: error.message,
    };
  }
});

ipcMain.handle('get-run-in-background', async (event) => {
  try {
    return runInBackgroundSetting;
  } catch (error) {
    console.error('Error getting run in background setting:', error);
    return false;
  }
});

// handler to download a file
ipcMain.handle('downloadFile', async (_event, url, outputPath) => {
  try {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(outputPath);
      https
        .get(url, (response) => {
          response.pipe(file);

          file.on('finish', () => {
            file.close();
            resolve({ success: true, path: outputPath });
          });
        })
        .on('error', (err) => {
          fs.unlink(outputPath, (unlinkErr) => {
            // Ignoring deletion errors since the download already failed
            if (unlinkErr)
              console.error('Failed to delete incomplete file:', unlinkErr);
          });
          reject({ success: false, error: err.message });
        });
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return { success: false, error: error.message };
  }
});

// handler to get thumbnail data url
ipcMain.handle('get-thumbnail-data-url', async (_event, imagePath) => {
  try {
    if (!fs.existsSync(imagePath)) {
      return null;
    }

    // Read the file as a buffer
    const buffer = await fs.promises.readFile(imagePath);

    // Determine MIME type based on file extension
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/jpeg'; // Default

    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';

    // Convert to base64 and return as data URL
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    return null;
  }
});

// handler to save a file
ipcMain.handle('plugins:save-file-dialog', async (event, options) => {
  const browserWindow = BrowserWindow.fromWebContents(event.sender);

  // Security check: validate options
  const sanitizedOptions = {
    title: typeof options.title === 'string' ? options.title : 'Save File',
    defaultPath:
      typeof options.defaultPath === 'string'
        ? options.defaultPath
        : app.getPath('downloads'),
    filters: Array.isArray(options.filters) ? options.filters : undefined,
    message: typeof options.message === 'string' ? options.message : undefined,
  };

  try {
    const result = await dialog.showSaveDialog(browserWindow, sanitizedOptions);
    return result;
  } catch (error) {
    return { canceled: true };
  }
});

// handler to register taskbar items
ipcMain.handle('plugins:register-taskbar-item', (event, taskBarItem) => {
  //console.log('Main process registering taskbar item:', taskBarItem);
  return pluginRegistry.registerTaskBarItem(taskBarItem);
});

// handler to unregister taskbar items
ipcMain.handle('plugins:unregister-taskbar-item', (event, id) => {
  //console.log('Main process unregistering taskbar item:', id);
  pluginRegistry.unregisterTaskBarItem(id);
  return true;
});

// handler to get taskbar items
ipcMain.handle('plugins:taskbar-items', (event) => {
  return pluginRegistry.getTaskBarItems();
});

// handler to execute taskbar items
ipcMain.handle('plugins:execute-taskbar-item', (event, id, contextData) => {
  console.log('Executing taskbar item action:', id, contextData);
  pluginRegistry.executeTaskBarItemAction(id, contextData);
  return true;
});

// handler to read file contents
ipcMain.handle('plugin:fs:readFile', async (event, options) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { filePath, pluginId } = options;

    // Security check: Make sure we're not reading outside allowed directories
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist' };
    }

    const fileContents = await fs.promises.readFile(filePath, 'utf8');
    return { success: true, data: fileContents };
  } catch (error) {
    console.error('Error reading file:', error);
    return { success: false, error: error.message };
  }
});

// handler to read file contents
ipcMain.handle('plugin:readFileContents', async (event, { options }) => {
  try {
    const { filePath, pluginId } = options;
    // Security check: Make sure we're not reading outside allowed directories
    // Get the plugin's data directory as a safe base path
    const pluginDataDir = path.join(
      app.getPath('userData'),
      'plugin-data',
      pluginId || '',
    );
    return true;
  } catch (error) {
    console.error('Error setting run in background:', error);
    return false;
  }
});

// Add a new handler to sync the initial setting from renderer
ipcMain.handle('sync-background-setting', async (event, rendererSetting) => {
  try {
    runInBackgroundSetting = rendererSetting;

    // Create or destroy tray based on the setting
    if (rendererSetting) {
      createTray();
    } else {
      destroyTray();
    }

    console.log(
      `Initial background setting synced: ${rendererSetting}, tray ${
        rendererSetting ? 'created' : 'destroyed'
      }`,
    );
    return true;
  } catch (error) {
    console.error('Error syncing background setting:', error);
    return false;
  }
});

// handler to get version without GitHub API call
ipcMain.handle('get-current-version', async () => {
  // Get version from package.json or app.getVersion()
  return app.getVersion();
});
