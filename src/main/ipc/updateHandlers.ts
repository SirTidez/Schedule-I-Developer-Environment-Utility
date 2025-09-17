import { ipcMain, BrowserWindow } from 'electron';
import { UpdateService } from '../services/UpdateService';
import { LoggingService } from '../services/LoggingService';

export function registerUpdateHandlers(updateService: UpdateService, loggingService: LoggingService) {
  // Get current version
  ipcMain.handle('update:get-current-version', async () => {
    try {
      const version = updateService.getCurrentVersion();
      loggingService.info(`Current version: ${version}`);
      return version;
    } catch (error) {
      loggingService.error('Failed to get current version:', error as Error);
      throw error;
    }
  });

  // Check for updates
  ipcMain.handle('update:check-for-updates', async () => {
    try {
      loggingService.info('Checking for updates...');
      const updateInfo = await updateService.checkForUpdates();
      loggingService.info(`Update check result: ${updateInfo.hasUpdate ? 'Update available' : 'Up to date'}`);
      return updateInfo;
    } catch (error) {
      loggingService.error('Failed to check for updates:', error as Error);
      throw error;
    }
  });

  // Get release notes for a specific release
  ipcMain.handle('update:get-release-notes', async (event, release) => {
    try {
      const notes = updateService.formatReleaseNotes(release);
      loggingService.info('Formatted release notes');
      return notes;
    } catch (error) {
      loggingService.error('Failed to format release notes:', error as Error);
      throw error;
    }
  });

  // Check for updates using autoUpdater
  ipcMain.handle('update:check-for-updates-auto', async () => {
    try {
      loggingService.info('Checking for updates using autoUpdater...');
      await updateService.checkForUpdatesAutoUpdater();
      return { success: true };
    } catch (error) {
      loggingService.error('Failed to check for updates:', error as Error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Download available update
  ipcMain.handle('update:download', async () => {
    try {
      loggingService.info('Starting update download...');
      await updateService.downloadUpdate();
      return { success: true };
    } catch (error) {
      loggingService.error('Failed to download update:', error as Error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Install downloaded update
  ipcMain.handle('update:install', async () => {
    try {
      loggingService.info('Installing update...');
      await updateService.installUpdate();
      return { success: true };
    } catch (error) {
      loggingService.error('Failed to install update:', error as Error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Get current update status
  ipcMain.handle('update:get-status', async () => {
    try {
      const status = updateService.getCurrentStatus();
      return status;
    } catch (error) {
      loggingService.error('Failed to get update status:', error as Error);
      throw error;
    }
  });

  // Set up event listeners for update status changes
  updateService.on('status-changed', (status: any) => {
    // Send status update to all renderer processes
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('update:status-changed', status);
      }
    });
  });
}
