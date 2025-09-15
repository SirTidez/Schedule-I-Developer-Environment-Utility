/**
 * Version Migration Service for Schedule I Developer Environment Utility
 * 
 * Handles migration from build ID to manifest ID based versioning system.
 * This service provides functionality to detect legacy installations, migrate
 * directory structures, and update configuration to use manifest IDs.
 * 
 * Key features:
 * - Detection of legacy build ID based installations
 * - Migration of directory structures from build_* to manifest_* naming
 * - Configuration migration to manifest ID based tracking
 * - Rollback capabilities for failed migrations
 * - Progress reporting and validation
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { SteamService } from './SteamService';
import { ConfigService } from './ConfigService';
import { 
  getBranchBasePath, 
  getBranchVersionPath, 
  detectVersionIdentifierType,
  normalizeVersionIdentifier 
} from '../utils/pathUtils';
import { DevEnvironmentConfig, BranchVersionInfo } from '../../shared/types';

export interface LegacyInstallation {
  branchName: string;
  buildId: string;
  path: string;
  manifestId?: string;
}

export interface MigrationProgress {
  currentStep: string;
  completedSteps: number;
  totalSteps: number;
  currentInstallation?: LegacyInstallation;
  error?: string;
}

export interface MigrationResult {
  success: boolean;
  migratedInstallations: LegacyInstallation[];
  failedInstallations: Array<LegacyInstallation & { error: string }>;
  errors: string[];
}

/**
 * Version Migration Service class for managing build ID to manifest ID migration
 * 
 * Provides comprehensive migration functionality including detection, migration,
 * validation, and rollback capabilities for transitioning from build ID to
 * manifest ID based versioning.
 */
export class VersionMigrationService {
  private steamService: SteamService;
  private configService: ConfigService;

  constructor() {
    this.steamService = new SteamService();
    this.configService = new ConfigService();
  }

  /**
   * Detects legacy installations that use build ID based directory naming
   * 
   * Scans the managed environment for directories using the old build_* naming
   * convention and attempts to extract manifest IDs from Steam installations.
   * 
   * @param managedEnvironmentPath The managed environment root path
   * @returns Promise<LegacyInstallation[]> Array of detected legacy installations
   */
  async detectLegacyInstallations(managedEnvironmentPath: string): Promise<LegacyInstallation[]> {
    // @temp: Legacy migration temporarily disabled to prevent incorrect detection of new downloads.
    // The logic was flagging freshly downloaded manifest-based directories as legacy.
    // This needs to be revisited to correctly differentiate between actual legacy 
    // build_* folders and modern manifest_* folders.
    return [];

    /*
    try {
      console.log('Detecting legacy installations in:', managedEnvironmentPath);
      
      // Ensure Steam libraries are detected before proceeding
      if ((await this.steamService.getSteamLibraries()).length === 0) {
        await this.steamService.detectSteamLibraries();
      }
      
      // Optionally attempt to parse app manifest from configured Steam library path
      // Note: config.steamLibraryPath should be the steamapps folder path, not the library root
      const config = this.configService.getConfig();
      if (config.steamLibraryPath && config.steamLibraryPath.trim() !== '') {
        try {
          console.log(`Attempting to parse app manifest from configured path: ${config.steamLibraryPath}`);
          await this.steamService.parseAppManifest('3164500', config.steamLibraryPath);
          console.log('Successfully parsed app manifest from configured path');
        } catch (error) {
          console.warn('Failed to parse app manifest from configured Steam library path:', error);
        }
      }
      
      const legacyInstallations: LegacyInstallation[] = [];
      const branchesPath = path.join(managedEnvironmentPath, 'branches');
      
      if (!await fs.pathExists(branchesPath)) {
        console.log('No branches directory found');
        return legacyInstallations;
      }

      const branchDirs = await fs.readdir(branchesPath, { withFileTypes: true });
      
      for (const branchDir of branchDirs) {
        if (!branchDir.isDirectory()) continue;
        
        const branchName = branchDir.name;
        const branchPath = path.join(branchesPath, branchName);
        
        console.log(`Checking branch: ${branchName}`);
        
        // Look for build_* directories
        const versionDirs = await fs.readdir(branchPath, { withFileTypes: true });
        
        for (const versionDir of versionDirs) {
          if (!versionDir.isDirectory()) continue;
          
          const versionType = detectVersionIdentifierType(versionDir.name);
          
          if (versionType === 'build') {
            const buildId = versionDir.name.replace('build_', '');
            const versionPath = path.join(branchPath, versionDir.name);
            
            console.log(`Found legacy installation: ${branchName}/${versionDir.name}`);
            
            // Try to get manifest ID from Steam installation
            let manifestId: string | undefined;
            try {
              const steamLibraries = await this.steamService.getSteamLibraries();
              
              for (const libraryPath of steamLibraries) {
                try {
                  // libraryPath from getSteamLibraries() is already the steamapps folder path
                  const manifest = await this.steamService.parseAppManifest('3164500', libraryPath);
                  const primaryManifestId = this.steamService.getPrimaryManifestId(manifest);
                  
                  if (primaryManifestId) {
                    manifestId = primaryManifestId;
                    console.log(`Found manifest ID ${manifestId} for build ${buildId}`);
                    break;
                  }
                } catch (error) {
                  // Continue to next library
                  continue;
                }
              }
            } catch (error) {
              console.warn(`Could not extract manifest ID for build ${buildId}:`, error);
            }
            
            legacyInstallations.push({
              branchName,
              buildId,
              path: versionPath,
              manifestId
            });
          }
        }
      }
      
      console.log(`Found ${legacyInstallations.length} legacy installations`);
      return legacyInstallations;
      
    } catch (error) {
      console.error('Error detecting legacy installations:', error);
      return [];
    }
    */
  }

  /**
   * Migrates a single installation from build ID to manifest ID based naming
   * 
   * @param installation The legacy installation to migrate
   * @param onProgress Optional progress callback
   * @returns Promise<{success: boolean, error?: string}> Migration result
   */
  async migrateInstallationToManifestId(
    installation: LegacyInstallation, 
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<{success: boolean, error?: string}> {
    try {
      console.log(`Migrating installation: ${installation.branchName}/${installation.buildId}`);
      
      if (onProgress) {
        onProgress({
          currentStep: `Migrating ${installation.branchName}/${installation.buildId}`,
          completedSteps: 0,
          totalSteps: 3,
          currentInstallation: installation
        });
      }

      if (!installation.manifestId) {
        return {
          success: false,
          error: `No manifest ID available for build ${installation.buildId}`
        };
      }

      // Create new manifest-based directory path
      const managedEnvironmentPath = path.dirname(path.dirname(installation.path));
      const newPath = getBranchVersionPath(
        managedEnvironmentPath, 
        installation.branchName, 
        installation.manifestId,
        'manifest'
      );

      if (onProgress) {
        onProgress({
          currentStep: `Creating manifest directory: manifest_${installation.manifestId}`,
          completedSteps: 1,
          totalSteps: 3,
          currentInstallation: installation
        });
      }

      // Ensure the new directory exists
      await fs.ensureDir(newPath);

      if (onProgress) {
        onProgress({
          currentStep: `Moving files from build_${installation.buildId} to manifest_${installation.manifestId}`,
          completedSteps: 2,
          totalSteps: 3,
          currentInstallation: installation
        });
      }

      // Move all files from old directory to new directory
      const entries = await fs.readdir(installation.path, { withFileTypes: true });
      
      for (const entry of entries) {
        const oldPath = path.join(installation.path, entry.name);
        const newFilePath = path.join(newPath, entry.name);
        
        if (entry.isDirectory()) {
          await fs.move(oldPath, newFilePath);
        } else {
          await fs.move(oldPath, newFilePath);
        }
      }

      // Remove the old directory
      await fs.remove(installation.path);

      // Update configuration to use manifest ID
      const versionInfo: BranchVersionInfo = {
        buildId: installation.buildId,
        manifestId: installation.manifestId,
        downloadDate: new Date().toISOString(),
        isActive: false, // Will be set by caller
        path: newPath
      };

      this.configService.setBranchManifestVersion(
        installation.branchName, 
        installation.manifestId, 
        versionInfo
      );

      if (onProgress) {
        onProgress({
          currentStep: `Migration completed for ${installation.branchName}`,
          completedSteps: 3,
          totalSteps: 3,
          currentInstallation: installation
        });
      }

      console.log(`Successfully migrated ${installation.branchName}/${installation.buildId} to manifest_${installation.manifestId}`);
      return { success: true };

    } catch (error) {
      console.error(`Error migrating installation ${installation.branchName}/${installation.buildId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during migration'
      };
    }
  }

  /**
   * Migrates all detected legacy installations to manifest ID based versioning
   * 
   * @param managedEnvironmentPath The managed environment root path
   * @param onProgress Optional progress callback
   * @returns Promise<MigrationResult> Complete migration result
   */
  async migrateToManifestIds(
    managedEnvironmentPath: string,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    try {
      console.log('Starting migration to manifest ID based versioning');
      
      const result: MigrationResult = {
        success: true,
        migratedInstallations: [],
        failedInstallations: [],
        errors: []
      };

      // Detect legacy installations
      if (onProgress) {
        onProgress({
          currentStep: 'Detecting legacy installations...',
          completedSteps: 0,
          totalSteps: 1
        });
      }

      const legacyInstallations = await this.detectLegacyInstallations(managedEnvironmentPath);
      
      if (legacyInstallations.length === 0) {
        console.log('No legacy installations found');
        return result;
      }

      if (onProgress) {
        onProgress({
          currentStep: `Found ${legacyInstallations.length} legacy installations`,
          completedSteps: 1,
          totalSteps: legacyInstallations.length + 1
        });
      }

      // Migrate each installation
      for (let i = 0; i < legacyInstallations.length; i++) {
        const installation = legacyInstallations[i];
        
        if (onProgress) {
          onProgress({
            currentStep: `Migrating ${i + 1}/${legacyInstallations.length}: ${installation.branchName}`,
            completedSteps: i + 1,
            totalSteps: legacyInstallations.length + 1,
            currentInstallation: installation
          });
        }

        const migrationResult = await this.migrateInstallationToManifestId(installation, onProgress);
        
        if (migrationResult.success) {
          result.migratedInstallations.push(installation);
        } else {
          result.failedInstallations.push({
            ...installation,
            error: migrationResult.error || 'Unknown error'
          });
          result.errors.push(`Failed to migrate ${installation.branchName}/${installation.buildId}: ${migrationResult.error}`);
        }
      }

      // Set active manifests for migrated installations
      for (const installation of result.migratedInstallations) {
        if (installation.manifestId) {
          this.configService.setActiveManifest(installation.branchName, installation.manifestId);
        }
      }

      result.success = result.failedInstallations.length === 0;
      
      console.log(`Migration completed: ${result.migratedInstallations.length} successful, ${result.failedInstallations.length} failed`);
      return result;

    } catch (error) {
      console.error('Error during migration:', error);
      return {
        success: false,
        migratedInstallations: [],
        failedInstallations: [],
        errors: [error instanceof Error ? error.message : 'Unknown error during migration']
      };
    }
  }

  /**
   * Validates that migration completed successfully
   * 
   * @param managedEnvironmentPath The managed environment root path
   * @returns Promise<{valid: boolean, errors: string[]}> Validation result
   */
  async validateMigration(managedEnvironmentPath: string): Promise<{valid: boolean, errors: string[]}> {
    try {
      console.log('Validating migration...');
      
      const errors: string[] = [];
      const branchesPath = path.join(managedEnvironmentPath, 'branches');
      
      if (!await fs.pathExists(branchesPath)) {
        return { valid: true, errors: [] };
      }

      const branchDirs = await fs.readdir(branchesPath, { withFileTypes: true });
      
      for (const branchDir of branchDirs) {
        if (!branchDir.isDirectory()) continue;
        
        const branchName = branchDir.name;
        const branchPath = path.join(branchesPath, branchName);
        
        // Check for remaining build_* directories
        const versionDirs = await fs.readdir(branchPath, { withFileTypes: true });
        
        for (const versionDir of versionDirs) {
          if (!versionDir.isDirectory()) continue;
          
          const versionType = detectVersionIdentifierType(versionDir.name);
          
          if (versionType === 'build') {
            errors.push(`Legacy build directory still exists: ${branchName}/${versionDir.name}`);
          }
        }

        // Check that manifest directories have proper content
        for (const versionDir of versionDirs) {
          if (!versionDir.isDirectory()) continue;
          
          const versionType = detectVersionIdentifierType(versionDir.name);
          
          if (versionType === 'manifest') {
            const versionPath = path.join(branchPath, versionDir.name);
            const entries = await fs.readdir(versionPath);
            
            if (entries.length === 0) {
              errors.push(`Empty manifest directory: ${branchName}/${versionDir.name}`);
            }
          }
        }
      }
      
      const valid = errors.length === 0;
      console.log(`Migration validation ${valid ? 'passed' : 'failed'}: ${errors.length} issues found`);
      
      return { valid, errors };
      
    } catch (error) {
      console.error('Error validating migration:', error);
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during validation']
      };
    }
  }

  /**
   * Rolls back a failed migration by restoring original directory structure
   * 
   * @param managedEnvironmentPath The managed environment root path
   * @param onProgress Optional progress callback
   * @returns Promise<{success: boolean, errors: string[]}> Rollback result
   */
  async rollbackMigration(
    managedEnvironmentPath: string,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<{success: boolean, errors: string[]}> {
    try {
      console.log('Rolling back migration...');
      
      const errors: string[] = [];
      const branchesPath = path.join(managedEnvironmentPath, 'branches');
      
      if (!await fs.pathExists(branchesPath)) {
        return { success: true, errors: [] };
      }

      const branchDirs = await fs.readdir(branchesPath, { withFileTypes: true });
      
      for (const branchDir of branchDirs) {
        if (!branchDir.isDirectory()) continue;
        
        const branchName = branchDir.name;
        const branchPath = path.join(branchesPath, branchName);
        
        if (onProgress) {
          onProgress({
            currentStep: `Rolling back branch: ${branchName}`,
            completedSteps: 0,
            totalSteps: 1
          });
        }

        // Find manifest directories and try to restore to build directories
        const versionDirs = await fs.readdir(branchPath, { withFileTypes: true });
        
        for (const versionDir of versionDirs) {
          if (!versionDir.isDirectory()) continue;
          
          const versionType = detectVersionIdentifierType(versionDir.name);
          
          if (versionType === 'manifest') {
            const manifestId = versionDir.name.replace('manifest_', '');
            const versionPath = path.join(branchPath, versionDir.name);
            
            // Try to find corresponding build ID from configuration
            const manifestVersions = this.configService.getBranchManifestVersions(branchName);
            const versionInfo = manifestVersions[manifestId];
            
            if (versionInfo && versionInfo.buildId) {
              const buildDirName = `build_${versionInfo.buildId}`;
              const buildPath = path.join(branchPath, buildDirName);
              
              try {
                // Move files back to build directory
                await fs.move(versionPath, buildPath);
                console.log(`Restored ${branchName}/${versionDir.name} to ${buildDirName}`);
              } catch (error) {
                errors.push(`Failed to restore ${branchName}/${versionDir.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            } else {
              errors.push(`No build ID found for manifest ${manifestId} in branch ${branchName}`);
            }
          }
        }
      }
      
      const success = errors.length === 0;
      console.log(`Rollback ${success ? 'completed' : 'failed'}: ${errors.length} errors`);
      
      return { success, errors };
      
    } catch (error) {
      console.error('Error during rollback:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during rollback']
      };
    }
  }
}
