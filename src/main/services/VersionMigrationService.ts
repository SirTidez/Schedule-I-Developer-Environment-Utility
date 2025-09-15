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
   * Detects legacy installations that use the old flat directory structure
   * 
   * Scans the managed environment for branch directories with files directly in them
   * (old structure) and attempts to extract manifest IDs from appmanifest files.
   * Only returns branches that actually need migration (no build_ or manifest_ subdirectories).
   * 
   * @param managedEnvironmentPath The managed environment root path
   * @returns Promise<LegacyInstallation[]> Array of detected legacy installations that need migration
   */
  async detectLegacyInstallations(managedEnvironmentPath: string): Promise<LegacyInstallation[]> {
    try {
      console.log('Detecting legacy installations in:', managedEnvironmentPath);
      
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
        
        // Check if this branch needs migration (has legacy flat structure AND no build_/manifest_ subdirectories)
        const needsMigration = await this.branchNeedsMigration(branchPath);
        
        if (needsMigration) {
          console.log(`Branch ${branchName} needs migration - has legacy flat structure`);
          
          // Look for appmanifest file in the branch directory
          const manifestId = await this.extractManifestIdFromBranch(branchPath);
          
          if (manifestId) {
            console.log(`Found manifest ID ${manifestId} for legacy branch ${branchName}`);
            
            legacyInstallations.push({
              branchName,
              buildId: manifestId, // Use manifest ID as build ID for migration
              path: branchPath,
              manifestId
            });
          } else {
            console.warn(`No manifest ID found for legacy branch ${branchName}`);
            
            // Still add it but without manifest ID - user can retry after fixing Steam detection
            legacyInstallations.push({
              branchName,
              buildId: 'unknown',
              path: branchPath,
              manifestId: undefined
            });
          }
        } else {
          console.log(`Branch ${branchName} does not need migration - already has proper structure`);
        }
      }
      
      console.log(`Found ${legacyInstallations.length} branches that need migration`);
      return legacyInstallations;
      
    } catch (error) {
      console.error('Error detecting legacy installations:', error);
      return [];
    }
  }

  /**
   * Checks if a specific branch needs migration
   * 
   * A branch needs migration if:
   * 1. It has files directly in the branch directory (legacy flat structure)
   * 2. It does NOT have any build_ or manifest_ subdirectories
   * 
   * @param branchPath The branch directory path
   * @returns Promise<boolean> True if the branch needs migration
   */
  private async branchNeedsMigration(branchPath: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(branchPath, { withFileTypes: true });
      
      // Check if there are any files directly in the branch directory (legacy structure)
      const hasDirectFiles = entries.some(entry => entry.isFile());
      
      // Check if there are any build_ or manifest_ subdirectories (new structure)
      const hasVersionSubdirs = entries.some(entry => 
        entry.isDirectory() && 
        (entry.name.startsWith('build_') || entry.name.startsWith('manifest_'))
      );
      
      // Need migration if: has direct files (legacy) AND no version subdirectories (not already migrated)
      const needsMigration = hasDirectFiles && !hasVersionSubdirs;
      
      console.log(`Branch ${path.basename(branchPath)}: hasDirectFiles=${hasDirectFiles}, hasVersionSubdirs=${hasVersionSubdirs}, needsMigration=${needsMigration}`);
      
      return needsMigration;
    } catch (error) {
      console.error(`Error checking if branch needs migration: ${branchPath}`, error);
      return false;
    }
  }


  /**
   * Extracts manifest ID from appmanifest file in a branch directory
   * 
   * @param branchPath The branch directory path
   * @returns Promise<string | undefined> The manifest ID if found
   */
  private async extractManifestIdFromBranch(branchPath: string): Promise<string | undefined> {
    try {
      // Look for appmanifest_*.acf files in the branch directory
      const entries = await fs.readdir(branchPath, { withFileTypes: true });
      const manifestFiles = entries.filter(entry => 
        entry.isFile() && entry.name.startsWith('appmanifest_') && entry.name.endsWith('.acf')
      );

      if (manifestFiles.length === 0) {
        console.log(`No appmanifest files found in ${branchPath}`);
        return undefined;
      }

      // Use the first manifest file found
      const manifestFile = manifestFiles[0];
      const manifestPath = path.join(branchPath, manifestFile.name);
      
      console.log(`Reading manifest file: ${manifestPath}`);
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      
      // Parse the manifest to extract manifest ID from InstalledDepots
      const manifestId = this.parseManifestIdFromContent(manifestContent);
      
      if (manifestId) {
        console.log(`Extracted manifest ID: ${manifestId}`);
      } else {
        console.warn(`Could not extract manifest ID from ${manifestPath}`);
      }
      
      return manifestId;
    } catch (error) {
      console.error(`Error extracting manifest ID from ${branchPath}:`, error);
      return undefined;
    }
  }

  /**
   * Parses manifest ID from appmanifest content
   * 
   * @param content The appmanifest file content
   * @returns string | undefined The manifest ID if found
   */
  private parseManifestIdFromContent(content: string): string | undefined {
    try {
      // Look for InstalledDepots section
      const installedDepotsMatch = content.match(/"InstalledDepots"\s*\{([^}]+)\}/);
      if (!installedDepotsMatch) {
        console.log('No InstalledDepots section found in manifest');
        return undefined;
      }

      const depotsContent = installedDepotsMatch[1];
      
      // Find depot blocks and extract manifest IDs
      const depotMatches = depotsContent.match(/"(\d+)"\s*\{([^}]+)\}/g);
      if (!depotMatches) {
        console.log('No depot blocks found in InstalledDepots');
        return undefined;
      }

      // Look for the primary depot (3164501) or use the first one found
      for (const depotMatch of depotMatches) {
        const depotIdMatch = depotMatch.match(/"(\d+)"/);
        if (!depotIdMatch) continue;

        const depotId = depotIdMatch[1];
        const manifestMatch = depotMatch.match(/"manifest"\s+"([^"]+)"/);
        
        if (manifestMatch) {
          const manifestId = manifestMatch[1];
          console.log(`Found manifest ID ${manifestId} for depot ${depotId}`);
          
          // Prefer depot 3164501 (primary depot) if available
          if (depotId === '3164501') {
            return manifestId;
          }
        }
      }

      // If no primary depot found, return the first manifest ID found
      for (const depotMatch of depotMatches) {
        const manifestMatch = depotMatch.match(/"manifest"\s+"([^"]+)"/);
        if (manifestMatch) {
          return manifestMatch[1];
        }
      }

      return undefined;
    } catch (error) {
      console.error('Error parsing manifest content:', error);
      return undefined;
    }
  }

  /**
   * Migrates a single installation from legacy flat structure to build_<manifest_id> structure
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
      console.log(`Migrating installation: ${installation.branchName} (legacy flat structure)`);
      
      if (onProgress) {
        onProgress({
          currentStep: `Migrating ${installation.branchName} from legacy structure`,
          completedSteps: 0,
          totalSteps: 4,
          currentInstallation: installation
        });
      }

      if (!installation.manifestId) {
        return {
          success: false,
          error: `No manifest ID available for branch ${installation.branchName}`
        };
      }

      // Create new build_<manifest_id> directory path
      const managedEnvironmentPath = path.dirname(installation.path);
      const newPath = getBranchVersionPath(
        managedEnvironmentPath, 
        installation.branchName, 
        installation.manifestId,
        'build' // Use 'build' prefix as requested by user
      );

      if (onProgress) {
        onProgress({
          currentStep: `Creating build directory: build_${installation.manifestId}`,
          completedSteps: 1,
          totalSteps: 4,
          currentInstallation: installation
        });
      }

      // Ensure the new directory exists
      await fs.ensureDir(newPath);

      if (onProgress) {
        onProgress({
          currentStep: `Moving files from legacy structure to build_${installation.manifestId}`,
          completedSteps: 2,
          totalSteps: 4,
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

      if (onProgress) {
        onProgress({
          currentStep: `Updating configuration for ${installation.branchName}`,
          completedSteps: 3,
          totalSteps: 4,
          currentInstallation: installation
        });
      }

      // Update configuration to use the manifest ID as build ID
      const versionInfo: BranchVersionInfo = {
        buildId: installation.manifestId, // Use manifest ID as build ID
        manifestId: installation.manifestId,
        downloadDate: new Date().toISOString(),
        isActive: false, // Will be set by caller
        path: newPath
      };

      // Set the branch version in the config
      this.configService.setBranchVersion(
        installation.branchName, 
        installation.manifestId, 
        versionInfo
      );

      // Set as active build for the branch
      this.configService.setActiveBuild(installation.branchName, installation.manifestId);

      if (onProgress) {
        onProgress({
          currentStep: `Migration completed for ${installation.branchName}`,
          completedSteps: 4,
          totalSteps: 4,
          currentInstallation: installation
        });
      }

      console.log(`Successfully migrated ${installation.branchName} to build_${installation.manifestId}`);
      return { success: true };

    } catch (error) {
      console.error(`Error migrating installation ${installation.branchName}:`, error);
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

      // Set active builds for migrated installations
      for (const installation of result.migratedInstallations) {
        if (installation.manifestId) {
          this.configService.setActiveBuild(installation.branchName, installation.manifestId);
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
        
        // Check for remaining legacy flat structure
        const needsMigration = await this.branchNeedsMigration(branchPath);
        if (needsMigration) {
          errors.push(`Legacy flat structure still exists: ${branchName}`);
        }

        // Check that build directories have proper content
        const versionDirs = await fs.readdir(branchPath, { withFileTypes: true });
        
        for (const versionDir of versionDirs) {
          if (!versionDir.isDirectory()) continue;
          
          const versionType = detectVersionIdentifierType(versionDir.name);
          
          if (versionType === 'build') {
            const versionPath = path.join(branchPath, versionDir.name);
            const entries = await fs.readdir(versionPath);
            
            if (entries.length === 0) {
              errors.push(`Empty build directory: ${branchName}/${versionDir.name}`);
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

        // Find build directories and try to restore to flat structure
        const versionDirs = await fs.readdir(branchPath, { withFileTypes: true });
        
        for (const versionDir of versionDirs) {
          if (!versionDir.isDirectory()) continue;
          
          const versionType = detectVersionIdentifierType(versionDir.name);
          
          if (versionType === 'build') {
            const buildId = versionDir.name.replace('build_', '');
            const versionPath = path.join(branchPath, versionDir.name);
            
            try {
              // Move all files from build directory back to branch root
              const entries = await fs.readdir(versionPath, { withFileTypes: true });
              
              for (const entry of entries) {
                const oldPath = path.join(versionPath, entry.name);
                const newPath = path.join(branchPath, entry.name);
                
                if (entry.isDirectory()) {
                  await fs.move(oldPath, newPath);
                } else {
                  await fs.move(oldPath, newPath);
                }
              }
              
              // Remove the empty build directory
              await fs.remove(versionPath);
              console.log(`Restored ${branchName}/${versionDir.name} to flat structure`);
            } catch (error) {
              errors.push(`Failed to restore ${branchName}/${versionDir.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
