/**
 * Main process entry point for the Electron application.
 * This file is responsible for creating the main application window,
 * handling IPC (Inter-Process Communication) events, and managing
 * application lifecycle events.
 */
import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu,
  Tray,
  nativeImage,
} from 'electron';
import path from 'path';
import started from 'electron-squirrel-startup';
import os from 'os';
import * as YTDLP from 'yt-dlp-helper';
import fs, { existsSync } from 'fs';
import { checkForUpdates } from './DataFunctions/updateChecker';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// Add these variables at the top level, outside any functions
let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let forceQuit = false;
let runInBackgroundSetting = true; // Default value

// Request a single instance lock
const gotTheSingleInstanceLock = app.requestSingleInstanceLock();
// Move the function to module scope
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

// Add this function to dynamically update the close handler
function updateCloseHandler() {
  if (!mainWindow) return;

  // Remove existing listeners
  mainWindow.removeAllListeners('close');

  // Add the updated handler
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
}

// Use a function to get the current setting instead of a variable
async function getRunInBackgroundSetting() {
  // You could implement your own persistent storage here instead
  return runInBackgroundSetting;
}

// If we failed to get the lock, it means another instance is already running
if (!gotTheSingleInstanceLock) {
  console.log('Another instance is already running - quitting this one');
  app.exit(0); // Use exit instead of quit for immediate termination
} else {
  // This is the first/main instance - set up second-instance handler
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Function to create the main application window
  const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 1100,
      height: 680,
      frame: false,
      autoHideMenuBar: true,
      minWidth: 550,
      minHeight: 450,
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
    mainWindow.webContents.on('will-navigate', (event, url) => {
      event.preventDefault();
    });
  };

  const createTray = () => {
    // Get correct path based on whether in dev or production
    let iconPath;

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      // Development mode - use the path relative to project root
      iconPath = path.join(
        process.cwd(),
        'src/Assets/AppLogo/systemTrayIcon.png',
      );
    } else {
      // Production mode - assets should be in the resources directory
      iconPath = path.join(
        process.resourcesPath,
        'src/Assets/AppLogo/systemTrayIcon.png',
      );
    }

    console.log('Loading tray icon from:', iconPath);
    console.log('Icon exists:', fs.existsSync(iconPath));

    const icon = nativeImage.createFromPath(iconPath);

    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Downlodr',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
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
          app.quit();
        },
      },
    ]);

    tray.setToolTip('Downlodr');
    tray.setContextMenu(contextMenu);

    // Double click on tray icon shows the app
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
      }
    });
  };

  // IPC handlers for various functionalities
  ipcMain.on('openExternalLink', (_event, link: string) => {
    //console.log('link received', link);
    shell.openExternal(link);
  });

  // Functions for Download Verification
  ipcMain.handle('joinDownloadPath', async (event, downloadPath, fileName) => {
    const normalizedPath = downloadPath.endsWith(path.sep)
      ? downloadPath
      : downloadPath + path.sep;
    return path.join(normalizedPath, fileName);
  });

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

  ipcMain.handle('validatePath', async (event, folderPath) => {
    try {
      const resolvedPath = path.resolve(folderPath);

      // Check if the resolved path exists and is a directory
      const stats = await fs.promises.stat(resolvedPath);
      if (!stats.isDirectory()) {
        console.error('Path is not a directory:', resolvedPath);
        return false;
      }

      // Check if the directory is accessible
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
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
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

  ipcMain.handle('file-exists', async (_event, path) => {
    return existsSync(path);
  });

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

  // YTDLP functons
  /* ipcMain.on('ytdlp:playlist:info', async (event, url) => {
      try {
        const info = await YTDLP.getPlaylistInfo({
          url: url,
          // ytdlpDownloadDestination: os.tmpdir(),
          // ffmpegDownloadDestination: os.tmpdir(),
        });
        event.returnValue = info;
      } catch (error) {
        console.error('Error fetching playlist info:', error);
        event.returnValue = { error: 'Failed to fetch playlist info.' };
      }
    }); */

  ipcMain.handle('ytdlp:playlist:info', async (e, videoUrl) => {
    try {
      const info = await YTDLP.getPlaylistInfo({
        url: videoUrl.url,
        //ytdlpDownloadDestination: os.tmpdir(),
        // ffmpegDownloadDestination: os.tmpdir(),
      });
      return info;
    } catch (error) {
      console.error('Error fetching playlist info:', error);
      throw error; // Propagate the error to the renderer process
    }
  });

  // Register the IPC handler before loading the window
  ipcMain.handle('ytdlp:info', async (e, url) => {
    YTDLP.Config.log = true;
    try {
      const info = await YTDLP.getInfo(url);
      if (!info) {
        throw new Error('No info returned from YTDLP.getInfo');
      }
      return info;
    } catch (error) {
      console.error('Error fetching video info:', error);
      return { error: error.message };
    }
  });

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
      const controller = await YTDLP.download({
        // args needed for download
        args: {
          url: args.url,
          output: args.outputFilepath,
          videoFormat: args.videoFormat,
          remuxVideo: args.remuxVideo,
          audioFormat: args.audioExt,
          audioQuality: args.audioFormatId,
          limitRate: args.limitRate,
        },
      });

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

      for await (const chunk of controller.listen()) {
        // Send the download status back to the renderer process
        e.sender.send(`ytdlp:download:status:${id}`, chunk);
        console.log(chunk);
      }
      // Return the download ID and controller ID
      return { downloadId: id, controllerId: controller.id };
    } catch (error) {
      console.error('Error during download:', error);
      e.sender.send(`ytdlp:download:error:${id}`, error.message);
      throw error; // Ensure the error is propagated
    }
  });

  app.on('ready', () => {
    createWindow();
    createTray();
    updateCloseHandler();

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
  });

  // Change this to keep app running in background
  app.on('window-all-closed', () => {
    // Do nothing here to keep app running when windows are closed
    // Note: macOS has its own behavior for this already
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });

  // Add a new 'before-quit' handler to properly set force quit
  app.on('before-quit', () => {
    forceQuit = true;
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

  // Add this to your IPC handlers
  ipcMain.handle('check-for-updates', async () => {
    const updateInfo = await checkForUpdates();
    if (updateInfo.hasUpdate) {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('update-available', updateInfo);
      }
    }
    return updateInfo;
  });

  ipcMain.handle('show-window', () => {
    if (mainWindow) {
      mainWindow.show();
      return true;
    }
    return false;
  });

  ipcMain.handle('hide-window', () => {
    if (mainWindow) {
      mainWindow.hide();
      return true;
    }
    return false;
  });

  // Add this IPC handler
  ipcMain.handle('exit-app', () => {
    forceQuit = true;
    app.quit();
  });

  // Add a handler to update the setting
  ipcMain.handle('set-run-in-background', (_event, value) => {
    console.log('Main process received runInBackground:', value);
    runInBackgroundSetting = value;
    updateCloseHandler();
    return true;
  });

  // Add an IPC handler to get the background running setting
  ipcMain.handle('get-run-in-background', () => {
    return runInBackgroundSetting;
  });

  // Add this handler
  ipcMain.handle('sync-background-setting-on-startup', (_event, value) => {
    console.log('Syncing background setting on startup:', value);
    runInBackgroundSetting = value;
    return true;
  });
}
