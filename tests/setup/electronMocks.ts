import { vi } from 'vitest';

// Mock Electron app
export const mockApp = {
  getVersion: vi.fn(() => '2.2.0b'),
  isPackaged: false,
  getAppPath: vi.fn(() => '/mock/app/path'),
  getName: vi.fn(() => 'Schedule I Developer Environment'),
  getPath: vi.fn((name: string) => `/mock/path/${name}`),
  whenReady: vi.fn(() => Promise.resolve()),
  quit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
};

// Mock autoUpdater
export const mockAutoUpdater = {
  autoDownload: false,
  autoInstallOnAppQuit: false,
  on: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  quitAndInstall: vi.fn(),
  setFeedURL: vi.fn(),
  getFeedURL: vi.fn(),
};

// Mock ipcMain
export const mockIpcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
  removeHandler: vi.fn(),
  removeAllListeners: vi.fn(),
};

// Mock BrowserWindow
export const mockBrowserWindow = {
  getAllWindows: vi.fn(() => []),
  fromId: vi.fn(),
  fromWebContents: vi.fn(),
  getFocusedWindow: vi.fn(),
};

// Mock shell
export const mockShell = {
  openExternal: vi.fn(),
  openPath: vi.fn(),
  showItemInFolder: vi.fn(),
  trashItem: vi.fn(),
  beep: vi.fn(),
};

// Mock dialog
export const mockDialog = {
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
  showMessageBox: vi.fn(),
  showErrorBox: vi.fn(),
  showCertificateTrustDialog: vi.fn(),
};

// Mock electron module
export const mockElectron = {
  app: mockApp,
  autoUpdater: mockAutoUpdater,
  ipcMain: mockIpcMain,
  BrowserWindow: mockBrowserWindow,
  shell: mockShell,
  dialog: mockDialog,
};

// Mock LoggingService
export const mockLoggingService = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock UpdateCacheService
export const mockCacheService = {
  isCacheValid: vi.fn(),
  loadCachedUpdateInfo: vi.fn(),
  saveUpdateInfo: vi.fn(),
  getCacheFilePath: vi.fn(() => '/mock/cache/path'),
};

// Setup global mocks
vi.mock('electron', () => mockElectron);
vi.mock('electron-updater', () => ({ autoUpdater: mockAutoUpdater }));
