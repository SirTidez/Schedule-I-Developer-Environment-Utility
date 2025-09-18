import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock window.electronAPI
const mockElectronAPI = {
  update: {
    getCurrentVersion: vi.fn(),
    checkForUpdates: vi.fn(),
    getReleaseNotes: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
  },
};

// Attach the mock surface so hooks interact with a realistic bridge.
Object.defineProperty(global, 'window', {
  value: {
    electronAPI: mockElectronAPI,
  },
  writable: true,
});

import { useUpdateService } from '../../src/renderer/hooks/useUpdateService';

describe('useUpdateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Initialisation covers the boot-time effect that seeds version data.
  describe('initialization', () => {
    test('loads current version on mount', async () => {
      mockElectronAPI.update.getCurrentVersion.mockResolvedValue('2.1.0');

      const { result } = renderHook(() => useUpdateService());

      expect(result.current.currentVersion).toBe('');
      expect(result.current.updateInfo).toBeNull();
      expect(result.current.isChecking).toBe(false);

      // Wait for useEffect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockElectronAPI.update.getCurrentVersion).toHaveBeenCalled();
      expect(result.current.currentVersion).toBe('2.1.0');
    });

    test('handles getCurrentVersion errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockElectronAPI.update.getCurrentVersion.mockRejectedValue(new Error('Version check failed'));

      const { result } = renderHook(() => useUpdateService());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.currentVersion).toBe('');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get current version:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  // Explicit getCurrentVersion calls should update cached state and return values.
  describe('getCurrentVersion', () => {
    test('retrieves and sets current version', async () => {
      mockElectronAPI.update.getCurrentVersion.mockResolvedValue('2.2.0');

      const { result } = renderHook(() => useUpdateService());

      const version = await act(async () => {
        return await result.current.getCurrentVersion();
      });

      expect(version).toBe('2.2.0');
      expect(result.current.currentVersion).toBe('2.2.0');
      expect(mockElectronAPI.update.getCurrentVersion).toHaveBeenCalled();
    });

    test('handles errors and returns empty string', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockElectronAPI.update.getCurrentVersion.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useUpdateService());

      const version = await act(async () => {
        return await result.current.getCurrentVersion();
      });

      expect(version).toBe('');
      expect(result.current.currentVersion).toBe('');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get current version:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  // Update polling validates happy path, in-flight, and failure behaviours.
  describe('checkForUpdates', () => {
    test('checks for updates successfully', async () => {
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

      mockElectronAPI.update.checkForUpdates.mockResolvedValue(updateInfo);

      const { result } = renderHook(() => useUpdateService());

      let returnedInfo;
      await act(async () => {
        returnedInfo = await result.current.checkForUpdates();
      });

      expect(returnedInfo).toEqual(updateInfo);
      expect(result.current.updateInfo).toEqual(updateInfo);
      expect(result.current.isChecking).toBe(false);
      expect(mockElectronAPI.update.checkForUpdates).toHaveBeenCalled();
    });

    test('sets loading state during check', async () => {
      let resolveCheck;
      const checkPromise = new Promise(resolve => {
        resolveCheck = resolve;
      });
      mockElectronAPI.update.checkForUpdates.mockReturnValue(checkPromise);

      const { result } = renderHook(() => useUpdateService());

      // Start the check
      act(() => {
        result.current.checkForUpdates();
      });

      expect(result.current.isChecking).toBe(true);

      // Complete the check
      await act(async () => {
        resolveCheck({
          hasUpdate: false,
          currentVersion: '2.1.0',
          latestVersion: '2.1.0'
        });
        await checkPromise;
      });

      expect(result.current.isChecking).toBe(false);
    });

    test('handles check errors and throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Check failed');
      mockElectronAPI.update.checkForUpdates.mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateService());

      await expect(act(async () => {
        await result.current.checkForUpdates();
      })).rejects.toThrow('Check failed');

      expect(result.current.isChecking).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to check for updates:', error);
      
      consoleSpy.mockRestore();
    });

    test('handles no update available', async () => {
      const updateInfo = {
        hasUpdate: false,
        currentVersion: '2.1.0',
        latestVersion: '2.1.0'
      };

      mockElectronAPI.update.checkForUpdates.mockResolvedValue(updateInfo);

      const { result } = renderHook(() => useUpdateService());

      await act(async () => {
        await result.current.checkForUpdates();
      });

      expect(result.current.updateInfo).toEqual(updateInfo);
      expect(result.current.isChecking).toBe(false);
    });
  });

  describe('getReleaseNotes', () => {
    test('retrieves release notes successfully', async () => {
      const release = {
        tag_name: 'v2.1.0',
        body: '## Features\n\n- New feature'
      };

      const formattedNotes = 'Features\n\n- New feature';
      mockElectronAPI.update.getReleaseNotes.mockResolvedValue(formattedNotes);

      const { result } = renderHook(() => useUpdateService());

      const notes = await act(async () => {
        return await result.current.getReleaseNotes(release);
      });

      expect(notes).toBe(formattedNotes);
      expect(mockElectronAPI.update.getReleaseNotes).toHaveBeenCalledWith(release);
    });

    test('handles release notes errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const release = { tag_name: 'v2.1.0' };
      mockElectronAPI.update.getReleaseNotes.mockRejectedValue(new Error('Notes failed'));

      const { result } = renderHook(() => useUpdateService());

      const notes = await act(async () => {
        return await result.current.getReleaseNotes(release);
      });

      expect(notes).toBe('Failed to load release notes.');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get release notes:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('state management', () => {
    test('maintains separate state for different operations', async () => {
      mockElectronAPI.update.getCurrentVersion.mockResolvedValue('2.0.0');
      mockElectronAPI.update.checkForUpdates.mockResolvedValue({
        hasUpdate: true,
        currentVersion: '2.0.0',
        latestVersion: '2.1.0'
      });

      const { result } = renderHook(() => useUpdateService());

      // Load initial version
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.currentVersion).toBe('2.0.0');
      expect(result.current.updateInfo).toBeNull();

      // Check for updates
      await act(async () => {
        await result.current.checkForUpdates();
      });

      expect(result.current.currentVersion).toBe('2.0.0');
      expect(result.current.updateInfo).toEqual({
        hasUpdate: true,
        currentVersion: '2.0.0',
        latestVersion: '2.1.0'
      });
    });

    test('resets checking state after error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockElectronAPI.update.checkForUpdates.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useUpdateService());

      // Wait for error
      await act(async () => {
        try {
          await result.current.checkForUpdates();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.isChecking).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });

  describe('concurrent operations', () => {
    test('handles multiple concurrent getCurrentVersion calls', async () => {
      mockElectronAPI.update.getCurrentVersion.mockResolvedValue('2.1.0');

      const { result } = renderHook(() => useUpdateService());

      // Wait for initial useEffect call
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Clear the mock to only count the manual calls
      mockElectronAPI.update.getCurrentVersion.mockClear();

      await act(async () => {
        const promises = [
          result.current.getCurrentVersion(),
          result.current.getCurrentVersion(),
          result.current.getCurrentVersion()
        ];
        await Promise.all(promises);
      });

      expect(mockElectronAPI.update.getCurrentVersion).toHaveBeenCalledTimes(3);
      expect(result.current.currentVersion).toBe('2.1.0');
    });

    test('handles concurrent checkForUpdates calls', async () => {
      const updateInfo = {
        hasUpdate: true,
        currentVersion: '2.0.0',
        latestVersion: '2.1.0'
      };

      mockElectronAPI.update.checkForUpdates.mockResolvedValue(updateInfo);

      const { result } = renderHook(() => useUpdateService());

      await act(async () => {
        const promises = [
          result.current.checkForUpdates(),
          result.current.checkForUpdates()
        ];
        await Promise.all(promises);
      });

      expect(mockElectronAPI.update.checkForUpdates).toHaveBeenCalledTimes(2);
      expect(result.current.updateInfo).toEqual(updateInfo);
    });
  });

  describe('hook cleanup', () => {
    test('handles component unmount gracefully', () => {
      mockElectronAPI.update.getCurrentVersion.mockResolvedValue('2.1.0');

      const { result, unmount } = renderHook(() => useUpdateService());

      // Unmount before async operations complete
      unmount();

      // Should not cause errors
      expect(() => {
        result.current.getCurrentVersion();
      }).not.toThrow();
    });
  });
});
