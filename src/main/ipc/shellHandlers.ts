import { ipcMain, shell } from 'electron';
import { LoggingService } from '../services/LoggingService';
import * as path from 'path';

export function registerShellHandlers(loggingService: LoggingService) {
  // Open external URL in user's default browser
  ipcMain.handle('shell:open-external', async (event, url: string) => {
    try {
      loggingService.info(`Opening external URL: ${url}`);
      await shell.openExternal(url);
    } catch (error) {
      loggingService.error('Failed to open external URL:', error as Error);
      throw error;
    }
  });

  // Launch executable file
  ipcMain.handle('shell:launch-executable', async (event, executablePath: string) => {
    try {
      loggingService.info(`Launching executable: ${executablePath}`);
      await shell.openPath(executablePath);
    } catch (error) {
      loggingService.error('Failed to launch executable:', error as Error);
      throw error;
    }
  });

  // Open folder in file explorer
  ipcMain.handle('shell:open-folder', async (event, folderPath: string) => {
    try {
      loggingService.info(`Opening folder: ${folderPath}`);
      await shell.openPath(folderPath);
    } catch (error) {
      loggingService.error('Failed to open folder:', error as Error);
      throw error;
    }
  });

  // Show item in file explorer (selects the file/folder)
  ipcMain.handle('shell:show-item', async (event, itemPath: string) => {
    try {
      loggingService.info(`Showing item in explorer: ${itemPath}`);
      await shell.showItemInFolder(itemPath);
    } catch (error) {
      loggingService.error('Failed to show item in folder:', error as Error);
      throw error;
    }
  });
}
