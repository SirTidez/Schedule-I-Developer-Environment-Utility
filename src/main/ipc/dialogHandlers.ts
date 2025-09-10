import { ipcMain, dialog } from 'electron';
import { join } from 'path';

export const setupDialogHandlers = () => {
  // Show open directory dialog
  ipcMain.handle('dialog:openDirectory', async (event, options = {}) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: options.title || 'Select Directory',
      defaultPath: options.defaultPath || undefined,
      ...options
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // Show open file dialog
  ipcMain.handle('dialog:openFile', async (event, options = {}) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: options.title || 'Select File',
      defaultPath: options.defaultPath || undefined,
      filters: options.filters || undefined,
      ...options
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // Show save file dialog
  ipcMain.handle('dialog:saveFile', async (event, options = {}) => {
    const result = await dialog.showSaveDialog({
      title: options.title || 'Save File',
      defaultPath: options.defaultPath || undefined,
      filters: options.filters || undefined,
      ...options
    });

    if (!result.canceled && result.filePath) {
      return result.filePath;
    }
    return null;
  });
};
