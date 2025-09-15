/**
 * Migration IPC Handlers for Schedule I Developer Environment Utility
 * 
 * Provides IPC handlers for version migration operations, allowing the renderer
 * process to interact with the VersionMigrationService for build ID to manifest
 * ID migration functionality.
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import { ipcMain } from 'electron';
import { VersionMigrationService, LegacyInstallation, MigrationProgress, MigrationResult } from '../services/VersionMigrationService';

/**
 * Sets up all migration-related IPC handlers
 * 
 * Registers handlers for detecting legacy installations, migrating to manifest IDs,
 * validating migrations, and rolling back failed migrations.
 */
export function setupMigrationHandlers(): void {
  console.log('Setting up migration IPC handlers...');

  // Handler for detecting legacy installations
  ipcMain.handle('migration:detect-legacy-installations', async (event, managedEnvironmentPath: string) => {
    try {
      const migrationService = new VersionMigrationService();
      const legacyInstallations = await migrationService.detectLegacyInstallations(managedEnvironmentPath);
      return { success: true, installations: legacyInstallations };
    } catch (error) {
      console.error('Error detecting legacy installations:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        installations: []
      };
    }
  });

  // Handler for migrating a single installation
  ipcMain.handle('migration:migrate-installation', async (event, installation: LegacyInstallation) => {
    try {
      const migrationService = new VersionMigrationService();
      const result = await migrationService.migrateInstallationToManifestId(installation);
      return result;
    } catch (error) {
      console.error('Error migrating installation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during migration'
      };
    }
  });

  // Handler for migrating all legacy installations
  ipcMain.handle('migration:migrate-to-manifest-ids', async (event, managedEnvironmentPath: string) => {
    try {
      const migrationService = new VersionMigrationService();
      
      // Set up progress callback to stream progress to UI
      const onProgress = (progress: any) => {
        event.sender.send('migration:progress', progress);
      };
      
      const result = await migrationService.migrateToManifestIds(managedEnvironmentPath, onProgress);
      return result;
    } catch (error) {
      console.error('Error migrating to manifest IDs:', error);
      return {
        success: false,
        migratedInstallations: [],
        failedInstallations: [],
        errors: [error instanceof Error ? error.message : 'Unknown error during migration']
      };
    }
  });

  // Handler for validating migration
  ipcMain.handle('migration:validate-migration', async (event, managedEnvironmentPath: string) => {
    try {
      const migrationService = new VersionMigrationService();
      const result = await migrationService.validateMigration(managedEnvironmentPath);
      return result;
    } catch (error) {
      console.error('Error validating migration:', error);
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during validation']
      };
    }
  });

  // Handler for rolling back migration
  ipcMain.handle('migration:rollback-migration', async (event, managedEnvironmentPath: string) => {
    try {
      const migrationService = new VersionMigrationService();
      const result = await migrationService.rollbackMigration(managedEnvironmentPath);
      return result;
    } catch (error) {
      console.error('Error rolling back migration:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during rollback']
      };
    }
  });

  console.log('Migration IPC handlers registered successfully');
}

/**
 * Removes all migration-related IPC handlers
 * 
 * Useful for cleanup or when handlers need to be re-registered.
 */
export function removeMigrationHandlers(): void {
  console.log('Removing migration IPC handlers...');
  
  ipcMain.removeAllListeners('migration:detect-legacy-installations');
  ipcMain.removeAllListeners('migration:migrate-installation');
  ipcMain.removeAllListeners('migration:migrate-to-manifest-ids');
  ipcMain.removeAllListeners('migration:validate-migration');
  ipcMain.removeAllListeners('migration:rollback-migration');
  
  console.log('Migration IPC handlers removed successfully');
}
