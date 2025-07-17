/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Type definitions for global variables and functions used in the application.
 * This file extends the Window interface to include custom functions and properties
 * that are accessible in the renderer process.
 */
import {
  FormatSelectorResult,
  GetInfoResponse,
  MenuItem,
  PluginInfo,
  PluginManifest,
  PluginModalOptions,
  PluginSidePanelOptions,
  PluginSidePanelResult,
  TaskBarItem,
} from './plugins/types';
import {
  SaveDialogOptions,
  SaveDialogResult,
  WriteFileOptions,
  WriteFileResult,
} from './schema/downlodrFunction';

// Define UpdateInfo interface to match what updateChecker returns
interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion?: string;
  currentVersion: string;
  currentChannel?: string;
  releaseUrl?: string;
  releaseNotes?: string;
  downloadUrl?: string;
  publishedAt?: Date;
  message?: string;
  error?: any;
}

declare global {
  interface Window {
    downlodrFunctions: {
      //Title bar functions
      closeApp: () => void;
      minimizeApp: () => void;
      maximizeApp: () => void;
      openExternalLink: (link: string) => Promise<void>;

      //Downlodr functions
      openVideo: (videoPath: string) => Promise<void>; // Opens a video file
      deleteFile: (videoPath: string) => Promise<boolean>; // Deletes a specified file from storage/drive
      deleteFolder: (folderPath: string) => Promise<boolean>; // Deletes a specified folder from storage/drive
      getDownloadFolder: () => Promise<string>; // Retrieves the default download folder path
      isValidPath: (videoPath: string) => Promise<boolean>; // Validates a given file path if it exists
      joinDownloadPath: (
        downloadPath: string,
        fileName: string,
      ) => Promise<string>; // Joins a download path with a filename
      validatePath: (folderPath: string) => Promise<boolean>; // Validates a folder path
      openFolder: (
        folderPath: string,
        filePath: string,
      ) => Promise<{ success: boolean; error?: string }>; // Opens a specified folder
      fileExists: (path: string) => Promise<boolean>; // Checks if a file exists at the specified path
      getFileSize: (path: string) => Promise<number | null>; // Gets the size of a file in bytes
      showInputContextMenu: () => void; // Shows the input field context menu (right-click menu)
      invokeMainProcess: (channel: string, ...args: any[]) => Promise<any>;
      downloadFile: (
        url: string,
        outputPath: string,
      ) => Promise<{
        success: boolean;
        path?: string;
        error?: string;
      }>;
      ensureDirectoryExists: (dirPath: string) => Promise<boolean>; // Creates directory if it doesn't exist
      getThumbnailDataUrl: (path: string) => Promise<string | null>;
      getPlatform: () => Promise<string>; // Gets the current platform (darwin, win32, linux, etc.)
    };
    ytdlp: {
      getPlaylistInfo: (options: { url: string }) => any; // Retrieves information about a playlist
      getInfo: (url: string) => Promise<GetInfoResponse>; // Retrieves information about a video
      selectDownloadDirectory: () => Promise<string>; // Prompts the user to select a download directory
      download: (
        options: { url: string; outputFilepath: string; videoFormat: string },
        progressCallback: (progress: any) => void,
      ) => { downloadId: string; controllerId: string | undefined }; // Initiates a download
      onDownloadStatusUpdate: (
        id: string,
        callback: (result: any) => void,
      ) => void; // Subscribes to download status updates
      offDownloadStatusUpdate: (
        id: string,
        callback: (result: any) => void,
      ) => void; // Unsubscribes from download status updates
      killController: (
        controllerId: string,
      ) => Promise<{ success: boolean; error?: string }>; // Kills a download controller
      stop: (id: string) => Promise<boolean>;
      // Binary management functions
      downloadBinary: () => Promise<{
        success: boolean;
        path?: string;
        error?: string;
      }>; // Downloads a working yt-dlp binary
      checkStatus: () => Promise<{
        available: boolean;
        path: string | null;
        needsDownload: boolean;
        version?: string | null;
        error?: string;
      }>; // Checks the status of the current yt-dlp binary
      // Event listeners for download notifications
      onDownloadStarted: (callback: () => void) => () => void;
      onDownloadSuccess: (callback: () => void) => () => void;
      onDownloadFailed: (callback: (error: string) => void) => () => void;
    };
    electronDevTools: {
      toggle: () => void; // Toggles the visibility of the developer tools
    };
    updateAPI: {
      onUpdateAvailable: (
        callback: (updateInfo: UpdateInfo) => void,
      ) => () => void;
      checkForUpdates: () => Promise<UpdateInfo>;
      getCurrentVersion: () => Promise<string>; // Gets current app version without GitHub API call
    };
    backgroundSettings: {
      getRunInBackground: () => Promise<boolean>;
      setRunInBackground: (value: boolean) => Promise<boolean>;
      syncBackgroundSetting: (value: boolean) => Promise<boolean>;
    };
    notifications: {
      notifyDownloadFinished: (downloadInfo: {
        name: string;
        id: string;
        location: string;
      }) => void;
    };
    plugins: {
      list: () => Promise<PluginInfo[]>;
      getCode: (
        pluginId: string,
      ) => Promise<{ code: string; manifest: PluginManifest; error?: string }>;
      install: (pluginPath: string) => Promise<boolean | string>;
      uninstall: (pluginId: string) => Promise<boolean>;
      getMenuItems: (context: string) => Promise<MenuItem[]>;
      executeMenuItem: (id: string, contextData?: any) => Promise<void>;
      loadUnzipped: (pluginDirPath: string) => Promise<boolean>;
      writeFile: (options: WriteFileOptions) => Promise<WriteFileResult>;
      readFile: (
        filePath: string,
      ) => Promise<{ success: boolean; data?: string; error?: string }>;
      readFileContents: (options: {
        filePath: string;
        pluginId?: string;
      }) => Promise<{ success: boolean; data?: string; error?: string }>;

      registerMenuItem: (menuItem: MenuItem) => Promise<string>;
      unregisterMenuItem: (id: string) => Promise<boolean>;
      reload: () => Promise<boolean>;
      onReloaded: (callback: () => void) => () => void;
      getEnabledPlugins: () => Promise<Record<string, boolean>>;
      setPluginEnabled: (
        pluginId: string,
        enabled: boolean,
      ) => Promise<boolean>;
      onPluginStateChanged: (
        callback: (data: { pluginId: string; enabled: boolean }) => void,
      ) => () => void;
      getPluginLocation: (pluginId: string) => Promise<string | null>;
      openPluginFolder: (pluginId: string) => Promise<boolean>;

      // TaskBar items
      registerTaskBarItem: (item: TaskBarItem) => Promise<string>;
      unregisterTaskBarItem: (id: string) => Promise<boolean>;
      getTaskBarItems: () => Promise<TaskBarItem[]>;
      executeTaskBarItem: (id: string, contextData?: any) => Promise<boolean>;
      saveFileDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>;
    };
    PluginHandlers?: Record<string, (contextData?: any) => void>;
    formatSelectorManager?: {
      showFormatSelector: (
        options: FormatSelectorOptions,
      ) => Promise<FormatSelectorResult>;
    };
    pluginSidePanelManager?: {
      showPluginSidePanel: (
        options: PluginSidePanelOptions,
      ) => Promise<PluginSidePanelResult>;
    };
    pluginModalManager?: {
      showPluginModal: (
        options: PluginModalOptions,
      ) => Promise<PluginModalResult>;
    };
    appControl: {
      showWindow: () => Promise<boolean>;
      hideWindow: () => Promise<boolean>;
      quitApp: () => Promise<void>;
      setAutoLaunch: (enabled: boolean) => Promise<void>;
      getAutoLaunch: () => Promise<boolean>;
      getClipboardText: () => Promise<string>;
      onClipboardChange: (callback: (text: string) => void) => void;
      offClipboardChange: () => void;
      startClipboardMonitoring: () => Promise<boolean>;
      stopClipboardMonitoring: () => Promise<boolean>;
      isClipboardMonitoringActive: () => Promise<boolean>;
      clearLastClipboardText: () => Promise<void>;
      clearClipboard: () => Promise<boolean>;
      isWindowFocused: () => Promise<boolean>;
    };
  }
}

export {};
