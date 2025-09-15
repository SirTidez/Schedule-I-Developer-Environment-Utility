/**
 * Configuration IPC Handlers for Schedule I Developer Environment Utility
 * 
 * Provides IPC communication handlers for all configuration-related operations.
 * These handlers bridge the gap between the renderer process and the
 * ConfigService in the main process, enabling secure configuration management.
 * 
 * Handled operations:
 * - Configuration retrieval and updates
 * - Path management (config, logs, managed environment)
 * - Configuration validation
 * - File-based configuration operations
 * - Branch-specific settings management
 * - Multi-version branch support
 * - Manifest ID based version management
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.2.0
 */

import { ipcMain } from 'electron';
import { ConfigService } from '../services/ConfigService';

/** Configuration service instance for handling configuration operations */
const configService = new ConfigService();

/**
 * Sets up all configuration-related IPC handlers
 * 
 * Registers handlers for configuration management, validation, path operations,
 * and branch-specific settings. All handlers include proper error handling
 * and logging for debugging purposes.
 * 
 * @returns void
 */
export function setupConfigHandlers(): void {
  /**
   * Handler for retrieving the current configuration
   * 
   * Returns the complete configuration object from the ConfigService.
   * This includes all application settings, paths, and branch-specific data.
   * 
   * @returns Promise<any> The current configuration object
   * @throws Error if configuration retrieval fails
   */
  ipcMain.handle('config:get', async () => {
    try {
      return configService.getConfig();
    } catch (error) {
      console.error('Error getting config:', error);
      throw error;
    }
  });
  
  /**
   * Handler for retrieving the configuration directory path
   * 
   * Returns the absolute path to the directory where configuration files
   * are stored. This is typically in the user's AppData directory.
   * 
   * @returns Promise<string> The configuration directory path
   * @throws Error if path retrieval fails
   */
  ipcMain.handle('config:get-config-dir', async () => {
    try {
      return configService.getConfigDir();
    } catch (error) {
      console.error('Error getting config dir:', error);
      throw error;
    }
  });
  
  /**
   * Handler for retrieving the logs directory path
   * 
   * Returns the absolute path to the directory where log files
   * are stored. This is typically a subdirectory of the config directory.
   * 
   * @returns Promise<string> The logs directory path
   * @throws Error if path retrieval fails
   */
  ipcMain.handle('config:get-logs-dir', async () => {
    try {
      return configService.getLogsPath();
    } catch (error) {
      console.error('Error getting logs dir:', error);
      throw error;
    }
  });
  
  /**
   * Handler for updating configuration settings
   * 
   * Updates the configuration with the provided changes and returns
   * the updated configuration object. Changes are persisted immediately.
   * 
   * @param event - The IPC event object
   * @param updates - Partial configuration object with updates to apply
   * @returns Promise<any> The updated configuration object
   * @throws Error if configuration update fails
   */
  ipcMain.handle('config:update', async (event, updates) => {
    try {
      configService.updateConfig(updates);
      return configService.getConfig();
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  });
  
  /**
   * Handler for retrieving the managed environment path
   * 
   * Returns the absolute path to the managed environment directory
   * where all branch installations are stored.
   * 
   * @returns Promise<string> The managed environment path
   * @throws Error if path retrieval fails
   */
  ipcMain.handle('config:get-managed-path', async () => {
    try {
      return configService.getManagedEnvironmentPath();
    } catch (error) {
      console.error('Error getting managed environment path:', error);
      throw error;
    }
  });
  
  /**
   * Handler for setting the managed environment path
   * 
   * Updates the managed environment path in the configuration and returns
   * the new path. This is where all branch installations will be stored.
   * 
   * @param event - The IPC event object
   * @param path - The new managed environment path
   * @returns Promise<string> The updated managed environment path
   * @throws Error if path setting fails
   */
  ipcMain.handle('config:set-managed-path', async (event, path: string) => {
    try {
      configService.setManagedEnvironmentPath(path);
      return configService.getManagedEnvironmentPath();
    } catch (error) {
      console.error('Error setting managed environment path:', error);
      throw error;
    }
  });

  /**
   * Handler for validating the current configuration
   * 
   * Performs comprehensive validation of the configuration including
   * required fields, path existence, and data integrity checks.
   * 
   * @returns Promise<{isValid: boolean, errors: string[], warnings: string[]}> Validation result
   * @throws Error if validation process fails
   */
  ipcMain.handle('config:validate', async () => {
    try {
      return configService.validateConfig();
    } catch (error) {
      console.error('Error validating config:', error);
      throw error;
    }
  });

  /**
   * Handler for checking if configuration file exists
   * 
   * Checks whether a configuration file exists on disk and can be loaded.
   * 
   * @returns Promise<boolean> True if configuration file exists, false otherwise
   * @throws Error if existence check fails
   */
  ipcMain.handle('config:exists', async () => {
    try {
      return configService.isConfigFileExists();
    } catch (error) {
      console.error('Error checking config file existence:', error);
      throw error;
    }
  });

  /**
   * Handler for loading configuration from file
   * 
   * Loads the configuration from the file system, bypassing the in-memory cache.
   * This is useful for checking if the file has been modified externally.
   * 
   * @returns Promise<any> The configuration object loaded from file
   * @throws Error if file loading fails
   */
  ipcMain.handle('config:load-from-file', async () => {
    try {
      return configService.loadConfigFromFile();
    } catch (error) {
      console.error('Error loading config from file:', error);
      throw error;
    }
  });

  /**
   * Handler for saving configuration to file
   * 
   * Saves the provided configuration object to the file system.
   * This creates a backup of the current configuration before saving.
   * 
   * @param event - The IPC event object
   * @param config - The configuration object to save
   * @returns Promise<boolean> True if save was successful, false otherwise
   * @throws Error if file saving fails
   */
  ipcMain.handle('config:save-to-file', async (event, config) => {
    try {
      return configService.saveConfigToFile(config);
    } catch (error) {
      console.error('Error saving config to file:', error);
      throw error;
    }
  });

  ipcMain.handle('config:get-game-install-path', async () => {
    try {
      return configService.getGameInstallPath();
    } catch (error) {
      console.error('Error getting game install path:', error);
      throw error;
    }
  });

  ipcMain.handle('config:set-game-install-path', async (event, path: string) => {
    try {
      configService.setGameInstallPath(path);
      return configService.getGameInstallPath();
    } catch (error) {
      console.error('Error setting game install path:', error);
      throw error;
    }
  });

  ipcMain.handle('config:set-build-id-for-branch', async (event, branchName: string, buildId: string) => {
    try {
      configService.setBuildIdForBranch(branchName, buildId);
    } catch (error) {
      console.error('Error setting build ID for branch:', error);
      throw error;
    }
  });

  ipcMain.handle('config:get-build-id-for-branch', async (event, branchName: string) => {
    try {
      return configService.getBuildIdForBranch(branchName);
    } catch (error) {
      console.error('Error getting build ID for branch:', error);
      throw error;
    }
  });

  ipcMain.handle('config:set-custom-launch-command', async (event, branchName: string, command: string) => {
    try {
      configService.setCustomLaunchCommand(branchName, command);
    } catch (error) {
      console.error('Error setting custom launch command:', error);
      throw error;
    }
  });

  ipcMain.handle('config:get-custom-launch-command', async (event, branchName: string) => {
    try {
      return configService.getCustomLaunchCommand(branchName);
    } catch (error) {
      console.error('Error getting custom launch command:', error);
      throw error;
    }
  });

  // Multi-version branch support handlers

  ipcMain.handle('config:set-branch-version', async (event, branchName: string, buildId: string, versionInfo: any) => {
    try {
      configService.setBranchVersion(branchName, buildId, versionInfo);
    } catch (error) {
      console.error('Error setting branch version:', error);
      throw error;
    }
  });

  ipcMain.handle('config:get-branch-versions', async (event, branchName: string) => {
    try {
      return configService.getBranchVersions(branchName);
    } catch (error) {
      console.error('Error getting branch versions:', error);
      throw error;
    }
  });

  ipcMain.handle('config:set-active-build', async (event, branchName: string, buildId: string) => {
    try {
      configService.setActiveBuild(branchName, buildId);
    } catch (error) {
      console.error('Error setting active build:', error);
      throw error;
    }
  });

  ipcMain.handle('config:get-active-build', async (event, branchName: string) => {
    try {
      return configService.getActiveBuild(branchName);
    } catch (error) {
      console.error('Error getting active build:', error);
      throw error;
    }
  });

  ipcMain.handle('config:get-max-recent-builds', async () => {
    try {
      return configService.getMaxRecentBuilds();
    } catch (error) {
      console.error('Error getting max recent builds:', error);
      throw error;
    }
  });

  ipcMain.handle('config:set-max-recent-builds', async (event, count: number) => {
    try {
      configService.setMaxRecentBuilds(count);
    } catch (error) {
      console.error('Error setting max recent builds:', error);
      throw error;
    }
  });

  // User-added versions handlers
  ipcMain.handle('config:set-user-added-versions', async (event, branchKey: string, versions: any[]) => {
    try {
      configService.setUserAddedVersions(branchKey, versions);
    } catch (error) {
      console.error('Error setting user-added versions:', error);
      throw error;
    }
  });

  ipcMain.handle('config:get-user-added-versions', async (event, branchKey: string) => {
    try {
      return configService.getUserAddedVersions(branchKey);
    } catch (error) {
      console.error('Error getting user-added versions:', error);
      throw error;
    }
  });

  // Manifest ID based version management handlers

  ipcMain.handle('config:set-active-manifest', async (event, branchName: string, manifestId: string) => {
    try {
      configService.setActiveManifest(branchName, manifestId);
    } catch (error) {
      console.error('Error setting active manifest:', error);
      throw error;
    }
  });

  ipcMain.handle('config:get-active-manifest', async (event, branchName: string) => {
    try {
      return configService.getActiveManifest(branchName);
    } catch (error) {
      console.error('Error getting active manifest:', error);
      throw error;
    }
  });

  ipcMain.handle('config:set-branch-manifest-version', async (event, branchName: string, manifestId: string, versionInfo: any) => {
    try {
      configService.setBranchManifestVersion(branchName, manifestId, versionInfo);
    } catch (error) {
      console.error('Error setting branch manifest version:', error);
      throw error;
    }
  });

  ipcMain.handle('config:get-branch-manifest-versions', async (event, branchName: string) => {
    try {
      return configService.getBranchManifestVersions(branchName);
    } catch (error) {
      console.error('Error getting branch manifest versions:', error);
      throw error;
    }
  });
}
