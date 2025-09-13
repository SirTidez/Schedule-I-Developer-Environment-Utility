/**
 * Preload Script for Schedule I Developer Environment Utility
 * 
 * This script runs in a secure context between the main process and renderer process.
 * It exposes a controlled API to the renderer process, preventing direct access to
 * Node.js APIs while enabling secure communication with the main process.
 * 
 * Security features:
 * - Context isolation enabled
 * - No direct Node.js access from renderer
 * - Controlled API exposure through contextBridge
 * - Type-safe interfaces for all exposed methods
 * 
 * Exposed APIs:
 * - Steam operations (library detection, manifest parsing)
 * - Configuration management
 * - File operations with progress tracking
 * - Dialog boxes (open/save files)
 * - Update checking
 * - Shell operations (external URLs)
 * - Window management
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Exposes secure APIs to the renderer process
 * 
 * Uses contextBridge to safely expose IPC methods to the renderer process
 * without giving it direct access to Node.js APIs or the full ipcRenderer.
 * This maintains security while enabling necessary functionality.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  steam: {
    detectLibraries: () => ipcRenderer.invoke('steam:detect-libraries'),
    parseManifest: (appId: string, libraryPath: string) => 
      ipcRenderer.invoke('steam:parse-manifest', appId, libraryPath),
    getLibraries: () => ipcRenderer.invoke('steam:get-libraries'),
    getScheduleIAppId: () => ipcRenderer.invoke('steam:get-schedule-i-app-id'),
    detectInstalledBranch: (libraryPath: string) => ipcRenderer.invoke('steam:detect-installed-branch', libraryPath),
    findScheduleILibrary: () => ipcRenderer.invoke('steam:find-schedule-i-library'),
    getGamesFromLibrary: (libraryPath: string) => ipcRenderer.invoke('steam:get-games-from-library', libraryPath),
    detectSteamProcess: () => ipcRenderer.invoke('steam:detect-steam-process'),
    verifyBranchInstalled: (libraryPath: string, expectedBranch: string) => ipcRenderer.invoke('steam:verify-branch-installed', libraryPath, expectedBranch),
    waitForBranchChange: (libraryPath: string, expectedBranch: string, maxWaitTime?: number) => ipcRenderer.invoke('steam:wait-for-branch-change', libraryPath, expectedBranch, maxWaitTime),
    getBranchBuildId: (libraryPath: string, branchName: string) => ipcRenderer.invoke('steam:get-branch-build-id', libraryPath, branchName),
    getCurrentSteamBuildId: (libraryPath: string) => ipcRenderer.invoke('steam:get-current-steam-build-id', libraryPath),
    detectCurrentSteamBranchKey: (libraryPath: string) => ipcRenderer.invoke('steam:detect-current-steam-branch-key', libraryPath)
  },
  
    config: {
      get: () => ipcRenderer.invoke('config:get'),
      update: (updates: any) => ipcRenderer.invoke('config:update', updates),
      getConfigDir: () => ipcRenderer.invoke('config:get-config-dir'),
      getLogsDir: () => ipcRenderer.invoke('config:get-logs-dir'),
      getManagedPath: () => ipcRenderer.invoke('config:get-managed-path'),
      setManagedPath: (path: string) => ipcRenderer.invoke('config:set-managed-path', path),
      validate: () => ipcRenderer.invoke('config:validate'),
      exists: () => ipcRenderer.invoke('config:exists'),
      loadFromFile: () => ipcRenderer.invoke('config:load-from-file'),
      saveToFile: (config: any) => ipcRenderer.invoke('config:save-to-file', config),
      getGameInstallPath: () => ipcRenderer.invoke('config:get-game-install-path'),
      setGameInstallPath: (path: string) => ipcRenderer.invoke('config:set-game-install-path', path),
      setBuildIdForBranch: (branchName: string, buildId: string) => ipcRenderer.invoke('config:set-build-id-for-branch', branchName, buildId),
      getBuildIdForBranch: (branchName: string) => ipcRenderer.invoke('config:get-build-id-for-branch', branchName),
      setCustomLaunchCommand: (branchName: string, command: string) => ipcRenderer.invoke('config:set-custom-launch-command', branchName, command),
      getCustomLaunchCommand: (branchName: string) => ipcRenderer.invoke('config:get-custom-launch-command', branchName)
    },
  
  file: {
    copyGame: (source: string, dest: string) => 
      ipcRenderer.invoke('file:copy-game', source, dest),
    copyManifest: (appId: string, steamPath: string, branchPath: string) =>
      ipcRenderer.invoke('file:copy-manifest', appId, steamPath, branchPath),
    exists: (filePath: string) => ipcRenderer.invoke('file:exists', filePath),
    createDirectory: (dirPath: string) => ipcRenderer.invoke('file:create-directory', dirPath),
    deleteDirectory: (dirPath: string) => ipcRenderer.invoke('file:delete-directory', dirPath),
    copyDirectory: (sourcePath: string, destinationPath: string) => ipcRenderer.invoke('file:copy-directory', sourcePath, destinationPath),
    writeText: (filePath: string, content: string) => ipcRenderer.invoke('file:write-text', filePath, content),
    listFiles: (dirPath: string) => ipcRenderer.invoke('file:list-files', dirPath),
    deleteFile: (filePath: string) => ipcRenderer.invoke('file:delete-file', filePath)
    },
  
  dialog: {
    openDirectory: (options?: any) => ipcRenderer.invoke('dialog:openDirectory', options),
    openFile: (options?: any) => ipcRenderer.invoke('dialog:openFile', options),
    saveFile: (options?: any) => ipcRenderer.invoke('dialog:saveFile', options)
  },
  
  update: {
    getCurrentVersion: () => ipcRenderer.invoke('update:get-current-version'),
    checkForUpdates: () => ipcRenderer.invoke('update:check-for-updates'),
    getReleaseNotes: (release: any) => ipcRenderer.invoke('update:get-release-notes', release)
  },
  
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
    launchExecutable: (executablePath: string) => ipcRenderer.invoke('shell:launch-executable', executablePath),
    openFolder: (folderPath: string) => ipcRenderer.invoke('shell:open-folder', folderPath),
    showItem: (itemPath: string) => ipcRenderer.invoke('shell:show-item', itemPath)
  },
  
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized')
  },

  system: {
    getFreeSpace: (targetPath: string) => ipcRenderer.invoke('system:get-free-space', targetPath)
  },
  
  depotdownloader: {
    validateInstallation: (depotDownloaderPath?: string) => ipcRenderer.invoke('depotdownloader:validate-installation', depotDownloaderPath),
    login: (depotDownloaderPath: string | undefined, username: string, password: string, options?: any) => ipcRenderer.invoke('depotdownloader:login', depotDownloaderPath, username, password, options),
    downloadBranch: (depotDownloaderPath: string | undefined, username: string, password: string, branchPath: string, appId: string, branchId: string) =>
      ipcRenderer.invoke('depotdownloader:download-branch', depotDownloaderPath, username, password, branchPath, appId, branchId),
    cancel: () => ipcRenderer.invoke('depotdownloader:cancel'),
    getBranchBuildId: (branchPath: string, appId: string) =>
      ipcRenderer.invoke('depotdownloader:get-branch-buildid', branchPath, appId)
  },
  
  steamLogin: {
    storeCredentials: (credentials: any) => ipcRenderer.invoke('steam-login:store-credentials', credentials),
    getCredentials: (password: string) => ipcRenderer.invoke('steam-login:get-credentials', password),
    hasCredentials: () => ipcRenderer.invoke('steam-login:has-credentials'),
    validateCredentials: (password: string) => ipcRenderer.invoke('steam-login:validate-credentials', password),
    clearCredentials: () => ipcRenderer.invoke('steam-login:clear-credentials'),
    updateLastUsed: (password: string) => ipcRenderer.invoke('steam-login:update-last-used', password)
  },

  steamUpdate: {
    startMonitoring: () => ipcRenderer.invoke('steam-update:start-monitoring'),
    stopMonitoring: () => ipcRenderer.invoke('steam-update:stop-monitoring'),
    checkUpdates: () => ipcRenderer.invoke('steam-update:check-updates'),
    getStatus: () => ipcRenderer.invoke('steam-update:get-status'),
    getSettings: () => ipcRenderer.invoke('steam-update:get-settings'),
    updateSettings: (settings: any) => ipcRenderer.invoke('steam-update:update-settings', settings),
    getChangenumber: (branchName: string) => ipcRenderer.invoke('steam-update:get-changenumber', branchName),
    setChangenumber: (branchName: string, changenumber: number) => ipcRenderer.invoke('steam-update:set-changenumber', branchName, changenumber),
    initialize: () => ipcRenderer.invoke('steam-update:initialize')
  },
  
  // Progress event listeners
  onFileCopyProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('file-copy-progress', (event, progress) => callback(progress));
  },
  
  onDepotDownloaderProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('depotdownloader-progress', (event, progress) => callback(progress));
  },
  
  removeFileCopyProgressListener: () => {
    ipcRenderer.removeAllListeners('file-copy-progress');
  },
  
  removeDepotDownloaderProgressListener: () => {
    ipcRenderer.removeAllListeners('depotdownloader-progress');
  },

  // In-memory credential cache
  credCache: {
    set: (creds: { username: string; password: string }) => ipcRenderer.invoke('cred-cache:set', creds),
    get: () => ipcRenderer.invoke('cred-cache:get'),
    clear: () => ipcRenderer.invoke('cred-cache:clear')
  },

  // Steam update event listeners
  onSteamUpdateConnected: (callback: () => void) => {
    ipcRenderer.on('steam-update:connected', callback);
  },

  onSteamUpdateDisconnected: (callback: (data: any) => void) => {
    ipcRenderer.on('steam-update:disconnected', (event, data) => callback(data));
  },

  onSteamUpdateAvailable: (callback: (updateInfo: any) => void) => {
    ipcRenderer.on('steam-update:update-available', (event, updateInfo) => callback(updateInfo));
  },

  onSteamUpdateChecked: (callback: (updateInfo: any) => void) => {
    ipcRenderer.on('steam-update:update-checked', (event, updateInfo) => callback(updateInfo));
  },

  onSteamUpdateError: (callback: (data: any) => void) => {
    ipcRenderer.on('steam-update:error', (event, data) => callback(data));
  },

  onSteamOwnershipCached: (callback: () => void) => {
    ipcRenderer.on('steam-update:ownership-cached', callback);
  },

  removeSteamUpdateListeners: () => {
    ipcRenderer.removeAllListeners('steam-update:connected');
    ipcRenderer.removeAllListeners('steam-update:disconnected');
    ipcRenderer.removeAllListeners('steam-update:update-available');
    ipcRenderer.removeAllListeners('steam-update:update-checked');
    ipcRenderer.removeAllListeners('steam-update:error');
    ipcRenderer.removeAllListeners('steam-update:ownership-cached');
  }
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      steam: {
        detectLibraries: () => Promise<string[]>;
        parseManifest: (appId: string, libraryPath: string) => Promise<any>;
        getLibraries: () => Promise<string[]>;
        getScheduleIAppId: () => Promise<string>;
        detectInstalledBranch: (libraryPath: string) => Promise<string | null>;
        detectSteamProcess: () => Promise<{ isRunning: boolean; processName: string; pid?: number; error?: string }>;
        findScheduleILibrary: () => Promise<string | null>;
        getGamesFromLibrary: (libraryPath: string) => Promise<any[]>;
        verifyBranchInstalled: (libraryPath: string, expectedBranch: string) => Promise<boolean>;
        waitForBranchChange: (libraryPath: string, expectedBranch: string, maxWaitTime?: number) => Promise<boolean>;
        getBranchBuildId: (libraryPath: string, branchName: string) => Promise<string>;
        getCurrentSteamBuildId: (libraryPath: string) => Promise<string>;
        detectCurrentSteamBranchKey: (libraryPath: string) => Promise<string | null>;
      };
    config: {
      get: () => Promise<any>;
      update: (updates: any) => Promise<any>;
      getConfigDir: () => Promise<string>;
      getLogsDir: () => Promise<string>;
      getManagedPath: () => Promise<string>;
      setManagedPath: (path: string) => Promise<string>;
      validate: () => Promise<{ isValid: boolean; errors: string[]; warnings: string[] }>;
      exists: () => Promise<boolean>;
      loadFromFile: () => Promise<any>;
      saveToFile: (config: any) => Promise<boolean>;
      getGameInstallPath: () => Promise<string>;
      setGameInstallPath: (path: string) => Promise<string>;
      setBuildIdForBranch: (branchName: string, buildId: string) => Promise<void>;
      getBuildIdForBranch: (branchName: string) => Promise<string>;
      setCustomLaunchCommand: (branchName: string, command: string) => Promise<void>;
      getCustomLaunchCommand: (branchName: string) => Promise<string>;
    };
      file: {
        copyGame: (source: string, dest: string) => Promise<any>;
        copyManifest: (appId: string, steamPath: string, branchPath: string) => Promise<any>;
        exists: (filePath: string) => Promise<boolean>;
        createDirectory: (dirPath: string) => Promise<any>;
        deleteDirectory: (dirPath: string) => Promise<any>;
        copyDirectory: (sourcePath: string, destinationPath: string) => Promise<any>;
        writeText: (filePath: string, content: string) => Promise<any>;
        listFiles: (dirPath: string) => Promise<Array<{ name: string; path: string; mtimeMs: number; isFile: boolean }>>;
        deleteFile: (filePath: string) => Promise<{ success: boolean }>;
      };
      dialog: {
        openDirectory: (options?: any) => Promise<string | null>;
        openFile: (options?: any) => Promise<string | null>;
        saveFile: (options?: any) => Promise<string | null>;
      };
      update: {
        getCurrentVersion: () => Promise<string>;
        checkForUpdates: () => Promise<{ hasUpdate: boolean; currentVersion: string; latestVersion: string; release?: any }>;
        getReleaseNotes: (release: any) => Promise<string>;
      };
      shell: {
        openExternal: (url: string) => Promise<void>;
        launchExecutable: (executablePath: string) => Promise<void>;
        openFolder: (folderPath: string) => Promise<void>;
        showItem: (itemPath: string) => Promise<void>;
      };
      window: {
        minimize: () => Promise<void>;
        toggleMaximize: () => Promise<void>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
      };
      system: {
        getFreeSpace: (targetPath: string) => Promise<{ success: boolean; freeBytes?: number; totalBytes?: number; drive?: string; error?: string }>;
      };
      depotdownloader: {
        validateInstallation: (depotDownloaderPath?: string) => Promise<{success: boolean, error?: string, version?: string}>;
        login: (depotDownloaderPath: string | undefined, username: string, password: string, options?: any) => Promise<{success: boolean, error?: string, requiresSteamGuard?: boolean, guardType?: 'email' | 'mobile'}>;
        downloadBranch: (depotDownloaderPath: string | undefined, username: string, password: string, branchPath: string, appId: string, branchId: string) => Promise<{success: boolean, error?: string}>;
        cancel: () => Promise<{success: boolean, error?: string}>;
        getBranchBuildId: (branchPath: string, appId: string) => Promise<{success: boolean, buildId?: string, error?: string}>;
      };
      steamLogin: {
        storeCredentials: (credentials: any) => Promise<{success: boolean, error?: string}>;
        getCredentials: (password: string) => Promise<{success: boolean, credentials?: any, error?: string}>;
        hasCredentials: () => Promise<{exists: boolean, info?: {encryptedAt: string, lastUsed: string}}>;
        validateCredentials: (password: string) => Promise<{valid: boolean, error?: string}>;
        clearCredentials: () => Promise<{success: boolean, error?: string}>;
        updateLastUsed: (password: string) => Promise<{success: boolean, error?: string}>;
      };
      steamUpdate: {
        startMonitoring: () => Promise<{success: boolean, error?: string}>;
        stopMonitoring: () => Promise<{success: boolean, error?: string}>;
        checkUpdates: () => Promise<{success: boolean, updateInfo?: any, error?: string}>;
        getStatus: () => Promise<{success: boolean, status?: {connected: boolean, initialized: boolean}, error?: string}>;
        getSettings: () => Promise<{success: boolean, settings?: any, error?: string}>;
        updateSettings: (settings: any) => Promise<{success: boolean, settings?: any, error?: string}>;
        getChangenumber: (branchName: string) => Promise<{success: boolean, changenumber?: number, error?: string}>;
        setChangenumber: (branchName: string, changenumber: number) => Promise<{success: boolean, error?: string}>;
        initialize: () => Promise<{success: boolean, error?: string}>;
      };
      onFileCopyProgress: (callback: (progress: any) => void) => void;
      onDepotDownloaderProgress: (callback: (progress: any) => void) => void;
      removeFileCopyProgressListener: () => void;
      removeDepotDownloaderProgressListener: () => void;
      onSteamUpdateConnected: (callback: () => void) => void;
      onSteamUpdateDisconnected: (callback: (data: any) => void) => void;
      onSteamUpdateAvailable: (callback: (updateInfo: any) => void) => void;
      onSteamUpdateChecked: (callback: (updateInfo: any) => void) => void;
      onSteamUpdateError: (callback: (data: any) => void) => void;
      onSteamOwnershipCached: (callback: () => void) => void;
      removeSteamUpdateListeners: () => void;
      credCache: {
        set: (creds: { username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
        get: () => Promise<{ success: boolean; credentials?: { username: string; password: string } | null }>;
        clear: () => Promise<{ success: boolean }>;
      };
    };
  }
}
