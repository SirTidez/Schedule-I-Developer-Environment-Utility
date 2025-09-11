/**
 * Update Cache Service for Schedule I Developer Environment Utility
 * 
 * Handles caching of update information to reduce GitHub API calls and improve
 * performance. Caches latest release information for 1 hour to balance between
 * freshness and API rate limiting.
 * 
 * Key features:
 * - 1-hour cache validity for latest release info
 * - JSON file-based caching
 * - Error handling and logging
 * - Cache validation and cleanup
 * - Current version is never cached (always fresh)
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { LoggingService } from './LoggingService';
import { UpdateInfo, GitHubRelease } from './UpdateService';

/**
 * Interface representing cached update information
 * 
 * Contains the cached update information along with metadata about
 * when it was last checked and the associated release data.
 */
export interface CachedUpdateInfo {
  /** The cached update information */
  updateInfo: UpdateInfo;
  /** ISO timestamp of when the cache was last updated */
  lastChecked: string;
  /** The GitHub release data associated with the update */
  release: GitHubRelease;
}

/**
 * Update Cache Service class for managing update information caching
 * 
 * Provides caching functionality for update information to reduce GitHub API calls
 * while ensuring the current application version is always fresh.
 */
export class UpdateCacheService {
  /** Path to the cache file */
  private readonly cacheFilePath: string;
  
  /** Logging service instance */
  private readonly loggingService: LoggingService;

  /**
   * Initializes the update cache service
   * 
   * @param loggingService Logging service instance
   * @param configDir Configuration directory path
   */
  constructor(loggingService: LoggingService, configDir: string) {
    this.loggingService = loggingService;
    this.cacheFilePath = path.join(configDir, 'update.json');
  }

  /**
   * Check if cached update info is still valid (less than 1 hour old)
   */
  isCacheValid(): boolean {
    try {
      if (!fs.existsSync(this.cacheFilePath)) {
        this.loggingService.info('No update cache file found');
        return false;
      }

      const cacheData: CachedUpdateInfo = fs.readJsonSync(this.cacheFilePath);
      const lastChecked = new Date(cacheData.lastChecked);
      const now = new Date();
      const hoursSinceLastCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60);

      this.loggingService.info(`Cache last checked: ${lastChecked.toISOString()}, ${hoursSinceLastCheck.toFixed(1)} hours ago`);

      // Cache is valid if less than 1 hour old
      return hoursSinceLastCheck < 1;
    } catch (error) {
      this.loggingService.error('Error checking cache validity:', error as Error);
      return false;
    }
  }

  /**
   * Load cached update info from file
   * 
   * @returns CachedUpdateInfo | null The cached data or null if not available
   */
  loadCachedUpdateInfo(): CachedUpdateInfo | null {
    try {
      if (!fs.existsSync(this.cacheFilePath)) {
        this.loggingService.info('No update cache file found');
        return null;
      }

      const cacheData: CachedUpdateInfo = fs.readJsonSync(this.cacheFilePath);
      this.loggingService.info('Loaded cached update info');
      return cacheData;
    } catch (error) {
      this.loggingService.error('Error loading cached update info:', error as Error);
      return null;
    }
  }

  /**
   * Save update info to cache
   * 
   * Saves the latest release information to cache for future use.
   * Note: Current version is not cached and should always be fresh.
   * 
   * @param updateInfo The update information to cache
   * @param release The GitHub release data to cache
   */
  saveUpdateInfo(updateInfo: UpdateInfo, release: GitHubRelease): void {
    try {
      const cacheData: CachedUpdateInfo = {
        updateInfo,
        lastChecked: new Date().toISOString(),
        release
      };

      fs.writeJsonSync(this.cacheFilePath, cacheData, { spaces: 2 });
      this.loggingService.info(`Saved update info to cache: ${this.cacheFilePath}`);
    } catch (error) {
      this.loggingService.error('Error saving update info to cache:', error as Error);
    }
  }

  /**
   * Get the cache file path
   * 
   * @returns string Path to the cache file
   */
  getCacheFilePath(): string {
    return this.cacheFilePath;
  }
}
