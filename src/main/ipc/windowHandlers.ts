import { ipcMain, BrowserWindow } from 'electron';
import { LoggingService } from '../services/LoggingService';

export function registerWindowHandlers(loggingService: LoggingService) {
  // Minimize window
  ipcMain.handle('window:minimize', async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.minimize();
        loggingService.info('Window minimized');
      }
    } catch (error) {
      loggingService.error('Failed to minimize window:', error as Error);
    }
  });

  // Maximize/Restore window
  ipcMain.handle('window:toggle-maximize', async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        if (window.isMaximized()) {
          window.unmaximize();
          loggingService.info('Window restored');
        } else {
          window.maximize();
          loggingService.info('Window maximized');
        }
      }
    } catch (error) {
      loggingService.error('Failed to toggle maximize window:', error as Error);
    }
  });

  // Close window
  ipcMain.handle('window:close', async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.close();
        loggingService.info('Window closed');
      }
    } catch (error) {
      loggingService.error('Failed to close window:', error as Error);
    }
  });

  // Check if window is maximized
  ipcMain.handle('window:is-maximized', async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      return window ? window.isMaximized() : false;
    } catch (error) {
      loggingService.error('Failed to check if window is maximized:', error as Error);
      return false;
    }
  });
}
