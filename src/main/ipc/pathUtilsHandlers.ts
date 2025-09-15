/**
 * Path Utilities IPC Handlers for Schedule I Developer Environment Utility
 *
 * Provides IPC handlers for path utility functions used throughout the application.
 * These handlers expose the pathUtils functions to the renderer process in a secure way.
 *
 * Key features:
 * - Branch path construction and management
 * - Version-specific path handling
 * - Legacy structure detection and migration
 * - Path validation and normalization
 *
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import { ipcMain } from 'electron';
import {
  getBranchBasePath,
  getBranchVersionPath,
  getBranchVersionPathByManifest,
  getActiveBranchPath,
  listBranchVersions,
  detectLegacyBranchStructure,
  migrateLegacyBranch,
  ensureBranchVersionDirectory,
  normalizePath,
  validatePath
} from '../utils/pathUtils';

/**
 * Sets up all path utilities IPC handlers
 *
 * Registers all path utility-related IPC handlers with the main process.
 * This function should be called during application initialization.
 */
export function setupPathUtilsHandlers(): void {
  console.log('Setting up Path Utils IPC handlers');

  // Get branch base path
  ipcMain.handle('path-utils:get-branch-base-path', async (event, managedEnvironmentPath: string, branchName: string) => {
    try {
      return getBranchBasePath(managedEnvironmentPath, branchName);
    } catch (error) {
      console.error('Error getting branch base path:', error);
      throw error;
    }
  });

  // Get branch version path
  ipcMain.handle('path-utils:get-branch-version-path', async (event, managedEnvironmentPath: string, branchName: string, versionId: string, type: 'build' | 'manifest') => {
    try {
      return getBranchVersionPath(managedEnvironmentPath, branchName, versionId, type);
    } catch (error) {
      console.error('Error getting branch version path:', error);
      throw error;
    }
  });

  // Get branch version path by manifest
  ipcMain.handle('path-utils:get-branch-version-path-by-manifest', async (event, managedEnvironmentPath: string, branchName: string, manifestId: string) => {
    try {
      return getBranchVersionPathByManifest(managedEnvironmentPath, branchName, manifestId);
    } catch (error) {
      console.error('Error getting branch version path by manifest:', error);
      throw error;
    }
  });

  // Get active branch path
  ipcMain.handle('path-utils:get-active-branch-path', async (event, config: any, branchName: string, useManifestId: boolean) => {
    try {
      return getActiveBranchPath(config, branchName, useManifestId);
    } catch (error) {
      console.error('Error getting active branch path:', error);
      throw error;
    }
  });

  // List branch versions
  ipcMain.handle('path-utils:list-branch-versions', async (event, managedEnvironmentPath: string, branchName: string) => {
    try {
      return await listBranchVersions(managedEnvironmentPath, branchName);
    } catch (error) {
      console.error('Error listing branch versions:', error);
      throw error;
    }
  });

  // Detect legacy branch structure
  ipcMain.handle('path-utils:detect-legacy-branch-structure', async (event, branchBasePath: string) => {
    try {
      return await detectLegacyBranchStructure(branchBasePath);
    } catch (error) {
      console.error('Error detecting legacy branch structure:', error);
      throw error;
    }
  });

  // Migrate legacy branch
  ipcMain.handle('path-utils:migrate-legacy-branch', async (event, branchPath: string, versionId: string, type: 'build' | 'manifest') => {
    try {
      return await migrateLegacyBranch(branchPath, versionId, type);
    } catch (error) {
      console.error('Error migrating legacy branch:', error);
      throw error;
    }
  });

  // Ensure branch version directory
  ipcMain.handle('path-utils:ensure-branch-version-directory', async (event, branchVersionPath: string) => {
    try {
      await ensureBranchVersionDirectory(branchVersionPath);
    } catch (error) {
      console.error('Error ensuring branch version directory:', error);
      throw error;
    }
  });

  // Normalize path
  ipcMain.handle('path-utils:normalize-path', async (event, pathString: string) => {
    try {
      return normalizePath(pathString);
    } catch (error) {
      console.error('Error normalizing path:', error);
      throw error;
    }
  });

  // Validate path
  ipcMain.handle('path-utils:validate-path', async (event, managedEnvironmentPath: string, targetPath: string) => {
    try {
      return validatePath(managedEnvironmentPath, targetPath);
    } catch (error) {
      console.error('Error validating path:', error);
      throw error;
    }
  });

  console.log('Path Utils IPC handlers registered successfully');
}

