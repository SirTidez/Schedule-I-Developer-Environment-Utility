import { ipcMain } from 'electron';
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
}
