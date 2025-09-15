/**
 * Steam Service Hook for Schedule I Developer Environment Utility
 * 
 * Custom React hook that provides Steam-related functionality to components.
 * Handles Steam library detection, app manifest parsing, branch management,
 * and other Steam operations with proper state management and error handling.
 * 
 * Key features:
 * - Steam library detection and management
 * - App manifest parsing for build information
 * - Branch detection and verification
 * - Build ID management
 * - Error handling with user-friendly messages
 * - Loading states for async operations
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import { useState, useCallback } from 'react';

/**
 * Interface representing a Steam library
 * 
 * Contains information about a Steam library including its path
 * and validation status.
 */
export interface SteamLibrary {
  /** Path to the Steam library */
  path: string;
  /** Whether the library is valid and accessible */
  isValid: boolean;
}

/**
 * Interface representing a Steam app manifest
 * 
 * Contains essential information about a Steam application including
 * build ID, name, state, and last update timestamp.
 */
export interface AppManifest {
  /** The build ID of the application */
  buildId: number;
  /** The display name of the application */
  name: string;
  /** The current state of the application */
  state: number;
  /** Unix timestamp of the last update */
  lastUpdated: number;
}

/**
 * Custom hook for Steam service operations
 * 
 * Provides a comprehensive interface for Steam-related operations including
 * library detection, manifest parsing, and branch management. Includes
 * proper state management, error handling, and loading states.
 * 
 * @returns Object containing Steam service methods and state
 */
export const useSteamService = () => {
  const [libraries, setLibraries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectLibraries = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const detectedLibraries = await window.electronAPI.steam.detectLibraries();
      setLibraries(detectedLibraries);
      return detectedLibraries;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect Steam libraries';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const parseAppManifest = useCallback(async (appId: string, libraryPath: string): Promise<AppManifest> => {
    try {
      return await window.electronAPI.steam.parseManifest(appId, libraryPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse app manifest';
      throw new Error(errorMessage);
    }
  }, []);

  const getLibraries = useCallback(async () => {
    try {
      const libs = await window.electronAPI.steam.getLibraries();
      setLibraries(libs);
      return libs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get Steam libraries';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getScheduleIAppId = useCallback(async (): Promise<string> => {
    try {
      return await window.electronAPI.steam.getScheduleIAppId();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get Schedule I app ID';
      throw new Error(errorMessage);
    }
  }, []);

  const detectInstalledBranch = useCallback(async (libraryPath: string): Promise<string | null> => {
    try {
      return await window.electronAPI.steam.detectInstalledBranch(libraryPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect installed branch';
      throw new Error(errorMessage);
    }
  }, []);

  const findScheduleILibrary = useCallback(async (): Promise<string | null> => {
    try {
      return await window.electronAPI.steam.findScheduleILibrary();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find Schedule I library';
      throw new Error(errorMessage);
    }
  }, []);

  const getGamesFromLibrary = useCallback(async (libraryPath: string): Promise<any[]> => {
    try {
      return await window.electronAPI.steam.getGamesFromLibrary(libraryPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get games from library';
      throw new Error(errorMessage);
    }
  }, []);

  const verifyBranchInstalled = useCallback(async (libraryPath: string, expectedBranch: string): Promise<boolean> => {
    try {
      return await window.electronAPI.steam.verifyBranchInstalled(libraryPath, expectedBranch);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify branch installation';
      throw new Error(errorMessage);
    }
  }, []);

  const waitForBranchChange = useCallback(async (libraryPath: string, expectedBranch: string, maxWaitTime?: number): Promise<boolean> => {
    try {
      return await window.electronAPI.steam.waitForBranchChange(libraryPath, expectedBranch, maxWaitTime);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to wait for branch change';
      throw new Error(errorMessage);
    }
  }, []);

  const getBranchBuildId = useCallback(async (libraryPath: string, branchName: string): Promise<string> => {
    try {
      return await window.electronAPI.steam.getBranchBuildId(libraryPath, branchName);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get branch build ID';
      throw new Error(errorMessage);
    }
  }, []);

  const getCurrentSteamBuildId = useCallback(async (libraryPath: string): Promise<string> => {
    try {
      return await window.electronAPI.steam.getCurrentSteamBuildId(libraryPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get current Steam build ID';
      throw new Error(errorMessage);
    }
  }, []);

  const detectCurrentSteamBranchKey = useCallback(async (libraryPath: string): Promise<string | null> => {
    try {
      return await window.electronAPI.steam.detectCurrentSteamBranchKey(libraryPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect current Steam branch key';
      throw new Error(errorMessage);
    }
  }, []);

  const getInstalledManifestIds = useCallback(async (appId: string, libraryPath: string): Promise<string[]> => {
    try {
      return await window.electronAPI.steam.getInstalledManifestIds(appId, libraryPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get installed manifest IDs';
      throw new Error(errorMessage);
    }
  }, []);

  const getPrimaryManifestId = useCallback(async (appId: string, libraryPath: string): Promise<string | null> => {
    try {
      return await window.electronAPI.steam.getPrimaryManifestId(appId, libraryPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get primary manifest ID';
      throw new Error(errorMessage);
    }
  }, []);

  return {
    libraries,
    loading,
    error,
    detectLibraries,
    parseAppManifest,
    getLibraries,
    getScheduleIAppId,
    detectInstalledBranch,
    findScheduleILibrary,
    getGamesFromLibrary,
    verifyBranchInstalled,
    waitForBranchChange,
    getBranchBuildId,
    getCurrentSteamBuildId,
    detectCurrentSteamBranchKey,
    getInstalledManifestIds,
    getPrimaryManifestId,
  };
};
