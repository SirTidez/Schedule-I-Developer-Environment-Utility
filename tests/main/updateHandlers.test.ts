import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mockIpcMain, mockBrowserWindow, mockLoggingService } from '../setup/electronMocks';

// Mock UpdateService
const mockUpdateService = {
  getCurrentVersion: vi.fn(),
  checkForUpdates: vi.fn(),
  formatReleaseNotes: vi.fn(),
  checkForUpdatesAutoUpdater: vi.fn(),
  downloadUpdate: vi.fn(),
  installUpdate: vi.fn(),
  getCurrentStatus: vi.fn(),
  on: vi.fn(),
};

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
  BrowserWindow: mockBrowserWindow,
}));

import { registerUpdateHandlers } from '../../src/main/ipc/updateHandlers';

describe('Update Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerUpdateHandlers', () => {
    test('registers all IPC handlers', () => {
      registerUpdateHandlers(mockUpdateService, mockLoggingService);

      expect(mockIpcMain.handle).toHaveBeenCalledWith('update:get-current-version', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('update:check-for-updates', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('update:get-release-notes', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('update:check-for-updates-auto', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('update:download', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('update:install', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('update:get-status', expect.any(Function));
    });

    test('sets up event listeners for status changes', () => {
      registerUpdateHandlers(mockUpdateService, mockLoggingService);

      expect(mockUpdateService.on).toHaveBeenCalledWith('status-changed', expect.any(Function));
    });
  });

  describe('get-current-version handler', () => {
    test('returns current version successfully', async () => {
      mockUpdateService.getCurrentVersion.mockReturnValue('2.1.0');
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:get-current-version')[1];

      const result = await handler();

      expect(result).toBe('2.1.0');
      expect(mockLoggingService.info).toHaveBeenCalledWith('Current version: 2.1.0');
    });

    test('handles errors gracefully', async () => {
      const error = new Error('Version detection failed');
      mockUpdateService.getCurrentVersion.mockImplementation(() => {
        throw error;
      });
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:get-current-version')[1];

      await expect(handler()).rejects.toThrow('Version detection failed');
      expect(mockLoggingService.error).toHaveBeenCalledWith('Failed to get current version:', error);
    });
  });

  describe('check-for-updates handler', () => {
    test('returns update info successfully', async () => {
      const updateInfo = {
        hasUpdate: true,
        currentVersion: '2.0.0',
        latestVersion: '2.1.0',
        release: {
          tag_name: 'v2.1.0',
          name: 'Version 2.1.0',
          body: 'Release notes',
          published_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com/test/repo/releases/tag/v2.1.0',
          assets: []
        }
      };

      mockUpdateService.checkForUpdates.mockResolvedValue(updateInfo);
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:check-for-updates')[1];

      const result = await handler();

      expect(result).toEqual(updateInfo);
      expect(mockLoggingService.info).toHaveBeenCalledWith('Checking for updates...');
      expect(mockLoggingService.info).toHaveBeenCalledWith('Update check result: Update available');
    });

    test('handles no update available', async () => {
      const updateInfo = {
        hasUpdate: false,
        currentVersion: '2.1.0',
        latestVersion: '2.1.0'
      };

      mockUpdateService.checkForUpdates.mockResolvedValue(updateInfo);
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:check-for-updates')[1];

      const result = await handler();

      expect(result).toEqual(updateInfo);
      expect(mockLoggingService.info).toHaveBeenCalledWith('Update check result: Up to date');
    });

    test('handles errors gracefully', async () => {
      const error = new Error('Network error');
      mockUpdateService.checkForUpdates.mockRejectedValue(error);
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:check-for-updates')[1];

      await expect(handler()).rejects.toThrow('Network error');
      expect(mockLoggingService.error).toHaveBeenCalledWith('Failed to check for updates:', error);
    });
  });

  describe('get-release-notes handler', () => {
    test('formats release notes successfully', async () => {
      const release = {
        tag_name: 'v2.1.0',
        body: '## Features\n\n- **New feature**\n- *Another feature*'
      };

      const formattedNotes = 'Features\n\n- New feature\n- Another feature';
      mockUpdateService.formatReleaseNotes.mockReturnValue(formattedNotes);
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:get-release-notes')[1];

      const result = await handler(null, release);

      expect(result).toBe(formattedNotes);
      expect(mockUpdateService.formatReleaseNotes).toHaveBeenCalledWith(release);
      expect(mockLoggingService.info).toHaveBeenCalledWith('Formatted release notes');
    });

    test('handles errors gracefully', async () => {
      const release = { tag_name: 'v2.1.0' };
      const error = new Error('Formatting failed');
      mockUpdateService.formatReleaseNotes.mockImplementation(() => {
        throw error;
      });
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:get-release-notes')[1];

      await expect(handler(null, release)).rejects.toThrow('Formatting failed');
      expect(mockLoggingService.error).toHaveBeenCalledWith('Failed to format release notes:', error);
    });
  });

  describe('check-for-updates-auto handler', () => {
    test('checks for updates using autoUpdater successfully', async () => {
      mockUpdateService.checkForUpdatesAutoUpdater.mockResolvedValue(undefined);
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:check-for-updates-auto')[1];

      const result = await handler();

      expect(result).toEqual({ success: true });
      expect(mockLoggingService.info).toHaveBeenCalledWith('Checking for updates using autoUpdater...');
    });

    test('handles autoUpdater errors', async () => {
      const error = new Error('AutoUpdater failed');
      mockUpdateService.checkForUpdatesAutoUpdater.mockRejectedValue(error);
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:check-for-updates-auto')[1];

      const result = await handler();

      expect(result).toEqual({ success: false, error: 'AutoUpdater failed' });
      expect(mockLoggingService.error).toHaveBeenCalledWith('Failed to check for updates:', error);
    });
  });

  describe('download handler', () => {
    test('downloads update successfully', async () => {
      mockUpdateService.downloadUpdate.mockResolvedValue(undefined);
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:download')[1];

      const result = await handler();

      expect(result).toEqual({ success: true });
      expect(mockLoggingService.info).toHaveBeenCalledWith('Starting update download...');
    });

    test('handles download errors', async () => {
      const error = new Error('Download failed');
      mockUpdateService.downloadUpdate.mockRejectedValue(error);
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:download')[1];

      const result = await handler();

      expect(result).toEqual({ success: false, error: 'Download failed' });
      expect(mockLoggingService.error).toHaveBeenCalledWith('Failed to download update:', error);
    });
  });

  describe('install handler', () => {
    test('installs update successfully', async () => {
      mockUpdateService.installUpdate.mockResolvedValue(undefined);
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:install')[1];

      const result = await handler();

      expect(result).toEqual({ success: true });
      expect(mockLoggingService.info).toHaveBeenCalledWith('Installing update...');
    });

    test('handles install errors', async () => {
      const error = new Error('Installation failed');
      mockUpdateService.installUpdate.mockRejectedValue(error);
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:install')[1];

      const result = await handler();

      expect(result).toEqual({ success: false, error: 'Installation failed' });
      expect(mockLoggingService.error).toHaveBeenCalledWith('Failed to install update:', error);
    });
  });

  describe('get-status handler', () => {
    test('returns current status successfully', async () => {
      const status = {
        status: 'available',
        updateInfo: {
          hasUpdate: true,
          currentVersion: '2.0.0',
          latestVersion: '2.1.0'
        }
      };

      mockUpdateService.getCurrentStatus.mockReturnValue(status);
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:get-status')[1];

      const result = await handler();

      expect(result).toEqual(status);
    });

    test('handles status errors', async () => {
      const error = new Error('Status check failed');
      mockUpdateService.getCurrentStatus.mockImplementation(() => {
        throw error;
      });
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:get-status')[1];

      await expect(handler()).rejects.toThrow('Status check failed');
      expect(mockLoggingService.error).toHaveBeenCalledWith('Failed to get update status:', error);
    });
  });

  describe('status-changed event handler', () => {
    test('sends status updates to all windows', () => {
      const mockWindow1 = {
        isDestroyed: vi.fn().mockReturnValue(false),
        webContents: {
          send: vi.fn()
        }
      };

      const mockWindow2 = {
        isDestroyed: vi.fn().mockReturnValue(false),
        webContents: {
          send: vi.fn()
        }
      };

      mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow1, mockWindow2]);

      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      
      // Get the event listener function
      const eventListener = mockUpdateService.on.mock.calls.find(call => call[0] === 'status-changed')[1];
      
      const statusUpdate = {
        status: 'downloading',
        progress: { percent: 50, transferred: 1024, total: 2048, bytesPerSecond: 100 }
      };

      eventListener(statusUpdate);

      expect(mockWindow1.webContents.send).toHaveBeenCalledWith('update:status-changed', statusUpdate);
      expect(mockWindow2.webContents.send).toHaveBeenCalledWith('update:status-changed', statusUpdate);
    });

    test('skips destroyed windows', () => {
      const mockWindow1 = {
        isDestroyed: vi.fn().mockReturnValue(true),
        webContents: {
          send: vi.fn()
        }
      };

      const mockWindow2 = {
        isDestroyed: vi.fn().mockReturnValue(false),
        webContents: {
          send: vi.fn()
        }
      };

      mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow1, mockWindow2]);

      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      
      const eventListener = mockUpdateService.on.mock.calls.find(call => call[0] === 'status-changed')[1];
      const statusUpdate = { status: 'available' };

      eventListener(statusUpdate);

      expect(mockWindow1.webContents.send).not.toHaveBeenCalled();
      expect(mockWindow2.webContents.send).toHaveBeenCalledWith('update:status-changed', statusUpdate);
    });

    test('handles empty windows array', () => {
      mockBrowserWindow.getAllWindows.mockReturnValue([]);

      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      
      const eventListener = mockUpdateService.on.mock.calls.find(call => call[0] === 'status-changed')[1];
      const statusUpdate = { status: 'available' };

      // Should not throw
      expect(() => eventListener(statusUpdate)).not.toThrow();
    });
  });

  describe('error handling', () => {
    test('handles non-Error objects in error handlers', async () => {
      mockUpdateService.getCurrentVersion.mockImplementation(() => {
        throw 'String error';
      });
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:get-current-version')[1];

      await expect(handler()).rejects.toThrow('String error');
      expect(mockLoggingService.error).toHaveBeenCalledWith('Failed to get current version:', 'String error');
    });

    test('handles null/undefined errors', async () => {
      mockUpdateService.checkForUpdates.mockImplementation(() => {
        throw null;
      });
      
      registerUpdateHandlers(mockUpdateService, mockLoggingService);
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'update:check-for-updates')[1];

      await expect(handler()).rejects.toThrow();
      expect(mockLoggingService.error).toHaveBeenCalledWith('Failed to check for updates:', null);
    });
  });
});
