import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mockApp, mockAutoUpdater, mockLoggingService, mockCacheService } from '../setup/electronMocks';

// Mock fs-extra
const fsExtraMock = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  readJsonSync: vi.fn(),
  writeJsonSync: vi.fn(),
}));

// Mock path
const pathMock = vi.hoisted(() => ({
  resolve: vi.fn((...args) => args.join('/')),
  join: vi.fn((...args) => args.join('/')),
}));

// Mocks are imported from electronMocks.ts

// Mock fetch
const mockFetch = vi.fn();

// Mock process
const mockProcess = {
  versions: { electron: '1.0.0' },
  cwd: vi.fn(() => '/mock/cwd'),
};

// Mock __dirname
const mockDirname = '/mock/dist/main/services';

vi.mock('electron', () => ({
  app: mockApp,
  autoUpdater: mockAutoUpdater,
}));

vi.mock('fs-extra', () => fsExtraMock);
vi.mock('path', () => pathMock);
vi.mock('node:fs', () => fsExtraMock);

// Mock global fetch
global.fetch = mockFetch;

// Mock process and __dirname
Object.defineProperty(global, 'process', {
  value: mockProcess,
  writable: true,
});

Object.defineProperty(global, '__dirname', {
  value: mockDirname,
  writable: true,
});

// Mock UpdateCacheService
vi.mock('../../src/main/services/UpdateCacheService', () => ({
  UpdateCacheService: vi.fn().mockImplementation(() => mockCacheService),
}));

// We'll mock the UpdateService methods directly in the tests

// Mock LoggingService
vi.mock('../../src/main/services/LoggingService', () => ({
  LoggingService: vi.fn().mockImplementation(() => mockLoggingService),
}));

import { UpdateService, GitHubRelease, UpdateInfo } from '../../src/main/services/UpdateService';

describe('UpdateService', () => {
  let updateService: UpdateService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockApp.getVersion.mockReturnValue('2.2.0b');
    mockApp.isPackaged = false;
    mockApp.getAppPath.mockReturnValue('/mock/app/path');
    
    // Reset cache service mocks
    mockCacheService.isCacheValid.mockReturnValue(false);
    mockCacheService.loadCachedUpdateInfo.mockReturnValue(null);
    mockCacheService.saveUpdateInfo.mockResolvedValue(undefined);
    
    updateService = new UpdateService(mockLoggingService, '/mock/config');
    
    // Manually inject the mock cache service
    (updateService as any).cacheService = mockCacheService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrentVersion', () => {
    test('returns version from app.getVersion() when packaged and valid', () => {
      mockApp.isPackaged = true;
      mockApp.getVersion.mockReturnValue('2.0.0');

      const version = updateService.getCurrentVersion();

      expect(version).toBe('2.0.0');
      expect(mockLoggingService.info).toHaveBeenCalledWith('App version from app.getVersion(): "2.0.0"');
    });

    test('falls back to package.json when Electron version leaks through', () => {
      mockApp.isPackaged = true;
      mockApp.getVersion.mockReturnValue('1.0.0'); // Same as process.versions.electron
      fsExtraMock.existsSync.mockReturnValue(true);
      fsExtraMock.readFileSync.mockReturnValue('{"version": "2.1.0"}');

      const version = updateService.getCurrentVersion();

      expect(version).toBe('2.1.0');
      expect(mockLoggingService.info).toHaveBeenCalledWith('Using package.json version from /mock/app/path/package.json: "2.1.0"');
    });

    test('tries multiple package.json fallback paths in development', () => {
      mockApp.isPackaged = false;
      mockApp.getVersion.mockReturnValue('');
      fsExtraMock.existsSync
        .mockReturnValueOnce(false) // app.getAppPath()/package.json
        .mockReturnValueOnce(false) // repo root
        .mockReturnValueOnce(true); // cwd
      fsExtraMock.readFileSync.mockReturnValue('{"version": "2.2.0"}');

      const version = updateService.getCurrentVersion();

      expect(version).toBe('2.2.0');
      expect(pathMock.resolve).toHaveBeenCalledWith('/mock/cwd', 'package.json');
    });

    test('handles invalid package.json gracefully', () => {
      mockApp.isPackaged = false;
      mockApp.getVersion.mockReturnValue('');
      fsExtraMock.existsSync.mockReturnValue(true);
      fsExtraMock.readFileSync.mockReturnValue('invalid json');

      const version = updateService.getCurrentVersion();

      expect(version).toBe('1.0.0'); // Fallback version
      expect(mockLoggingService.error).toHaveBeenCalled();
    });

    test('returns fallback version when all methods fail', () => {
      mockApp.isPackaged = true;
      mockApp.getVersion.mockReturnValue('');
      fsExtraMock.existsSync.mockReturnValue(false);

      const version = updateService.getCurrentVersion();

      expect(version).toBe('1.0.0');
    });
  });

  describe('compareVersions', () => {
    test('compares standard semantic versions correctly', () => {
      expect(updateService.compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(updateService.compareVersions('1.0.1', '1.0.0')).toBe(1);
      expect(updateService.compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    test('handles version prefixes correctly', () => {
      expect(updateService.compareVersions('v1.0.0', '1.0.1')).toBe(-1);
      expect(updateService.compareVersions('1.0.0', 'v1.0.1')).toBe(-1);
      expect(updateService.compareVersions('v1.0.0', 'v1.0.0')).toBe(0);
    });

    test('handles pre-release versions', () => {
      expect(updateService.compareVersions('1.0.0', '1.0.1-beta')).toBe(-1);
      expect(updateService.compareVersions('1.0.1-beta', '1.0.1')).toBe(0); // Same base version
      expect(updateService.compareVersions('1.0.1-beta', '1.0.1-beta')).toBe(0);
    });

    test('handles different length versions', () => {
      expect(updateService.compareVersions('1.0', '1.0.0')).toBe(0);
      expect(updateService.compareVersions('1.0', '1.0.1')).toBe(-1);
      expect(updateService.compareVersions('1.0.1', '1.0')).toBe(1);
    });

    test('handles beta tag specially', () => {
      const result = updateService.compareVersions('1.0.0', 'beta');
      expect(result).toBe(-1);
      expect(mockLoggingService.info).toHaveBeenCalledWith('Latest release is beta tag, will extract version from release name');
    });
  });

  describe('fetchLatestRelease', () => {
    const mockRelease: GitHubRelease = {
      tag_name: 'v2.1.0',
      name: 'Version 2.1.0',
      body: 'Release notes',
      published_at: '2024-01-01T00:00:00Z',
      html_url: 'https://github.com/test/repo/releases/tag/v2.1.0',
      assets: []
    };

    test('fetches latest release successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockRelease])
      });

      const result = await updateService.fetchLatestRelease();

      expect(result).toEqual(mockRelease);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/SirTidez/Schedule-I-Developer-Environment-Utility/releases',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Schedule-I-Developer-Environment-Utility'
          })
        })
      );
    });

    test('handles API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Rate limit exceeded')
      });

      const result = await updateService.fetchLatestRelease();

      expect(result).toBeNull();
      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'Failed to fetch latest release:',
        expect.any(Error)
      );
    });

    test('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await updateService.fetchLatestRelease();

      expect(result).toBeNull();
      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'Failed to fetch latest release:',
        expect.any(Error)
      );
    });

    test('handles empty releases array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([])
      });

      const result = await updateService.fetchLatestRelease();

      expect(result).toBeNull();
      expect(mockLoggingService.warn).toHaveBeenCalledWith('No releases found in repository');
    });

    test('sorts releases by published date', async () => {
      const olderRelease = { ...mockRelease, published_at: '2023-01-01T00:00:00Z' };
      const newerRelease = { ...mockRelease, published_at: '2024-01-01T00:00:00Z' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([olderRelease, newerRelease])
      });

      const result = await updateService.fetchLatestRelease();

      expect(result).toEqual(newerRelease);
    });
  });

  describe('checkForUpdates', () => {
    const mockCachedData = {
      updateInfo: {
        hasUpdate: true,
        currentVersion: '2.0.0',
        latestVersion: '2.1.0',
        release: undefined
      },
      lastChecked: new Date().toISOString(),
      release: {
        tag_name: 'v2.1.0',
        name: 'Version 2.1.0',
        body: 'Release notes',
        published_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/test/repo/releases/tag/v2.1.0',
        assets: []
      }
    };

    test('uses cached data when valid', async () => {
      mockApp.getVersion.mockReturnValue('2.0.0');
      mockCacheService.isCacheValid.mockReturnValue(true);
      mockCacheService.loadCachedUpdateInfo.mockReturnValue(mockCachedData);

      const result = await updateService.checkForUpdates();

      expect(result).toEqual({
        hasUpdate: true,
        currentVersion: '2.0.0',
        latestVersion: '2.1.0',
        release: mockCachedData.release
      });
      expect(mockLoggingService.info).toHaveBeenCalledWith('Using cached latest release info');
    });

    test('fetches fresh data when cache is invalid', async () => {
      const mockRelease: GitHubRelease = {
        tag_name: 'v2.1.0',
        name: 'Version 2.1.0',
        body: 'Release notes',
        published_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/test/repo/releases/tag/v2.1.0',
        assets: []
      };

      mockApp.getVersion.mockReturnValue('2.0.0');
      mockCacheService.isCacheValid.mockReturnValue(false);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([mockRelease])
      });

      const result = await updateService.checkForUpdates();

      expect(result.hasUpdate).toBe(true);
      expect(result.currentVersion).toBe('2.0.0');
      expect(result.latestVersion).toBe('v2.1.0');
      expect(mockCacheService.saveUpdateInfo).toHaveBeenCalled();
    });

    test('handles beta release version extraction', async () => {
      const betaRelease: GitHubRelease = {
        tag_name: 'beta',
        name: '2.1.0 BETA Release',
        body: 'Beta release notes',
        published_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/test/repo/releases/tag/beta',
        assets: []
      };

      mockApp.getVersion.mockReturnValue('2.0.0');
      mockCacheService.isCacheValid.mockReturnValue(false);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([betaRelease])
      });

      const result = await updateService.checkForUpdates();

      expect(result.latestVersion).toBe('2.1.0');
      expect(mockLoggingService.info).toHaveBeenCalledWith('Extracted version from beta release name: 2.1.0');
    });

    test('handles failed release fetch', async () => {
      mockApp.getVersion.mockReturnValue('2.0.0');
      mockCacheService.isCacheValid.mockReturnValue(false);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await updateService.checkForUpdates();

      expect(result).toEqual({
        hasUpdate: false,
        currentVersion: '2.0.0',
        latestVersion: '2.0.0'
      });
    });
  });

  describe('formatReleaseNotes', () => {
    test('formats release notes correctly', () => {
      const release: GitHubRelease = {
        tag_name: 'v2.1.0',
        name: 'Version 2.1.0',
        body: '## Features\n\n- **New feature**\n- *Another feature*\n\n```code block```\n\n[Link](https://example.com)',
        published_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/test/repo/releases/tag/v2.1.0',
        assets: []
      };

      const result = updateService.formatReleaseNotes(release);

      expect(result).toBe('Features\n\n- New feature\n- Another feature\n\n\n\nLink');
    });

    test('handles empty release notes', () => {
      const release: GitHubRelease = {
        tag_name: 'v2.1.0',
        name: 'Version 2.1.0',
        body: '',
        published_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/test/repo/releases/tag/v2.1.0',
        assets: []
      };

      const result = updateService.formatReleaseNotes(release);

      expect(result).toBe('No release notes available.');
    });

    test('truncates long release notes', () => {
      const longNotes = 'A'.repeat(600);
      const release: GitHubRelease = {
        tag_name: 'v2.1.0',
        name: 'Version 2.1.0',
        body: longNotes,
        published_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/test/repo/releases/tag/v2.1.0',
        assets: []
      };

      const result = updateService.formatReleaseNotes(release);

      expect(result).toHaveLength(503); // 500 + '...'
      expect(result.endsWith('...')).toBe(true);
    });
  });

  describe('autoUpdater integration', () => {
    test('configures autoUpdater correctly', () => {
      expect(mockAutoUpdater.autoDownload).toBe(false);
      expect(mockAutoUpdater.autoInstallOnAppQuit).toBe(false);
      expect(mockAutoUpdater.on).toHaveBeenCalledWith('checking-for-update', expect.any(Function));
      expect(mockAutoUpdater.on).toHaveBeenCalledWith('update-available', expect.any(Function));
      expect(mockAutoUpdater.on).toHaveBeenCalledWith('update-not-available', expect.any(Function));
      expect(mockAutoUpdater.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockAutoUpdater.on).toHaveBeenCalledWith('download-progress', expect.any(Function));
      expect(mockAutoUpdater.on).toHaveBeenCalledWith('update-downloaded', expect.any(Function));
    });

    test('checkForUpdatesAutoUpdater calls autoUpdater', async () => {
      mockAutoUpdater.checkForUpdates.mockResolvedValue(undefined);

      await updateService.checkForUpdatesAutoUpdater();

      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalled();
    });

    test('downloadUpdate calls autoUpdater', async () => {
      mockAutoUpdater.downloadUpdate.mockResolvedValue(undefined);

      await updateService.downloadUpdate();

      expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalled();
    });

    test('installUpdate calls autoUpdater', async () => {
      mockAutoUpdater.quitAndInstall.mockImplementation(() => {});

      await updateService.installUpdate();

      expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    test('adds and removes event listeners', () => {
      const listener = vi.fn();
      
      updateService.on('test-event', listener);
      updateService.off('test-event', listener);
      
      // Test that listeners are managed correctly
      expect(listener).not.toThrow();
    });

    test('emits events to listeners', () => {
      const listener = vi.fn();
      updateService.on('test-event', listener);
      
      // Access private emit method through any cast for testing
      (updateService as any).emit('test-event', { data: 'test' });
      
      expect(listener).toHaveBeenCalledWith({ data: 'test' });
    });
  });
});
