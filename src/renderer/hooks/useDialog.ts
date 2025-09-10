import { useCallback } from 'react';

export interface DialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export const useDialog = () => {
  const openDirectory = useCallback(async (options?: DialogOptions) => {
    try {
      return await window.electronAPI.dialog.openDirectory(options);
    } catch (error) {
      console.error('Failed to open directory dialog:', error);
      return null;
    }
  }, []);

  const openFile = useCallback(async (options?: DialogOptions) => {
    try {
      return await window.electronAPI.dialog.openFile(options);
    } catch (error) {
      console.error('Failed to open file dialog:', error);
      return null;
    }
  }, []);

  const saveFile = useCallback(async (options?: DialogOptions) => {
    try {
      return await window.electronAPI.dialog.saveFile(options);
    } catch (error) {
      console.error('Failed to open save dialog:', error);
      return null;
    }
  }, []);

  return {
    openDirectory,
    openFile,
    saveFile
  };
};
