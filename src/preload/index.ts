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
    detectCurrentSteamBranchKey: (libraryPath: string) => ipcRenderer.invoke('steam:detect-current-steam-branch-key', libraryPath),
    // Manifest ID support
    getInstalledManifestIds: (appId: string, libraryPath: string) => ipcRenderer.invoke('steam:get-installed-manifest-ids', appId, libraryPath),
    getPrimaryManifestId: (appId: string, libraryPath: string) => ipcRenderer.invoke('steam:get-primary-manifest-id', appId, libraryPath),
    // Multi-version branch support
    listBranchBuilds: (branchKey: string, maxCount: number) => ipcRenderer.invoke('steam:list-branch-builds', branchKey, maxCount),
    getCurrentBranchBuildId: (branchKey: string) => ipcRenderer.invoke('steam:get-current-branch-buildid', branchKey),
    getInstalledVersions: (branchName: string) => ipcRenderer.invoke('steam:get-installed-versions', branchName)
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
      getCustomLaunchCommand: (branchName: string) => ipcRenderer.invoke('config:get-custom-launch-command', branchName),
      // Multi-version branch support
      setBranchVersion: (branchName: string, buildId: string, versionInfo: any) => ipcRenderer.invoke('config:set-branch-version', branchName, buildId, versionInfo),
      getBranchVersions: (branchName: string) => ipcRenderer.invoke('config:get-branch-versions', branchName),
      setActiveBuild: (branchName: string, buildId: string) => ipcRenderer.invoke('config:set-active-build', branchName, buildId),
      getActiveBuild: (branchName: string) => ipcRenderer.invoke('config:get-active-build', branchName),
      getMaxRecentBuilds: () => ipcRenderer.invoke('config:get-max-recent-builds'),
      setMaxRecentBuilds: (count: number) => ipcRenderer.invoke('config:set-max-recent-builds', count),
      setUserAddedVersions: (branchKey: string, versions: any[]) => ipcRenderer.invoke('config:set-user-added-versions', branchKey, versions),
      getUserAddedVersions: (branchKey: string) => ipcRenderer.invoke('config:get-user-added-versions', branchKey),
      // Manifest ID based version management
      setActiveManifest: (branchName: string, manifestId: string) => ipcRenderer.invoke('config:set-active-manifest', branchName, manifestId),
      getActiveManifest: (branchName: string) => ipcRenderer.invoke('config:get-active-manifest', branchName),
      setBranchManifestVersion: (branchName: string, manifestId: string, versionInfo: any) => ipcRenderer.invoke('config:set-branch-manifest-version', branchName, manifestId, versionInfo),
      getBranchManifestVersions: (branchName: string) => ipcRenderer.invoke('config:get-branch-manifest-versions', branchName)
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
    deleteFile: (filePath: string) => ipcRenderer.invoke('file:delete-file', filePath),
    // Multi-version branch support
    migrateLegacyBranch: (branchPath: string, buildId: string) => ipcRenderer.invoke('file:migrate-legacy-branch', branchPath, buildId)
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
      ipcRenderer.invoke('depotdownloader:get-branch-buildid', branchPath, appId),
    // Multi-version branch support
    downloadBranchVersion: (depotDownloaderPath: string | undefined, username: string, password: string, branchName: string, buildId: string, appId: string, branchId: string, managedEnvironmentPath: string) =>
      ipcRenderer.invoke('depotdownloader:download-branch-version', depotDownloaderPath, username, password, branchName, buildId, appId, branchId, managedEnvironmentPath),
    migrateLegacyBranch: (branchPath: string, buildId: string) => ipcRenderer.invoke('depotdownloader:migrate-legacy-branch', branchPath, buildId),
    // Manifest-specific downloads
    downloadBranchWithManifests: (depotDownloaderPath: string | undefined, username: string, password: string, branchPath: string, appId: string, branchId: string, buildId: string, depots: Array<{depotId: string, manifestId: string}>) =>
      ipcRenderer.invoke('depotdownloader:download-branch-with-manifests', depotDownloaderPath, username, password, branchPath, appId, branchId, buildId, depots),
    downloadBranchSequentialDepots: (depotDownloaderPath: string | undefined, username: string, password: string, branchPath: string, appId: string, branchId: string, buildId: string, depots: Array<{depotId: string, manifestId: string}>) => 
      ipcRenderer.invoke('depotdownloader:download-branch-sequential-depots', depotDownloaderPath, username, password, branchPath, appId, branchId, buildId, depots),
    downloadWithManifest: (depotDownloaderPath: string | undefined, username: string, password: string, branchName: string, manifestId: string, appId: string, depotId: string, managedEnvironmentPath: string) => 
      ipcRenderer.invoke('depotdownloader:download-with-manifest', depotDownloaderPath, username, password, branchName, manifestId, appId, depotId, managedEnvironmentPath),
    downloadBranchVersionByManifest: (depotDownloaderPath: string | undefined, username: string, password: string, branchName: string, manifestId: string, appId: string, managedEnvironmentPath: string) => 
      ipcRenderer.invoke('depotdownloader:download-branch-version-by-manifest', depotDownloaderPath, username, password, branchName, manifestId, appId, managedEnvironmentPath),
    validateManifest: (depotDownloaderPath: string | undefined, username: string, password: string, manifestId: string, appId: string, depotId: string, branchName: string) => 
      ipcRenderer.invoke('depotdownloader:validate-manifest', depotDownloaderPath, username, password, manifestId, appId, depotId, branchName),
    downloadManifests: (depotDownloaderPath: string | undefined, username: string, password: string, branches: string[], appId: string, managedEnvironmentPath: string) =>
      ipcRenderer.invoke('depotdownloader:download-manifests', depotDownloaderPath, username, password, branches, appId, managedEnvironmentPath),
    getDepotDownloaderPath: () => ipcRenderer.invoke('depotdownloader:get-path')
  },

  // Steam branch operations
  steamBranch: {
    getDepotManifestsForBuild: (buildId: string) => ipcRenderer.invoke('steam:get-depot-manifests-for-build', buildId),
    getDepotManifestsForBranch: (branchKey: string, buildId?: string) => ipcRenderer.invoke('steam:get-depot-manifests-for-branch', branchKey, buildId),
    getBranchBuildId: (branchKey: string) => ipcRenderer.invoke('steam:get-branch-buildid', branchKey),
    getAllBranchBuildIds: () => ipcRenderer.invoke('steam:get-all-branch-buildids'),
    getRecentBuildsForBranch: (branchKey: string, maxCount?: number) => ipcRenderer.invoke('steam:get-recent-builds-for-branch', branchKey, maxCount)
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
    initialize: () => ipcRenderer.invoke('steam-update:initialize'),
    getBranchBuildId: (branchKey: string) => ipcRenderer.invoke('steam-update:get-branch-buildid', branchKey),
    getAllBranchBuildIds: () => ipcRenderer.invoke('steam-update:get-all-branch-buildids')
  },

  // Version migration (build ID to manifest ID)
  migration: {
    detectLegacyInstallations: (managedEnvironmentPath: string) => ipcRenderer.invoke('migration:detect-legacy-installations', managedEnvironmentPath),
    migrateInstallation: (installation: any) => ipcRenderer.invoke('migration:migrate-installation', installation),
    migrateToManifestIds: (managedEnvironmentPath: string) => ipcRenderer.invoke('migration:migrate-to-manifest-ids', managedEnvironmentPath),
    validateMigration: (managedEnvironmentPath: string) => ipcRenderer.invoke('migration:validate-migration', managedEnvironmentPath),
    rollbackMigration: (managedEnvironmentPath: string) => ipcRenderer.invoke('migration:rollback-migration', managedEnvironmentPath)
  },

  // Migration progress event listeners
  onMigrationProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('migration:progress', (event, progress) => callback(progress));
  },

  removeMigrationProgressListener: () => {
    ipcRenderer.removeAllListeners('migration:progress');
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

  // MelonLoader installer
  melonloader: {
    install: (branchPath: string) => ipcRenderer.invoke('melonloader:install', branchPath)
  },

  // Path utilities
  pathUtils: {
    getBranchBasePath: (managedEnvironmentPath: string, branchName: string) => ipcRenderer.invoke('path-utils:get-branch-base-path', managedEnvironmentPath, branchName),
    getBranchVersionPath: (managedEnvironmentPath: string, branchName: string, versionId: string, type: 'build' | 'manifest') => ipcRenderer.invoke('path-utils:get-branch-version-path', managedEnvironmentPath, branchName, versionId, type),
    getBranchVersionPathByManifest: (managedEnvironmentPath: string, branchName: string, manifestId: string) => ipcRenderer.invoke('path-utils:get-branch-version-path-by-manifest', managedEnvironmentPath, branchName, manifestId),
    getActiveBranchPath: (config: any, branchName: string, useManifestId: boolean) => ipcRenderer.invoke('path-utils:get-active-branch-path', config, branchName, useManifestId),
    listBranchVersions: (managedEnvironmentPath: string, branchName: string) => ipcRenderer.invoke('path-utils:list-branch-versions', managedEnvironmentPath, branchName),
    detectLegacyBranchStructure: (branchBasePath: string) => ipcRenderer.invoke('path-utils:detect-legacy-branch-structure', branchBasePath),
    migrateLegacyBranch: (branchPath: string, versionId: string, type: 'build' | 'manifest') => ipcRenderer.invoke('path-utils:migrate-legacy-branch', branchPath, versionId, type),
    ensureBranchVersionDirectory: (branchVersionPath: string) => ipcRenderer.invoke('path-utils:ensure-branch-version-directory', branchVersionPath),
    normalizePath: (pathString: string) => ipcRenderer.invoke('path-utils:normalize-path', pathString),
    validatePath: (managedEnvironmentPath: string, targetPath: string) => ipcRenderer.invoke('path-utils:validate-path', managedEnvironmentPath, targetPath)
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
        // Manifest ID support
        getInstalledManifestIds: (appId: string, libraryPath: string) => Promise<string[]>;
        getPrimaryManifestId: (appId: string, libraryPath: string) => Promise<string | null>;
        // Multi-version branch support
        listBranchBuilds: (branchKey: string, maxCount: number) => Promise<Array<{ buildId: string; date: string; sizeBytes?: number }>>;
        getCurrentBranchBuildId: (branchKey: string) => Promise<string | null>;
        getInstalledVersions: (branchName: string) => Promise<Array<{ buildId: string; manifestId: string; path: string; isActive: boolean; downloadDate: string; sizeBytes?: number; description?: string }>>;
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
      // Multi-version branch support
      setBranchVersion: (branchName: string, buildId: string, versionInfo: any) => Promise<void>;
      getBranchVersions: (branchName: string) => Promise<Record<string, any>>;
      setActiveBuild: (branchName: string, buildId: string) => Promise<void>;
      getActiveBuild: (branchName: string) => Promise<string | null>;
      getMaxRecentBuilds: () => Promise<number>;
      setMaxRecentBuilds: (count: number) => Promise<void>;
      // Manifest ID based version management
      setActiveManifest: (branchName: string, manifestId: string) => Promise<void>;
      getActiveManifest: (branchName: string) => Promise<string>;
      setBranchManifestVersion: (branchName: string, manifestId: string, versionInfo: any) => Promise<void>;
      getBranchManifestVersions: (branchName: string) => Promise<Record<string, any>>;
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
        // Multi-version branch support
        migrateLegacyBranch: (branchPath: string, buildId: string) => Promise<{ success: boolean; error?: string }>;
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
        // Multi-version branch support
        downloadBranchVersion: (depotDownloaderPath: string | undefined, username: string, password: string, branchName: string, buildId: string, appId: string, branchId: string, managedEnvironmentPath: string) => Promise<{success: boolean, error?: string}>;
        migrateLegacyBranch: (branchPath: string, buildId: string) => Promise<{success: boolean, error?: string}>;
        // Manifest-specific downloads
        downloadBranchWithManifests: (depotDownloaderPath: string | undefined, username: string, password: string, branchPath: string, appId: string, branchId: string, buildId: string, depots: Array<{depotId: string, manifestId: string}>) => Promise<{success: boolean, error?: string}>;
        downloadBranchSequentialDepots: (depotDownloaderPath: string | undefined, username: string, password: string, branchPath: string, appId: string, branchId: string, buildId: string, depots: Array<{depotId: string, manifestId: string}>) => Promise<{success: boolean, error?: string, completedDepots?: number}>;
        downloadWithManifest: (depotDownloaderPath: string | undefined, username: string, password: string, branchName: string, manifestId: string, appId: string, depotId: string, managedEnvironmentPath: string) => Promise<{success: boolean, error?: string}>;
        downloadBranchVersionByManifest: (depotDownloaderPath: string | undefined, username: string, password: string, branchName: string, manifestId: string, appId: string, managedEnvironmentPath: string) => Promise<{success: boolean, error?: string}>;
        validateManifest: (depotDownloaderPath: string | undefined, username: string, password: string, manifestId: string, appId: string, depotId: string, branchName: string) => Promise<{success: boolean, error?: string, manifestInfo?: any}>;
        downloadManifests: (depotDownloaderPath: string | undefined, username: string, password: string, branches: string[], appId: string, managedEnvironmentPath: string) => Promise<{success: boolean, manifests?: Record<string, { manifestId: string; buildId: string }>, error?: string}>;
        getDepotDownloaderPath: () => Promise<{success: boolean, path?: string | null, error?: string}>;
      };
      steamBranch: {
        getDepotManifestsForBuild: (buildId: string) => Promise<{success: boolean, depots?: Array<{depotId: string, manifestId: string, name?: string, size?: number}>, error?: string}>;
        getDepotManifestsForBranch: (branchKey: string, buildId?: string) => Promise<{success: boolean, depots?: Array<{depotId: string, manifestId: string, name?: string, size?: number}>, error?: string}>;
        getBranchBuildId: (branchKey: string) => Promise<{success: boolean, buildId?: string, error?: string}>;
        getAllBranchBuildIds: () => Promise<{success: boolean, buildIds?: Record<string, string>, error?: string}>;
        getRecentBuildsForBranch: (branchKey: string, maxCount?: number) => Promise<{success: boolean, builds?: Array<{buildId: string, changenumber: number, timeUpdated: number, description?: string, isCurrent: boolean}>, error?: string, historyAvailable: boolean, maxCount: number, actualCount: number}>;
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
        getBranchBuildId: (branchKey: string) => Promise<{ success: boolean, buildId?: string, error?: string }>;
        getAllBranchBuildIds: () => Promise<{ success: boolean, map?: Record<string, string>, error?: string }>;
      };
      migration: {
        detectLegacyInstallations: (managedEnvironmentPath: string) => Promise<{success: boolean, installations: any[], error?: string}>;
        migrateInstallation: (installation: any) => Promise<{success: boolean, error?: string}>;
        migrateToManifestIds: (managedEnvironmentPath: string) => Promise<{success: boolean, migratedInstallations: any[], failedInstallations: any[], errors: string[]}>;
        validateMigration: (managedEnvironmentPath: string) => Promise<{valid: boolean, errors: string[]}>;
        rollbackMigration: (managedEnvironmentPath: string) => Promise<{success: boolean, errors: string[]}>;
      };
      onMigrationProgress: (callback: (progress: any) => void) => void;
      removeMigrationProgressListener: () => void;
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
      melonloader: {
        install: (branchPath: string) => Promise<{ success: boolean; error?: string }>;
      };
      pathUtils: {
        getBranchBasePath: (managedEnvironmentPath: string, branchName: string) => Promise<string>;
        getBranchVersionPath: (managedEnvironmentPath: string, branchName: string, versionId: string, type: 'build' | 'manifest') => Promise<string>;
        getBranchVersionPathByManifest: (managedEnvironmentPath: string, branchName: string, manifestId: string) => Promise<string>;
        getActiveBranchPath: (config: any, branchName: string, useManifestId: boolean) => Promise<string | null>;
        listBranchVersions: (managedEnvironmentPath: string, branchName: string) => Promise<Array<{ buildId: string; manifestId?: string; downloadDate: string; sizeBytes: number; isActive: boolean; path: string }>>;
        detectLegacyBranchStructure: (branchBasePath: string) => Promise<boolean>;
        migrateLegacyBranch: (branchPath: string, versionId: string, type: 'build' | 'manifest') => Promise<{ success: boolean; error?: string }>;
        ensureBranchVersionDirectory: (branchVersionPath: string) => Promise<void>;
        normalizePath: (pathString: string) => Promise<string>;
        validatePath: (managedEnvironmentPath: string, targetPath: string) => Promise<boolean>;
      };
    };
  }
}
