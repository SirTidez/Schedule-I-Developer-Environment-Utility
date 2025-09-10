import { useState, useCallback } from 'react';

export interface FileOperationProgress {
  progress: number;
  currentFile?: string;
  totalFiles?: number;
  completedFiles?: number;
}

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
