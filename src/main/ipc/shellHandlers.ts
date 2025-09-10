import { ipcMain, shell } from 'electron';
import { LoggingService } from '../services/LoggingService';

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
}
