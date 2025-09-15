import * as path from 'path';
import * as fs from 'fs-extra';
import { DevEnvironmentConfig, BranchVersionInfo, VersionIdentifier } from '../../shared/types';

/**
 * Get the base path for a branch (without version subdirectory)
 * @param managedEnvironmentPath - The managed environment root path
 * @param branchName - The branch name
 * @returns The branch base path
 */
export function getBranchBasePath(managedEnvironmentPath: string, branchName: string): string {
  return path.join(managedEnvironmentPath, 'branches', branchName);
}

/**
 * Get the path for a specific branch version
 * @param managedEnvironmentPath - The managed environment root path
 * @param branchName - The branch name
 * @param versionId - The version identifier (build ID or manifest ID)
 * @param type - The type of version identifier ('build' or 'manifest')
 * @returns The branch version path
 */
export function getBranchVersionPath(managedEnvironmentPath: string, branchName: string, versionId: string, type: 'build' | 'manifest' = 'build'): string {
  const prefix = type === 'manifest' ? 'manifest_' : 'build_';
  return path.join(managedEnvironmentPath, 'branches', branchName, `${prefix}${versionId}`);
}

/**
 * Get the path for a specific branch version using manifest ID
 * @param managedEnvironmentPath - The managed environment root path
 * @param branchName - The branch name
 * @param manifestId - The manifest ID
 * @returns The branch version path
 * @deprecated Use getBranchVersionPath with type='manifest' instead
 */
export function getBranchVersionPathByManifest(managedEnvironmentPath: string, branchName: string, manifestId: string): string {
  return getBranchVersionPath(managedEnvironmentPath, branchName, manifestId, 'manifest');
}

/**
 * Get the path for a manifest version directory
 * @param managedEnvironmentPath - The managed environment root path
 * @param branchName - The branch name
 * @param manifestId - The manifest ID
 * @returns The manifest version path
 * @deprecated Use getBranchVersionPath with type='manifest' instead
 */
export function getManifestVersionPath(managedEnvironmentPath: string, branchName: string, manifestId: string): string {
  return getBranchVersionPath(managedEnvironmentPath, branchName, manifestId, 'manifest');
}

/**
 * Get the path to the currently active version of a branch
 * @param config - The configuration object
 * @param branchName - The branch name
 * @param useManifestId - Whether to use manifest ID based active version
 * @returns The active branch path or null if no active version
 */
export function getActiveBranchPath(config: DevEnvironmentConfig, branchName: string, useManifestId: boolean = false): string | null {
  if (useManifestId && config.activeManifestPerBranch) {
    const activeManifestId = config.activeManifestPerBranch[branchName];
    if (activeManifestId) {
      return getBranchVersionPath(config.managedEnvironmentPath, branchName, activeManifestId, 'manifest');
    }
  }
  
  const activeBuildId = config.activeBuildPerBranch[branchName];
  if (!activeBuildId) {
    return null;
  }
  return getBranchVersionPath(config.managedEnvironmentPath, branchName, activeBuildId, useManifestId ? 'manifest' : 'build');
}

/**
 * List all available versions for a branch by scanning the filesystem
 * @param managedEnvironmentPath - The managed environment root path
 * @param branchName - The branch name
 * @returns Array of version information
 */
export async function listBranchVersions(managedEnvironmentPath: string, branchName: string): Promise<BranchVersionInfo[]> {
  const branchBasePath = getBranchBasePath(managedEnvironmentPath, branchName);
  
  try {
    const pathExists = await fs.pathExists(branchBasePath);
    
    if (!pathExists) {
      return [];
    }
    
    const entries = await fs.readdir(branchBasePath, { withFileTypes: true });
    const versions: BranchVersionInfo[] = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const versionPath = path.join(branchBasePath, entry.name);
        const stats = await fs.stat(versionPath);
        
        let buildId: string | undefined;
        let manifestId: string | undefined;
        
        if (entry.name.startsWith('build_')) {
          buildId = entry.name.replace('build_', '');
          manifestId = undefined; // Build directories don't have manifest IDs
        } else if (entry.name.startsWith('manifest_')) {
          manifestId = entry.name.replace('manifest_', '');
          buildId = undefined; // Manifest directories don't have build IDs in the traditional sense
        } else {
          // Fallback for legacy or unknown naming conventions
          buildId = entry.name;
          manifestId = undefined;
        }
        
        versions.push({
          buildId,
          manifestId,
          downloadDate: stats.birthtime.toISOString(),
          sizeBytes: await calculateDirectorySize(versionPath),
          isActive: false, // Will be set by caller based on config
          path: versionPath
        });
      }
    }
    
    return versions.sort((a, b) => b.downloadDate.localeCompare(a.downloadDate));
  } catch (error) {
    // Directory doesn't exist or can't be read
    return [];
  }
}

/**
 * Detect if a branch has the legacy flat structure (no build-id subdirectories)
 * @param branchBasePath - The branch base path
 * @returns True if legacy structure detected
 */
export async function detectLegacyBranchStructure(branchBasePath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(branchBasePath, { withFileTypes: true });
    
    // Check if there are any files directly in the branch directory
    // (indicating legacy structure) vs only subdirectories (new structure)
    const hasDirectFiles = entries.some(entry => entry.isFile());
    const hasSubdirectories = entries.some(entry => entry.isDirectory());
    
    // Legacy if there are files directly in the branch directory and no subdirectories
    return hasDirectFiles && !hasSubdirectories;
  } catch (error) {
    return false;
  }
}

/**
 * Detect the type of version identifier used in a directory name
 * @param directoryName - The directory name to analyze
 * @returns 'build' if build ID format, 'manifest' if manifest ID format, 'unknown' otherwise
 */
export function detectVersionIdentifierType(directoryName: string): 'build' | 'manifest' | 'unknown' {
  if (directoryName.startsWith('build_')) {
    return 'build';
  } else if (directoryName.startsWith('manifest_')) {
    return 'manifest';
  }
  return 'unknown';
}

/**
 * Normalize a version identifier to a consistent format
 * @param versionId - The version identifier to normalize
 * @param type - The type of identifier ('build' or 'manifest')
 * @returns Normalized version identifier
 */
export function normalizeVersionIdentifier(versionId: string, type: 'build' | 'manifest'): string {
  const prefix = type === 'manifest' ? 'manifest_' : 'build_';
  
  // Remove existing prefix if present
  if (versionId.startsWith(prefix)) {
    return versionId;
  }
  
  // Remove other prefixes
  const cleanId = versionId.replace(/^(build_|manifest_)/, '');
  return `${prefix}${cleanId}`;
}

/**
 * Migrate a legacy branch structure to the new version-specific structure
 * @param branchPath - The legacy branch path
 * @param versionId - The version identifier to use for the migrated version
 * @param useManifestId - Whether to use manifest ID naming convention
 * @returns Success status and error message if any
 */
export async function migrateLegacyBranch(branchPath: string, versionId: string, type: 'build' | 'manifest' = 'build'): Promise<{success: boolean, error?: string}> {
  try {
    const prefix = type === 'manifest' ? 'manifest_' : 'build_';
    const newVersionPath = path.join(branchPath, `${prefix}${versionId}`);
    
    // Create the new version directory
    await fs.ensureDir(newVersionPath);
    
    // Move all files and subdirectories from the old structure to the new one
    const entries = await fs.readdir(branchPath, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip the new version directory we just created
      if (entry.name === `${prefix}${versionId}`) {
        continue;
      }
      
      const oldPath = path.join(branchPath, entry.name);
      const newPath = path.join(newVersionPath, entry.name);
      
      if (entry.isDirectory()) {
        await fs.rename(oldPath, newPath);
      } else {
        await fs.copyFile(oldPath, newPath);
        await fs.unlink(oldPath);
      }
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during migration' 
    };
  }
}

/**
 * Ensure a branch version directory exists
 * @param branchVersionPath - The branch version path
 */
export async function ensureBranchVersionDirectory(branchVersionPath: string): Promise<void> {
  await fs.ensureDir(branchVersionPath);
}

/**
 * Calculate the total size of a directory
 * @param dirPath - The directory path
 * @returns Size in bytes
 */
async function calculateDirectorySize(dirPath: string): Promise<number> {
  try {
    let totalSize = 0;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        totalSize += await calculateDirectorySize(entryPath);
      } else {
        const stats = await fs.stat(entryPath);
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    return 0;
  }
}

/**
 * Normalize a path for cross-platform compatibility
 * @param pathString - The path to normalize
 * @returns Normalized path
 */
export function normalizePath(pathString: string): string {
  return path.normalize(pathString);
}

/**
 * Validate that a path is within the managed environment
 * @param managedEnvironmentPath - The managed environment root path
 * @param targetPath - The path to validate
 * @returns True if the path is valid and within bounds
 */
export function validatePath(managedEnvironmentPath: string, targetPath: string): boolean {
  try {
    const resolvedManaged = path.resolve(managedEnvironmentPath);
    const resolvedTarget = path.resolve(targetPath);
    
    // Check if resolved target starts with resolved managed path + separator
    // or equals exactly the managed path
    return resolvedTarget === resolvedManaged || 
           resolvedTarget.startsWith(resolvedManaged + path.sep);
  } catch (error) {
    // If path resolution fails, the path is invalid
    return false;
  }
}
