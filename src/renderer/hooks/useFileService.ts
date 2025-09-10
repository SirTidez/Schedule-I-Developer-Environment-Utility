/**
 * File Service Hook for Schedule I Developer Environment Utility
 * 
 * Custom React hook that provides file operation functionality to components.
 * Handles file copying, directory operations, and progress tracking with proper
 * state management and error handling.
 * 
 * Key features:
 * - Game file copying with progress tracking
 * - App manifest copying
 * - Directory operations (create, delete, copy)
 * - File existence checking
 * - Progress tracking for long operations
 * - Error handling with user-friendly messages
 * - Loading states for async operations
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.0
 */

import { useState, useCallback } from 'react';

/**
 * Interface representing file operation progress
 * 
 * Contains progress information for file operations including
 * completion percentage, current file being processed, and
 * total file counts.
 */
export interface FileOperationProgress {
  /** Progress percentage (0-100) */
  progress: number;
  /** Current file being processed */
  currentFile?: string;
  /** Total number of files to process */
  totalFiles?: number;
  /** Number of files completed */
  completedFiles?: number;
}

/**
 * Custom hook for file service operations
 * 
 * Provides a comprehensive interface for file operations including
 * copying, directory management, and progress tracking. Includes
 * proper state management, error handling, and loading states.
 * 
 * @returns Object containing file service methods and state
 */
export const useFileService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<FileOperationProgress | null>(null);

  const copyGameFiles = useCallback(async (
    sourcePath: string, 
    destinationPath: string,
    onProgress?: (progress: FileOperationProgress) => void
  ) => {
    setLoading(true);
    setError(null);
    setProgress({ progress: 0 });
    
    try {
      // For now, we'll use the basic copy operation
      // In the future, we can implement progress tracking
      const result = await window.electronAPI.file.copyGame(sourcePath, destinationPath);
      
      if (onProgress) {
        onProgress({ progress: 100 });
      }
      
      setProgress({ progress: 100 });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to copy game files';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const copyAppManifest = useCallback(async (
    appId: string, 
    steamPath: string, 
    branchPath: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.file.copyManifest(appId, steamPath, branchPath);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to copy app manifest';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkFileExists = useCallback(async (filePath: string) => {
    try {
      return await window.electronAPI.file.exists(filePath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check file existence';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const createDirectory = useCallback(async (dirPath: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.file.createDirectory(dirPath);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create directory';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDirectory = useCallback(async (dirPath: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.file.deleteDirectory(dirPath);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete directory';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const copyDirectory = useCallback(async (sourcePath: string, destinationPath: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.file.copyDirectory(sourcePath, destinationPath);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to copy directory';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    progress,
    copyGameFiles,
    copyAppManifest,
    checkFileExists,
    createDirectory,
    deleteDirectory,
    copyDirectory,
  };
};
