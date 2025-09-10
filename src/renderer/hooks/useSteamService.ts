import { useState, useCallback } from 'react';

export interface SteamLibrary {
  path: string;
  isValid: boolean;
}

export interface AppManifest {
  buildId: number;
  name: string;
  state: number;
  lastUpdated: number;
}

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
  };
};
