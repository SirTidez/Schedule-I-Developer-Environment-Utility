import * as fs from 'fs-extra';
import * as path from 'path';
import { LoggingService } from './LoggingService';
import { UpdateInfo, GitHubRelease } from './UpdateService';

export interface CachedUpdateInfo {
  updateInfo: UpdateInfo;
  lastChecked: string;
  release: GitHubRelease;
}

export class UpdateCacheService {
  private readonly cacheFilePath: string;
  private readonly loggingService: LoggingService;

  constructor(loggingService: LoggingService, configDir: string) {
    this.loggingService = loggingService;
    this.cacheFilePath = path.join(configDir, 'update.json');
  }

  /**
   * Check if cached update info is still valid (less than 24 hours old)
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

      // Cache is valid if less than 24 hours old
      return hoursSinceLastCheck < 24;
    } catch (error) {
      this.loggingService.error('Error checking cache validity:', error as Error);
      return false;
    }
  }

  /**
   * Load cached update info
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
   */
  getCacheFilePath(): string {
    return this.cacheFilePath;
  }
}
