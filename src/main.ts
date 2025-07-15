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
let isWindowFocused = false;
let lastClipboardText = 'BLANK_STATE';

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
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1250,
    height: 680,
    frame: false,
    autoHideMenuBar: true,
    minWidth: 900,
    minHeight: 600,
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

  // Add focus tracking for clipboard monitoring
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
  // Get correct path based on whether in dev or production
  let iconPath, alertIconPath;

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Development mode paths
    iconPath = path.join(
      process.cwd(),
      'src/Assets/AppLogo/systemTray/systemTray.png',
    );
    alertIconPath = path.join(
      process.cwd(),
      'src/Assets/AppLogo/systemTray/systemNotif.png',
    );
  } else {
    // Production mode paths
    iconPath = path.join(
      process.resourcesPath,
      'AppLogo/systemTray/systemTray.png', // "C:\Users\Mikaela\Desktop\Development\codebase\Electron\v2\Electron\ui_downlodr_v2\src\Assets\AppLogo\systemTray\systemIcon.svg"
    );
    alertIconPath = path.join(
      process.resourcesPath,
      'AppLogo/systemTray/systemNotif.png',
    );
  }

  // Create both icons upfront
  normalTrayIcon = nativeImage.createFromPath(iconPath);
  alertTrayIcon = nativeImage.createFromPath(alertIconPath);

  // Initialize with normal icon
  tray = new Tray(normalTrayIcon);

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

  // Double click on tray icon shows the app and resets the icon
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      resetTrayIcon();
    }
  });
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

// IPC handlers for various functionalities
ipcMain.on('openExternalLink', (_event, link: string) => {
  shell.openExternal(link);
});

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
    const completeLog = '';

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

        // Send completion event to renderer
        e.sender.send(`ytdlp:download:status:${id}`, {
          type: 'completion',
          data: {
            log: completionMessage,
            exitCode: code,
            signal: signal,
            controllerId: controller.id,
          },
        });
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

    return { downloadId: id, controllerId: controller.id };
  } catch (error) {
    e.sender.send(`ytdlp:download:error:${id}`, error.message);
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

ipcMain.handle('get-current-version', async () => {
  try {
    // Return the app version from package.json
    return app.getVersion();
  } catch (error) {
    console.error('Error getting version:', error);
    return '1.4.15-stable';
  }
});

ipcMain.handle('clear-clipboard', async () => {
  try {
    clipboard.clear();
    return true;
  } catch (error) {
    console.error('Error clearing clipboard:', error);
    return false;
  }
});

ipcMain.handle('plugins:taskbar-items', async () => {
  try {
    // Return empty array for now - this should be implemented by plugin system
    return [];
  } catch (error) {
    console.error('Error getting taskbar items:', error);
    return [];
  }
});

ipcMain.handle('downloadFile', async (event, url, filename, path) => {
  try {
    // This should trigger the same download logic as ytdlp:download
    // For now, return success - the actual download logic is handled elsewhere
    return { success: true, path: path };
  } catch (error) {
    console.error('Error in downloadFile handler:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-thumbnail-data-url', async (event, videoId) => {
  try {
    // Return default thumbnail or generate one
    // For now, return null - thumbnails are optional
    return null;
  } catch (error) {
    console.error('Error getting thumbnail:', error);
    return null;
  }
});

ipcMain.handle('get-file-size', async (event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  } catch (error) {
    console.error('Error getting file size:', error);
    return null;
  }
});

// Manual yt-dlp download handler
ipcMain.handle('ytdlp:download-binary', async () => {
  try {
    const downloadedPath = await ensureWorkingYtdlp();
    if (downloadedPath) {
      ytdlpBinaryPath = downloadedPath; // Update global path
      return { success: true, path: downloadedPath };
    } else {
      return { success: false, error: 'Failed to download yt-dlp' };
    }
  } catch (error) {
    console.error('Error downloading yt-dlp manually:', error);
    return { success: false, error: error.message };
  }
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

ipcMain.handle('set-run-in-background', async (event, value) => {
  try {
    // Store the setting (this should ideally persist to a config file)
    runInBackgroundSetting = value;
    return true;
  } catch (error) {
    console.error('Error setting run in background:', error);
    return false;
  }
});

ipcMain.handle('stop-clipboard-monitoring', async (event) => {
  try {
    // Stop clipboard monitoring logic would go here
    console.log('Clipboard monitoring stopped');
    return true;
  } catch (error) {
    console.error('Error stopping clipboard monitoring:', error);
    return false;
  }
});

// App initialization
app.whenReady().then(() => {
  createWindow();
  createTray();

  // Initialize plugin manager
  pluginManager = new PluginManager();
  pluginManager.setupIPC();

  // macOS specific behavior
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Auto-updater for production builds
  if (!MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Check for updates on app start (using custom update checker)
    setTimeout(() => {
      // Use our custom update checker instead of electron-updater
      checkForUpdates().then((updateInfo) => {
        if (updateInfo.hasUpdate && mainWindow) {
          mainWindow.webContents.send('update-available', updateInfo);
        }
      });
    }, 3000);
  }
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle application quit
app.on('before-quit', () => {
  forceQuit = true;
});

// Handle deep links (if needed)
app.setAsDefaultProtocolClient('downlodr');

// Security: prevent navigation to external URLs and new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (
      parsedUrl.origin !== 'http://localhost:5173' &&
      parsedUrl.protocol !== 'file:'
    ) {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});
