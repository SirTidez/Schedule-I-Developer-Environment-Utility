/**
 * Dialog Hook for Schedule I Developer Environment Utility
 * 
 * Custom React hook that provides dialog functionality for file and directory
 * selection. Wraps the Electron dialog API with proper error handling and
 * provides a clean interface for components to use native dialogs.
 * 
 * Key features:
 * - Directory selection dialog
 * - File selection dialog
 * - File save dialog
 * - Error handling with fallback to null
 * - Configurable dialog options
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.2.0
 */

import { useCallback } from 'react';

/**
 * Options interface for dialog operations
 * 
 * Contains configuration options for native file and directory dialogs
 * including title, default path, and file filters.
 * 
 * @interface DialogOptions
 */
export interface DialogOptions {
  /** Optional dialog title */
  title?: string;
  /** Optional default path to open dialog at */
  defaultPath?: string;
  /** Optional file filters for file dialogs */
  filters?: Array<{
    /** Display name for the filter */
    name: string;
    /** File extensions to filter by */
    extensions: string[];
  }>;
}

/**
 * Custom hook for dialog operations
 * 
 * Provides methods for opening native file and directory dialogs with
 * proper error handling and consistent return values.
 * 
 * @returns Object containing dialog methods
 */
export const useDialog = () => {
  /**
   * Opens a directory selection dialog
   * 
   * @param options - Optional dialog configuration
   * @returns Promise<string | null> Selected directory path or null if cancelled/error
   */
  const openDirectory = useCallback(async (options?: DialogOptions) => {
    try {
      return await window.electronAPI.dialog.openDirectory(options);
    } catch (error) {
      console.error('Failed to open directory dialog:', error);
      return null;
    }
  }, []);

  /**
   * Opens a file selection dialog
   * 
   * @param options - Optional dialog configuration
   * @returns Promise<string | null> Selected file path or null if cancelled/error
   */
  const openFile = useCallback(async (options?: DialogOptions) => {
    try {
      return await window.electronAPI.dialog.openFile(options);
    } catch (error) {
      console.error('Failed to open file dialog:', error);
      return null;
    }
  }, []);

  /**
   * Opens a file save dialog
   * 
   * @param options - Optional dialog configuration
   * @returns Promise<string | null> Selected save path or null if cancelled/error
   */
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
