/**
 * Steam Branch IPC Handlers for Schedule I Developer Environment Utility
 *
 * Provides IPC handlers for Steam branch operations including depot and manifest
 * resolution, build ID management, version-specific downloads, and recent build
 * history retrieval. Handles communication between the main process and renderer
 * process for Steam branch operations using the SteamUpdateService.
 *
 * Key features:
 * - Depot and manifest ID resolution for specific builds
 * - Branch build ID retrieval and validation
 * - Recent build history retrieval via Steam PICS cache
 * - Sequential depot download orchestration
 * - Integration with DepotDownloader for manifest-specific downloads
 * - Build history availability status reporting
 *
 * Note: Steam's PICS system provides limited historical data. Recent build
 * history may not be available for all branches, and the system will indicate
 * when historical data is unavailable.
 *
 * @author Schedule I Developer Environment Utility Team
 * @version 2.2.0
 */

import { ipcMain } from 'electron';
import { SteamUpdateService } from '../services/SteamUpdateService';
import { LoggingService } from '../services/LoggingService';
import { ConfigService } from '../services/ConfigService';
import { DepotInfo, RecentBuildsResult, BranchVersionInfo } from '../../shared/types';
import { listBranchVersions } from '../utils/pathUtils';

let loggingService: LoggingService | null = null;
let steamUpdateService: SteamUpdateService | null = null;

/**
 * Initialize the Steam Update Service for branch operations
 */
function initializeSteamUpdateService(): SteamUpdateService {
  if (!steamUpdateService) {
    if (!loggingService) {
      throw new Error('LoggingService not initialized');
    }
    steamUpdateService = new SteamUpdateService(loggingService);
  }
  return steamUpdateService;
}

/**
 * Get depot and manifest information for a specific build ID
 *
 * @param event IPC event object
 * @param buildId The build ID to get depot information for
 * @returns Promise<{success: boolean, depots?: DepotInfo[], error?: string}> Depot information result
 */
async function handleGetDepotManifestsForBuild(event: any, buildId: string): Promise<{success: boolean, depots?: DepotInfo[], error?: string}> {
  try {
    console.log('Getting depot manifests for build ID:', buildId);

    if (!buildId || typeof buildId !== 'string') {
      return { success: false, error: 'Build ID is required and must be a string' };
    }

    const steamService = initializeSteamUpdateService();
    
    // Ensure Steam connection
    if (!steamService.isConnectedToSteam()) {
      await steamService.connect();
    }

    const depots = await steamService.getDepotManifestsForBuild(buildId);
    
    console.log(`Found ${depots.length} depots for build ${buildId}`);
    return { success: true, depots };

  } catch (error) {
    console.error('Error getting depot manifests for build:', error);
    return {
      success: false,
      error: `Failed to get depot manifests: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get depot and manifest information for a specific branch
 *
 * @param event IPC event object
 * @param branchKey Steam branch key (e.g., 'public', 'beta')
 * @param buildId Optional build ID to verify against branch
 * @returns Promise<{success: boolean, depots?: DepotInfo[], error?: string}> Depot information result
 */
async function handleGetDepotManifestsForBranch(event: any, branchKey: string, buildId?: string): Promise<{success: boolean, depots?: DepotInfo[], error?: string}> {
  try {
    console.log('Getting depot manifests for branch:', branchKey, buildId ? `(build: ${buildId})` : '');

    if (!branchKey || typeof branchKey !== 'string') {
      return { success: false, error: 'Branch key is required and must be a string' };
    }

    const steamService = initializeSteamUpdateService();
    
    // Ensure Steam connection
    if (!steamService.isConnectedToSteam()) {
      await steamService.connect();
    }

    const depots = await steamService.getDepotManifestsForBranch(branchKey, buildId);
    
    console.log(`Found ${depots.length} depots for branch ${branchKey}`);
    return { success: true, depots };

  } catch (error) {
    console.error('Error getting depot manifests for branch:', error);
    return {
      success: false,
      error: `Failed to get depot manifests: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get current build ID for a specific branch
 *
 * @param event IPC event object
 * @param branchKey Steam branch key (e.g., 'public', 'beta')
 * @returns Promise<{success: boolean, buildId?: string, error?: string}> Build ID result
 */
async function handleGetBranchBuildId(event: any, branchKey: string): Promise<{success: boolean, buildId?: string, error?: string}> {
  try {
    console.log('Getting build ID for branch:', branchKey);

    if (!branchKey || typeof branchKey !== 'string') {
      return { success: false, error: 'Branch key is required and must be a string' };
    }

    const steamService = initializeSteamUpdateService();
    
    // Ensure Steam connection
    if (!steamService.isConnectedToSteam()) {
      await steamService.connect();
    }

    const buildId = await steamService.getBranchBuildId(branchKey);
    
    if (!buildId) {
      return { success: false, error: `No build ID found for branch ${branchKey}` };
    }

    console.log(`Build ID for branch ${branchKey}: ${buildId}`);
    return { success: true, buildId };

  } catch (error) {
    console.error('Error getting branch build ID:', error);
    return {
      success: false,
      error: `Failed to get branch build ID: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get all available branch build IDs
 *
 * @param event IPC event object
 * @returns Promise<{success: boolean, buildIds?: Record<string, string>, error?: string}> All build IDs result
 */
async function handleGetAllBranchBuildIds(event: any): Promise<{success: boolean, buildIds?: Record<string, string>, error?: string}> {
  try {
    console.log('Getting all branch build IDs');

    const steamService = initializeSteamUpdateService();
    
    // Ensure Steam connection
    if (!steamService.isConnectedToSteam()) {
      await steamService.connect();
    }

    const buildIds = await steamService.getAllBranchBuildIds();
    
    console.log(`Found build IDs for ${Object.keys(buildIds).length} branches`);
    return { success: true, buildIds };

  } catch (error) {
    console.error('Error getting all branch build IDs:', error);
    return {
      success: false,
      error: `Failed to get branch build IDs: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get recent builds for a specific branch using Steam PICS cache
 *
 * Note: Steam's PICS system provides limited historical data. This handler
 * attempts to retrieve recent build information, but Steam may not provide
 * extensive build history for all branches. The result will indicate whether
 * historical data is available and return whatever data is accessible.
 *
 * @param event IPC event object
 * @param branchKey Steam branch key (e.g., 'public', 'beta')
 * @param maxCount Maximum number of recent builds to return (1-50, default: 10)
 * @returns Promise<RecentBuildsResult> Recent builds result with availability status
 */
async function handleGetRecentBuildsForBranch(event: any, branchKey: string, maxCount: number = 10): Promise<RecentBuildsResult> {
  try {
    console.log(`Getting recent builds for branch: ${branchKey} (maxCount: ${maxCount})`);

    if (!branchKey || typeof branchKey !== 'string') {
      return { 
        success: false, 
        error: 'Branch key is required and must be a string',
        historyAvailable: false,
        maxCount: maxCount,
        actualCount: 0
      };
    }

    // Validate maxCount parameter
    const clampedMaxCount = Math.max(1, Math.min(50, maxCount));

    const steamService = initializeSteamUpdateService();
    
    // Ensure Steam connection
    if (!steamService.isConnectedToSteam()) {
      await steamService.connect();
    }

    const result = await steamService.getRecentBuildsForBranch(branchKey, clampedMaxCount);
    
    console.log(`Found ${result.actualCount} recent builds for branch ${branchKey} (history available: ${result.historyAvailable})`);
    return result;

  } catch (error) {
    console.error('Error getting recent builds for branch:', error);
    return {
      success: false,
      error: `Failed to get recent builds: ${error instanceof Error ? error.message : 'Unknown error'}`,
      historyAvailable: false,
      maxCount: maxCount,
      actualCount: 0
    };
  }
}

/**
 * List branch builds in simple array format for UI compatibility
 *
 * This handler provides a simplified interface that returns builds as a simple array
 * format expected by the VersionManagerDialog component. It converts the RecentBuildsResult
 * from SteamUpdateService into the format expected by the UI.
 *
 * Note: Steam's PICS system provides limited historical data. Only the current build
 * is reliably available, and this will be clearly indicated in the UI.
 *
 * @param event IPC event object
 * @param branchKey Steam branch key (e.g., 'public', 'beta')
 * @param maxCount Maximum number of recent builds to return (1-50, default: 10)
 * @returns Promise<Array<{buildId: string, date: string, sizeBytes?: number}>> Simple array format
 */
async function handleListBranchBuilds(event: any, branchKey: string, maxCount: number = 10): Promise<Array<{buildId: string, date: string, sizeBytes?: number}>> {
  try {
    console.log(`Listing branch builds for: ${branchKey} (maxCount: ${maxCount})`);

    if (!branchKey || typeof branchKey !== 'string') {
      throw new Error('Branch key is required and must be a string');
    }

    // Validate maxCount parameter
    const clampedMaxCount = Math.max(1, Math.min(50, maxCount));

    const steamService = initializeSteamUpdateService();
    
    // Ensure Steam connection
    if (!steamService.isConnectedToSteam()) {
      await steamService.connect();
    }

    const result = await steamService.getRecentBuildsForBranch(branchKey, clampedMaxCount);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get recent builds');
    }

    // Convert RecentBuildsResult to simple array format
    const builds = result.builds?.map(build => {
      // Validate buildId first
      if (!build.buildId || build.buildId === 'undefined' || build.buildId === 'null' || build.buildId === 'NaN' || isNaN(Number(build.buildId))) {
        console.warn(`Invalid buildId detected: ${build.buildId}, skipping build`);
        return null;
      }

      // Handle invalid or missing timeUpdated values
      let date: string;
      if (build.timeUpdated && typeof build.timeUpdated === 'number' && build.timeUpdated > 0) {
        try {
          date = new Date(build.timeUpdated * 1000).toISOString();
        } catch (error) {
          console.warn(`Invalid timestamp for build ${build.buildId}: ${build.timeUpdated}`);
          date = new Date().toISOString(); // Fallback to current time
        }
      } else {
        console.warn(`Missing or invalid timeUpdated for build ${build.buildId}: ${build.timeUpdated}`);
        date = new Date().toISOString(); // Fallback to current time
      }
      
      return {
        buildId: build.buildId,
        date: date,
        sizeBytes: undefined // Steam PICS doesn't provide size information
      };
    }).filter(build => build !== null) || [];

    console.log(`Converted ${builds.length} builds to simple array format for branch ${branchKey}`);
    return builds;

  } catch (error) {
    console.error('Error listing branch builds:', error);
    // Return empty array on error to maintain UI stability
    return [];
  }
}

/**
 * Get installed versions for a specific branch
 *
 * This handler scans the managed environment directory for installed branch versions
 * and returns information about each version including build ID, path, download date,
 * size, and whether it's the currently active version.
 *
 * @param event IPC event object
 * @param branchName The branch name to get installed versions for
 * @returns Promise<Array<{buildId: string, manifestId: string, path: string, isActive: boolean, downloadDate: string, sizeBytes?: number, description?: string}>> Installed versions
 */
async function handleGetInstalledVersions(event: any, branchName: string): Promise<Array<{buildId: string, manifestId: string, path: string, isActive: boolean, downloadDate: string, sizeBytes?: number, description?: string}>> {
  try {
    console.log(`Getting installed versions for branch: ${branchName}`);

    if (!branchName || typeof branchName !== 'string') {
      throw new Error('Branch name is required and must be a string');
    }

    // Get config service instance (injected during setup)
    if (!steamUpdateService) {
      throw new Error('SteamUpdateService not initialized');
    }

    // Get the config service from the steam update service
    const configService = (steamUpdateService as any).configService;
    if (!configService) {
      throw new Error('ConfigService not available');
    }

    // Get managed environment path and active version info
    const config = await configService.getConfig();
    const managedEnvironmentPath = config.managedEnvironmentPath;
    const activeBuildId = configService.getActiveBuild(branchName);
    const activeManifestId = configService.getActiveManifest(branchName);

    if (!managedEnvironmentPath) {
      throw new Error('Managed environment path not configured');
    }

    // Use pathUtils to list branch versions
    const versions = await listBranchVersions(managedEnvironmentPath, branchName);

    // Get custom descriptions from config
    const manifestVersions = await configService.getBranchManifestVersions(branchName);
    const buildVersions = await configService.getBranchVersions(branchName);

    // Set isActive flag based on config (prioritize manifest over build)
    const versionsWithActiveFlag = versions.map(version => {
      let isActive = false;
      let description: string | undefined;
      
      if (activeManifestId && version.manifestId) {
        // Check if this is the active manifest version
        isActive = version.manifestId === activeManifestId;
      } else if (activeBuildId && !activeManifestId) {
        // Fall back to build ID check if no manifest is active
        isActive = version.buildId === activeBuildId;
      }

      // Get custom description from config
      if (version.manifestId && manifestVersions && manifestVersions[version.manifestId]) {
        description = manifestVersions[version.manifestId].description;
      } else if (version.buildId && buildVersions && buildVersions[version.buildId]) {
        description = buildVersions[version.buildId].description;
      }
      
      return {
        buildId: version.buildId || '', // Handle undefined buildId for manifest directories
        manifestId: version.manifestId || '', // Handle undefined manifestId for build directories
        path: version.path,
        isActive,
        downloadDate: version.downloadDate,
        sizeBytes: version.sizeBytes,
        description // Include custom description if available
      };
    });

    console.log(`Found ${versionsWithActiveFlag.length} installed versions for branch ${branchName}`);
    return versionsWithActiveFlag;

  } catch (error) {
    console.error('Error getting installed versions:', error);
    // Return empty array on error to maintain UI stability
    return [];
  }
}

/**
 * Sets up all Steam Branch IPC handlers
 *
 * Registers all Steam branch-related IPC handlers with the main process.
 * This function should be called during application initialization.
 */
export function setupSteamBranchHandlers(steamUpdateServiceInstance: SteamUpdateService, configService: ConfigService, loggingServiceInstance: LoggingService): void {
  console.log('Setting up Steam Branch IPC handlers');

  // Initialize services
  loggingService = loggingServiceInstance;
  steamUpdateService = steamUpdateServiceInstance;

  // Store config service reference for use in handlers
  (steamUpdateService as any).configService = configService;

  // Get depot manifests for a specific build ID
  ipcMain.handle('steam:get-depot-manifests-for-build', handleGetDepotManifestsForBuild);

  // Get depot manifests for a specific branch
  ipcMain.handle('steam:get-depot-manifests-for-branch', handleGetDepotManifestsForBranch);

  // Get current build ID for a branch
  ipcMain.handle('steam:get-branch-buildid', handleGetBranchBuildId);

  // Get all available branch build IDs
  ipcMain.handle('steam:get-all-branch-buildids', handleGetAllBranchBuildIds);

  // Get recent builds for a specific branch
  ipcMain.handle('steam:get-recent-builds-for-branch', handleGetRecentBuildsForBranch);

  // List branch builds in simple array format for UI compatibility
  ipcMain.handle('steam:list-branch-builds', handleListBranchBuilds);

  // Get installed versions for a specific branch
  ipcMain.handle('steam:get-installed-versions', handleGetInstalledVersions);

  console.log('Steam Branch IPC handlers registered successfully');
}