/**
 * Configuration Service Hook for Schedule I Developer Environment Utility
 * 
 * Custom React hook that provides configuration management functionality to components.
 * Handles loading, updating, and managing application configuration with proper
 * state management, error handling, and automatic configuration loading.
 * 
 * Key features:
 * - Configuration loading and updating
 * - Managed environment path management
 * - Build ID tracking for branches
 * - Automatic configuration loading on mount
 * - Error handling with user-friendly messages
 * - Loading states for async operations
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.0
 */

import { useState, useCallback, useEffect } from 'react';
import { DevEnvironmentConfig } from '../../shared/types';

/**
 * Custom hook for configuration service operations
 * 
 * Provides a comprehensive interface for configuration management including
 * loading, updating, and path management. Includes proper state management,
 * error handling, and automatic configuration loading on component mount.
 * 
 * @returns Object containing configuration service methods and state
 */
export const useConfigService = () => {
  const [config, setConfig] = useState<DevEnvironmentConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const configData = await window.electronAPI.config.get();
      setConfig(configData);
      return configData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (updates: Partial<DevEnvironmentConfig>) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedConfig = await window.electronAPI.config.update(updates);
      setConfig(updatedConfig);
      return updatedConfig;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update configuration';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getManagedPath = useCallback(async () => {
    try {
      return await window.electronAPI.config.getManagedPath();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get managed environment path';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const setManagedPath = useCallback(async (path: string) => {
    try {
      const updatedPath = await window.electronAPI.config.setManagedPath(path);
      if (config) {
        setConfig({ ...config, managedEnvironmentPath: updatedPath });
      }
      return updatedPath;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set managed environment path';
      setError(errorMessage);
      throw err;
    }
  }, [config]);

  const setBuildIdForBranch = useCallback(async (branchName: string, buildId: string) => {
    try {
      await window.electronAPI.config.setBuildIdForBranch(branchName, buildId);
      // Reload config to get updated build IDs
      await loadConfig();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set build ID for branch';
      setError(errorMessage);
      throw err;
    }
  }, [loadConfig]);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    loadConfig,
    updateConfig,
    getManagedPath,
    setManagedPath,
    setBuildIdForBranch,
  };
};
