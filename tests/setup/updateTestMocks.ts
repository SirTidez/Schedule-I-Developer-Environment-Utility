/**
 * Centralized mocks for update-related tests
 * 
 * Provides consistent mocking setup across all update tests
 * to ensure reliability and maintainability.
 */

import { vi } from 'vitest';

/**
 * Mock Electron app
 */
export const mockElectronApp = {
  getVersion: vi.fn(),
  isPackaged: false,
  getAppPath: vi.fn(() => '/mock/app/path'),
};

/**
 * Mock autoUpdater
 */
export const mockAutoUpdater = {
  autoDownload: false,
  autoInstallOnAppQuit: false,
  on: vi.fn(),
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  quitAndInstall: vi.fn(),
};

/**
 * Mock fs-extra
 */
export const mockFsExtra = {
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  readJsonSync: vi.fn(),
  writeJsonSync: vi.fn(),
  ensureDirSync: vi.fn(),
  copyFileSync: vi.fn(),
};

/**
 * Mock path
 */
export const mockPath = {
  resolve: vi.fn((...args) => args.join('/')),
  join: vi.fn((...args) => args.join('/')),
};

/**
 * Mock process
 */
export const mockProcess = {
  versions: { electron: '1.0.0' },
  cwd: vi.fn(() => '/mock/cwd'),
};

/**
 * Mock fetch
 */
export const mockFetch = vi.fn();

/**
 * Mock LoggingService
 */
export const mockLoggingService = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

/**
 * Mock UpdateCacheService
 */
export const mockUpdateCacheService = {
  isCacheValid: vi.fn(),
  loadCachedUpdateInfo: vi.fn(),
  saveUpdateInfo: vi.fn(),
  getCacheFilePath: vi.fn(() => '/mock/cache/path'),
};

/**
 * Mock BrowserWindow
 */
export const mockBrowserWindow = {
  getAllWindows: vi.fn(() => []),
};

/**
 * Mock ipcMain
 */
export const mockIpcMain = {
  handle: vi.fn(),
};

/**
 * Mock window.electronAPI for renderer tests
 */
export const mockElectronAPI = {
  update: {
    getCurrentVersion: vi.fn(),
    checkForUpdates: vi.fn(),
    getReleaseNotes: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
  },
  config: {
    get: vi.fn(),
    update: vi.fn(),
  },
};

/**
 * Setup all mocks for main process tests
 */
export function setupMainProcessMocks() {
  vi.mock('electron', () => ({
    app: mockElectronApp,
    autoUpdater: mockAutoUpdater,
    ipcMain: mockIpcMain,
    BrowserWindow: mockBrowserWindow,
  }));

  vi.mock('fs-extra', () => mockFsExtra);
  vi.mock('path', () => mockPath);
  vi.mock('node:fs', () => mockFsExtra);

  // Mock global fetch
  global.fetch = mockFetch;

  // Mock process and __dirname
  Object.defineProperty(global, 'process', {
    value: mockProcess,
    writable: true,
  });

  Object.defineProperty(global, '__dirname', {
    value: '/mock/dist/main/services',
    writable: true,
  });

  // Mock UpdateCacheService
  vi.mock('../../src/main/services/UpdateCacheService', () => ({
    UpdateCacheService: vi.fn().mockImplementation(() => mockUpdateCacheService),
  }));
}

/**
 * Setup mocks for renderer process tests
 */
export function setupRendererMocks() {
  // Mock window.electronAPI
  Object.defineProperty(global, 'window', {
    value: {
      electronAPI: mockElectronAPI,
    },
    writable: true,
  });
}

/**
 * Setup mocks for E2E tests
 */
export function setupE2EMocks() {
  // E2E tests use Playwright's page.addInitScript
  // This is just for reference
}

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  vi.clearAllMocks();
  
  // Reset individual mocks
  Object.values(mockElectronApp).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  
  Object.values(mockAutoUpdater).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  
  Object.values(mockFsExtra).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  
  Object.values(mockPath).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  
  Object.values(mockProcess).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  
  Object.values(mockLoggingService).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  
  Object.values(mockUpdateCacheService).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  
  Object.values(mockBrowserWindow).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  
  Object.values(mockIpcMain).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  
  Object.values(mockElectronAPI).forEach(namespace => {
    if (typeof namespace === 'object' && namespace !== null) {
      Object.values(namespace).forEach(mock => {
        if (typeof mock === 'function' && 'mockReset' in mock) {
          mock.mockReset();
        }
      });
    }
  });
}

/**
 * Create a mock GitHub API response
 */
export function createMockGitHubResponse(releases: any[] = []) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(releases)
  };
}

/**
 * Create a mock error response
 */
export function createMockErrorResponse(status: number = 500, message: string = 'Server error') {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(message)
  };
}

/**
 * Create a mock network error
 */
export function createMockNetworkError(message: string = 'Network error') {
  return Promise.reject(new Error(message));
}

/**
 * Setup common mock implementations
 */
export function setupCommonMocks() {
  // Default mock implementations
  mockElectronApp.getVersion.mockReturnValue('2.1.0');
  mockElectronApp.isPackaged = true;
  mockElectronApp.getAppPath.mockReturnValue('/mock/app/path');
  
  mockProcess.cwd.mockReturnValue('/mock/cwd');
  mockProcess.versions.electron = '1.0.0';
  
  mockPath.resolve.mockImplementation((...args) => args.join('/'));
  mockPath.join.mockImplementation((...args) => args.join('/'));
  
  mockFsExtra.existsSync.mockReturnValue(true);
  mockFsExtra.readFileSync.mockReturnValue('{"version": "2.1.0"}');
  mockFsExtra.writeFileSync.mockImplementation(() => {});
  mockFsExtra.readJsonSync.mockReturnValue({});
  mockFsExtra.writeJsonSync.mockImplementation(() => {});
  
  mockFetch.mockResolvedValue(createMockGitHubResponse());
  
  mockUpdateCacheService.isCacheValid.mockReturnValue(false);
  mockUpdateCacheService.loadCachedUpdateInfo.mockReturnValue(null);
  mockUpdateCacheService.saveUpdateInfo.mockImplementation(() => {});
  
  mockElectronAPI.update.getCurrentVersion.mockResolvedValue('2.1.0');
  mockElectronAPI.update.checkForUpdates.mockResolvedValue({
    hasUpdate: false,
    currentVersion: '2.1.0',
    latestVersion: '2.1.0'
  });
  mockElectronAPI.update.getReleaseNotes.mockResolvedValue('Release notes');
  mockElectronAPI.shell.openExternal.mockResolvedValue(undefined);
  mockElectronAPI.config.get.mockResolvedValue({});
  mockElectronAPI.config.update.mockResolvedValue({});
}

/**
 * Restore all mocks
 */
export function restoreAllMocks() {
  vi.restoreAllMocks();
}
