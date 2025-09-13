import { ipcMain } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';

export function setupFileHandlers() {
  ipcMain.handle('file:copy-game', async (event, sourcePath: string, destinationPath: string) => {
    try {
      console.log(`Starting file copy from: ${sourcePath} to: ${destinationPath}`);
      
      // Validate source path exists
      if (!await fs.pathExists(sourcePath)) {
        throw new Error(`Source path does not exist: ${sourcePath}`);
      }
      
      // Ensure destination directory exists
      await fs.ensureDir(path.dirname(destinationPath));
      
      // Get all files to copy first for progress tracking
      const allFiles = await getAllFiles(sourcePath);
      const filteredFiles = allFiles.filter(file => {
        // Only exclude Mods and Plugins folders at the root level of the game
        const relativePath = path.relative(sourcePath, file);
        const pathParts = relativePath.split(path.sep);
        
        // Check if the first directory in the path is Mods or Plugins
        const shouldExclude = pathParts.length > 0 && 
          (pathParts[0] === 'Mods' || pathParts[0] === 'Plugins');
        
        if (shouldExclude) {
          console.log(`Excluding root-level folder: ${relativePath}`);
        }
        return !shouldExclude;
      });
      
      console.log(`Found ${filteredFiles.length} files to copy`);
      
      // Copy files one by one with progress updates
      for (let i = 0; i < filteredFiles.length; i++) {
        const file = filteredFiles[i];
        const relativePath = path.relative(sourcePath, file);
        const destFile = path.join(destinationPath, relativePath);
        
        // Ensure destination directory exists
        await fs.ensureDir(path.dirname(destFile));
        
        // Send progress update
        event.sender.send('file-copy-progress', {
          currentFile: relativePath,
          completedFiles: i,
          totalFiles: filteredFiles.length,
          progress: (i / filteredFiles.length) * 100
        });
        
        console.log(`Copying: ${relativePath}`);
        await fs.copy(file, destFile, { overwrite: true });
      }
      
      // Send final progress update
      event.sender.send('file-copy-progress', {
        currentFile: 'Complete',
        completedFiles: filteredFiles.length,
        totalFiles: filteredFiles.length,
        progress: 100
      });
      
      console.log(`Successfully copied ${filteredFiles.length} files from ${sourcePath} to ${destinationPath}`);
      return { success: true, filesCopied: filteredFiles.length };
    } catch (error) {
      const errorMessage = `Failed to copy game files from ${sourcePath} to ${destinationPath}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  });
  
  // Helper function to get all files recursively
  async function getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    async function traverse(currentDir: string) {
      const items = await fs.readdir(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await traverse(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    }
    
    await traverse(dir);
    return files;
  }
  
  ipcMain.handle('file:copy-manifest', async (event, appId: string, steamPath: string, branchPath: string) => {
    try {
      // Support either Steam root (expects steamapps under it) or a steamapps path directly
      let sourcePath = path.join(steamPath, 'steamapps', `appmanifest_${appId}.acf`);
      if (!await fs.pathExists(sourcePath)) {
        // Try interpreting steamPath as the steamapps directory
        const alt = path.join(steamPath, `appmanifest_${appId}.acf`);
        if (await fs.pathExists(alt)) {
          sourcePath = alt;
        }
      }
      const destPath = path.join(branchPath, `appmanifest_${appId}.acf`);
      
      console.log(`Copying manifest from: ${sourcePath} to: ${destPath}`);
      
      // Validate source manifest exists
      if (!await fs.pathExists(sourcePath)) {
        throw new Error(`App manifest not found: ${sourcePath}`);
      }
      
      // Ensure destination directory exists
      await fs.ensureDir(branchPath);
      
      await fs.copy(sourcePath, destPath, { overwrite: true });
      
      console.log(`Successfully copied manifest to: ${destPath}`);
      return { success: true };
    } catch (error) {
      const errorMessage = `Failed to copy app manifest for app ${appId}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  });
  
  ipcMain.handle('file:exists', async (event, filePath: string) => {
    try {
      return await fs.pathExists(filePath);
    } catch (error) {
      console.error('Error checking file existence:', error);
      throw error;
    }
  });
  
  ipcMain.handle('file:create-directory', async (event, dirPath: string) => {
    try {
      await fs.ensureDir(dirPath);
      return { success: true };
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  });

  ipcMain.handle('file:delete-directory', async (event, directoryPath: string) => {
    try {
      console.log(`Deleting directory: ${directoryPath}`);
      
      // Validate directory path exists
      if (!await fs.pathExists(directoryPath)) {
        throw new Error(`Directory does not exist: ${directoryPath}`);
      }
      
      // Delete the directory and all its contents
      await fs.remove(directoryPath);
      
      console.log(`Successfully deleted directory: ${directoryPath}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete directory ${directoryPath}:`, error);
      throw error;
    }
  });

  ipcMain.handle('file:copy-directory', async (event, sourcePath: string, destinationPath: string) => {
    try {
      console.log(`Copying directory from: ${sourcePath} to: ${destinationPath}`);
      
      // Validate source path exists
      if (!await fs.pathExists(sourcePath)) {
        throw new Error(`Source directory does not exist: ${sourcePath}`);
      }
      
      // Ensure destination directory exists
      await fs.ensureDir(path.dirname(destinationPath));
      
      // Copy the directory
      await fs.copy(sourcePath, destinationPath);
      
      console.log(`Successfully copied directory from ${sourcePath} to ${destinationPath}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to copy directory from ${sourcePath} to ${destinationPath}:`, error);
      throw error;
    }
  });

  ipcMain.handle('file:write-text', async (event, filePath: string, content: string) => {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, { encoding: 'utf-8' });
      return { success: true };
    } catch (error) {
      console.error(`Failed to write text to ${filePath}:`, error);
      throw error;
    }
  });

  ipcMain.handle('file:list-files', async (event, dirPath: string) => {
    try {
      const entries = await fs.readdir(dirPath);
      const results = [] as Array<{ name: string; path: string; mtimeMs: number; isFile: boolean }>;
      for (const name of entries) {
        const p = path.join(dirPath, name);
        const stat = await fs.stat(p);
        results.push({ name, path: p, mtimeMs: stat.mtimeMs, isFile: stat.isFile() });
      }
      return results;
    } catch (error) {
      console.error(`Failed to list files in ${dirPath}:`, error);
      throw error;
    }
  });

  ipcMain.handle('file:delete-file', async (event, filePath: string) => {
    try {
      await fs.remove(filePath);
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
      throw error;
    }
  });
}
