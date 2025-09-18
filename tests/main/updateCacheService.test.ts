import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mock fs-extra
const fsExtraMock = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readJsonSync: vi.fn(),
  writeJsonSync: vi.fn(),
}));

// Mock path
const pathMock = vi.hoisted(() => ({
  join: vi.fn((...args) => args.join('/')),
}));

// Mock LoggingService
const mockLoggingService = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('fs-extra', () => fsExtraMock);
vi.mock('path', () => pathMock);

import { UpdateCacheService, CachedUpdateInfo } from '../../src/main/services/UpdateCacheService';
import { UpdateInfo, GitHubRelease } from '../../src/main/services/UpdateService';

describe('UpdateCacheService', () => {
  let cacheService: UpdateCacheService;
  const mockConfigDir = '/mock/config';

  const mockUpdateInfo: UpdateInfo = {
    hasUpdate: true,
    currentVersion: '2.0.0',
    latestVersion: '2.1.0',
    release: undefined
  };

  const mockRelease: GitHubRelease = {
    tag_name: 'v2.1.0',
    name: 'Version 2.1.0',
    body: 'Release notes',
    published_at: '2024-01-01T00:00:00Z',
    html_url: 'https://github.com/test/repo/releases/tag/v2.1.0',
    assets: []
  };

  const mockCachedData: CachedUpdateInfo = {
    updateInfo: mockUpdateInfo,
    lastChecked: new Date().toISOString(),
    release: mockRelease
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cacheService = new UpdateCacheService(mockLoggingService, mockConfigDir);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('isCacheValid', () => {
    test('returns false when cache file does not exist', () => {
      fsExtraMock.existsSync.mockReturnValue(false);

      const result = cacheService.isCacheValid();

      expect(result).toBe(false);
      expect(mockLoggingService.info).toHaveBeenCalledWith('No update cache file found');
    });

    test('returns true when cache is less than 1 hour old', () => {
      const oneHourAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const cachedData = {
        ...mockCachedData,
        lastChecked: oneHourAgo.toISOString()
      };

      fsExtraMock.existsSync.mockReturnValue(true);
      fsExtraMock.readJsonSync.mockReturnValue(cachedData);

      const result = cacheService.isCacheValid();

      expect(result).toBe(true);
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        expect.stringContaining('Cache last checked:') && expect.stringContaining('0.5 hours ago')
      );
    });

    test('returns false when cache is more than 1 hour old', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const cachedData = {
        ...mockCachedData,
        lastChecked: twoHoursAgo.toISOString()
      };

      fsExtraMock.existsSync.mockReturnValue(true);
      fsExtraMock.readJsonSync.mockReturnValue(cachedData);

      const result = cacheService.isCacheValid();

      expect(result).toBe(false);
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        expect.stringContaining('Cache last checked:') && expect.stringContaining('2.0 hours ago')
      );
    });

    test('returns false when cache file is corrupted', () => {
      fsExtraMock.existsSync.mockReturnValue(true);
      fsExtraMock.readJsonSync.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const result = cacheService.isCacheValid();

      expect(result).toBe(false);
      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'Error checking cache validity:',
        expect.any(Error)
      );
    });

    test('returns false when cache data is missing required fields', () => {
      const invalidCachedData = {
        updateInfo: mockUpdateInfo,
        // Missing lastChecked
        release: mockRelease
      };

      fsExtraMock.existsSync.mockReturnValue(true);
      fsExtraMock.readJsonSync.mockReturnValue(invalidCachedData);

      const result = cacheService.isCacheValid();

      expect(result).toBe(false);
    });

    test('handles edge case of exactly 1 hour old cache', () => {
      const exactlyOneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // Exactly 1 hour ago
      const cachedData = {
        ...mockCachedData,
        lastChecked: exactlyOneHourAgo.toISOString()
      };

      fsExtraMock.existsSync.mockReturnValue(true);
      fsExtraMock.readJsonSync.mockReturnValue(cachedData);

      const result = cacheService.isCacheValid();

      expect(result).toBe(false); // Should be false as it's not less than 1 hour
    });
  });

  describe('loadCachedUpdateInfo', () => {
    test('loads cached data successfully', () => {
      fsExtraMock.existsSync.mockReturnValue(true);
      fsExtraMock.readJsonSync.mockReturnValue(mockCachedData);

      const result = cacheService.loadCachedUpdateInfo();

      expect(result).toEqual(mockCachedData);
      expect(mockLoggingService.info).toHaveBeenCalledWith('Loaded cached update info');
    });

    test('returns null when cache file does not exist', () => {
      fsExtraMock.existsSync.mockReturnValue(false);

      const result = cacheService.loadCachedUpdateInfo();

      expect(result).toBeNull();
      expect(mockLoggingService.info).toHaveBeenCalledWith('No update cache file found');
    });

    test('returns null when cache file is corrupted', () => {
      fsExtraMock.existsSync.mockReturnValue(true);
      fsExtraMock.readJsonSync.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const result = cacheService.loadCachedUpdateInfo();

      expect(result).toBeNull();
      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'Error loading cached update info:',
        expect.any(Error)
      );
    });

    test('handles file read permissions error', () => {
      fsExtraMock.existsSync.mockReturnValue(true);
      fsExtraMock.readJsonSync.mockImplementation(() => {
        const error = new Error('EACCES: permission denied');
        error.code = 'EACCES';
        throw error;
      });

      const result = cacheService.loadCachedUpdateInfo();

      expect(result).toBeNull();
      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'Error loading cached update info:',
        expect.any(Error)
      );
    });
  });

  describe('saveUpdateInfo', () => {
    test('saves update info successfully', () => {
      fsExtraMock.writeJsonSync.mockImplementation(() => {});

      cacheService.saveUpdateInfo(mockUpdateInfo, mockRelease);

      expect(fsExtraMock.writeJsonSync).toHaveBeenCalledWith(
        '/mock/config/update.json',
        expect.objectContaining({
          updateInfo: mockUpdateInfo,
          lastChecked: expect.any(String),
          release: mockRelease
        }),
        { spaces: 2 }
      );
      expect(mockLoggingService.info).toHaveBeenCalledWith(
        'Saved update info to cache: /mock/config/update.json'
      );
    });

    test('handles file write errors gracefully', () => {
      fsExtraMock.writeJsonSync.mockImplementation(() => {
        throw new Error('ENOSPC: no space left on device');
      });

      // Should not throw
      expect(() => {
        cacheService.saveUpdateInfo(mockUpdateInfo, mockRelease);
      }).not.toThrow();

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'Error saving update info to cache:',
        expect.any(Error)
      );
    });

    test('handles directory creation errors', () => {
      const directoryError = new Error('EACCES: permission denied');
      directoryError.code = 'EACCES';
      fsExtraMock.writeJsonSync.mockImplementation(() => {
        throw directoryError;
      });

      cacheService.saveUpdateInfo(mockUpdateInfo, mockRelease);

      expect(mockLoggingService.error).toHaveBeenCalledWith(
        'Error saving update info to cache:',
        expect.any(Error)
      );
    });

    test('saves with correct timestamp format', () => {
      const fixedDate = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(fixedDate);

      fsExtraMock.writeJsonSync.mockImplementation(() => {});

      cacheService.saveUpdateInfo(mockUpdateInfo, mockRelease);

      expect(fsExtraMock.writeJsonSync).toHaveBeenCalledWith(
        '/mock/config/update.json',
        expect.objectContaining({
          lastChecked: '2024-01-01T12:00:00.000Z'
        }),
        { spaces: 2 }
      );
    });
  });

  describe('getCacheFilePath', () => {
    test('returns correct cache file path', () => {
      const result = cacheService.getCacheFilePath();

      expect(result).toBe('/mock/config/update.json');
      expect(pathMock.join).toHaveBeenCalledWith('/mock/config', 'update.json');
    });
  });

  describe('cache data integrity', () => {
    test('saved data can be loaded back correctly', () => {
      // Save data
      fsExtraMock.writeJsonSync.mockImplementation(() => {});
      cacheService.saveUpdateInfo(mockUpdateInfo, mockRelease);

      // Load data back
      const savedData = fsExtraMock.writeJsonSync.mock.calls[0][1];
      fsExtraMock.existsSync.mockReturnValue(true);
      fsExtraMock.readJsonSync.mockReturnValue(savedData);

      const loadedData = cacheService.loadCachedUpdateInfo();

      expect(loadedData).toEqual(savedData);
      expect(loadedData?.updateInfo).toEqual(mockUpdateInfo);
      expect(loadedData?.release).toEqual(mockRelease);
      expect(loadedData?.lastChecked).toBeDefined();
    });

    test('handles malformed cached data gracefully', () => {
      const malformedData = {
        updateInfo: {
          // Missing required fields
          hasUpdate: true
        },
        lastChecked: 'invalid-date',
        release: null
      };

      fsExtraMock.existsSync.mockReturnValue(true);
      fsExtraMock.readJsonSync.mockReturnValue(malformedData);

      const result = cacheService.loadCachedUpdateInfo();

      expect(result).toEqual(malformedData);
      // The service should handle malformed data gracefully
    });
  });

  describe('concurrent access', () => {
    test('handles concurrent read operations', () => {
      fsExtraMock.existsSync.mockReturnValue(true);
      fsExtraMock.readJsonSync.mockReturnValue(mockCachedData);

      // Simulate concurrent reads
      const promises = Array.from({ length: 5 }, () => 
        cacheService.loadCachedUpdateInfo()
      );

      return Promise.all(promises).then(results => {
        results.forEach(result => {
          expect(result).toEqual(mockCachedData);
        });
      });
    });

    test('handles concurrent write operations', () => {
      fsExtraMock.writeJsonSync.mockImplementation(() => {});

      // Simulate concurrent writes
      const promises = Array.from({ length: 3 }, () => 
        Promise.resolve(cacheService.saveUpdateInfo(mockUpdateInfo, mockRelease))
      );

      return Promise.all(promises).then(() => {
        expect(fsExtraMock.writeJsonSync).toHaveBeenCalledTimes(3);
      });
    });
  });
});
