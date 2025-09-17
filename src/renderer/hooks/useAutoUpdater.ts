/**
 * React hook for managing auto-updater functionality
 * 
 * Provides a clean interface for checking, downloading, and installing updates
 * with real-time status updates and progress tracking.
 */

import { useState, useEffect, useCallback } from 'react';

export interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  error?: string;
  progress?: {
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
  };
  updateInfo?: {
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: string;
    release?: any;
  };
}

export interface UseAutoUpdaterReturn {
  status: UpdateStatus;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useAutoUpdater(): UseAutoUpdaterReturn {
  const [status, setStatus] = useState<UpdateStatus>({ status: 'not-available' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set up event listener for status changes
  useEffect(() => {
    const handleStatusChange = (newStatus: UpdateStatus) => {
      setStatus(newStatus);
      setError(newStatus.error || null);
    };

    // Set up the event listener
    window.electronAPI.update.onStatusChanged(handleStatusChange);

    // Get initial status
    window.electronAPI.update.getStatus().then(setStatus).catch(console.error);

    // Cleanup
    return () => {
      window.electronAPI.update.removeStatusChangedListener();
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await window.electronAPI.update.checkForUpdatesAuto();
      if (!result.success) {
        setError(result.error || 'Failed to check for updates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await window.electronAPI.update.downloadUpdate();
      if (!result.success) {
        setError(result.error || 'Failed to download update');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const installUpdate = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await window.electronAPI.update.installUpdate();
      if (!result.success) {
        setError(result.error || 'Failed to install update');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    status,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    isLoading,
    error
  };
}
