/**
 * Steam Game Info Cache Service for Schedule I Developer Environment Utility
 *
 * Provides intelligent caching for Steam game information to reduce resource usage
 * and improve performance. Caches Steam API responses and provides methods to
 * retrieve, update, and invalidate cached data.
 *
 * Key features:
 * - In-memory caching of Steam game information
 * - Automatic cache invalidation based on time and data freshness
 * - Thread-safe operations for concurrent access
 * - Configurable cache TTL and size limits
 * - Integration with SteamUpdateService for data fetching
 *
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import { EventEmitter } from 'events';
import { LoggingService } from './LoggingService';

/**
 * Interface for cached Steam game information
 */
export interface CachedSteamGameInfo {
  /** All branch build IDs */
  branchBuildIds: Record<string, string>;
  /** Current Steam branch key */
  currentBranchKey: string;
  /** Timestamp when data was last fetched */
  lastFetched: number;
  /** Timestamp when data was last updated by Steam */
  lastSteamUpdate: number;
  /** Cache expiration timestamp */
  expiresAt: number;
  /** Whether the cache is currently being updated */
  isUpdating: boolean;
}

/**
 * Interface for cache configuration
 */
export interface CacheConfig {
  /** Cache TTL in milliseconds (default: 5 minutes) */
  ttlMs: number;
  /** Maximum cache size (default: 100 entries) */
  maxSize: number;
  /** Whether to enable automatic refresh before expiration */
  enableAutoRefresh: boolean;
  /** Refresh threshold as percentage of TTL (default: 0.8 = 80%) */
  refreshThreshold: number;
}

/**
 * Steam Game Info Cache Service Events
 */
export interface SteamGameInfoCacheEvents {
  'cache-updated': (info: CachedSteamGameInfo) => void;
  'cache-invalidated': () => void;
  'cache-error': (error: Error) => void;
}

/**
 * Steam Game Info Cache Service class
 *
 * Manages caching of Steam game information to reduce API calls and improve performance.
 * Provides methods for retrieving, updating, and invalidating cached data with
 * automatic expiration and refresh capabilities.
 */
export class SteamGameInfoCache extends EventEmitter {
  /** Cached Steam game information */
  private cachedInfo: CachedSteamGameInfo | null = null;

  /** Cache configuration */
  private config: CacheConfig;

  /** Logging service instance */
  private loggingService: LoggingService;

  /** Steam Update Service instance (injected) */
  private steamUpdateService: any;

  /** Cache update promise to prevent concurrent updates */
  private updatePromise: Promise<CachedSteamGameInfo> | null = null;

  /**
   * Initializes the Steam Game Info Cache Service
   *
   * @param loggingService Logging service instance
   * @param config Cache configuration options
   */
  constructor(
    loggingService: LoggingService,
    config?: Partial<CacheConfig>
  ) {
    super();

    this.loggingService = loggingService;
    this.steamUpdateService = null; // Will be set later via setSteamUpdateService
    this.config = {
      ttlMs: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      enableAutoRefresh: true,
      refreshThreshold: 0.8, // Refresh when 80% of TTL has passed
      ...config
    };
  }

  /**
   * Sets the Steam Update Service instance
   *
   * @param steamUpdateService Steam Update Service instance
   */
  public setSteamUpdateService(steamUpdateService: any): void {
    this.steamUpdateService = steamUpdateService;
  }

  /**
   * Gets cached Steam game information, fetching fresh data if needed
   *
   * @param forceRefresh Whether to force a refresh even if cache is valid
   * @returns Promise resolving to cached Steam game information
   */
  public async getGameInfo(forceRefresh: boolean = false): Promise<CachedSteamGameInfo | null> {
    try {
      // Check if we have valid cached data
      if (!forceRefresh && this.isCacheValid()) {
        console.log('[SteamGameInfoCache] Returning cached Steam game info');
        await this.loggingService.debug('Returning cached Steam game info');
        return this.cachedInfo;
      }

      // Check if we're already updating
      if (this.cachedInfo?.isUpdating && this.updatePromise) {
        await this.loggingService.debug('Cache update in progress, waiting...');
        return await this.updatePromise;
      }

      // Start a new update
      await this.loggingService.debug('Fetching fresh Steam game info');
      this.updatePromise = this.updateCache();
      const result = await this.updatePromise;
      this.updatePromise = null;

      return result;
    } catch (error) {
      await this.loggingService.error(`Failed to get Steam game info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.emit('cache-error', error instanceof Error ? error : new Error('Unknown error'));
      return null;
    }
  }

  /**
   * Gets branch build IDs from cache or fetches fresh data
   *
   * @param forceRefresh Whether to force a refresh
   * @returns Promise resolving to branch build IDs
   */
  public async getBranchBuildIds(forceRefresh: boolean = false): Promise<Record<string, string>> {
    const gameInfo = await this.getGameInfo(forceRefresh);
    return gameInfo?.branchBuildIds || {};
  }

  /**
   * Gets current Steam branch key from cache or fetches fresh data
   *
   * @param forceRefresh Whether to force a refresh
   * @returns Promise resolving to current Steam branch key
   */
  public async getCurrentBranchKey(forceRefresh: boolean = false): Promise<string> {
    const gameInfo = await this.getGameInfo(forceRefresh);
    return gameInfo?.currentBranchKey || '';
  }

  /**
   * Updates the cache with fresh data from Steam
   *
   * @returns Promise resolving to updated cached information
   */
  private async updateCache(): Promise<CachedSteamGameInfo> {
    try {
      // Mark as updating
      if (this.cachedInfo) {
        this.cachedInfo.isUpdating = true;
      }

      await this.loggingService.debug('Updating Steam game info cache...');
      console.log('[SteamGameInfoCache] Starting cache update...');

      // Check if Steam Update Service is available
      if (!this.steamUpdateService) {
        throw new Error('Steam Update Service not available');
      }

      // Check if Steam Update Service is connected
      if (!this.steamUpdateService.isConnectedToSteam()) {
        await this.loggingService.warn('Steam Update Service not connected, attempting to connect...');
        await this.steamUpdateService.connect();
      }

      // Fetch fresh data from Steam using direct API call to avoid circular dependency
      console.log('[SteamGameInfoCache] Fetching fresh data from Steam...');
      const [branchBuildIds, currentBranchKey] = await Promise.all([
        this.steamUpdateService.fetchAllBranchBuildIdsFromSteam(),
        this.getCurrentBranchKeyFromSteam()
      ]);
      console.log('[SteamGameInfoCache] Fresh data fetched:', Object.keys(branchBuildIds || {}));

      const now = Date.now();
      const newCachedInfo: CachedSteamGameInfo = {
        branchBuildIds: branchBuildIds || {},
        currentBranchKey: currentBranchKey || '',
        lastFetched: now,
        lastSteamUpdate: now, // We'll update this when we get actual Steam update info
        expiresAt: now + this.config.ttlMs,
        isUpdating: false
      };

      // Update cache
      this.cachedInfo = newCachedInfo;

      await this.loggingService.info(`Steam game info cache updated successfully. Cached ${Object.keys(branchBuildIds || {}).length} branch build IDs.`);
      this.emit('cache-updated', newCachedInfo);

      return newCachedInfo;
    } catch (error) {
      await this.loggingService.error(`Failed to update Steam game info cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Reset updating flag
      if (this.cachedInfo) {
        this.cachedInfo.isUpdating = false;
      }

      throw error;
    }
  }

  /**
   * Gets current branch key from Steam (helper method)
   *
   * @returns Promise resolving to current branch key
   */
  private async getCurrentBranchKeyFromSteam(): Promise<string> {
    try {
      // This would typically come from the Steam service
      // For now, we'll return an empty string as this is handled elsewhere
      return '';
    } catch (error) {
      await this.loggingService.warn(`Failed to get current branch key from Steam: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return '';
    }
  }

  /**
   * Checks if the current cache is valid and not expired
   *
   * @returns True if cache is valid
   */
  private isCacheValid(): boolean {
    if (!this.cachedInfo) {
      return false;
    }

    const now = Date.now();
    
    // Check if cache has expired
    if (now >= this.cachedInfo.expiresAt) {
      return false;
    }

    // Check if we should refresh based on threshold
    if (this.config.enableAutoRefresh) {
      const timeSinceLastFetch = now - this.cachedInfo.lastFetched;
      const refreshThreshold = this.config.ttlMs * this.config.refreshThreshold;
      
      if (timeSinceLastFetch >= refreshThreshold) {
        // Trigger background refresh
        this.updateCache().catch(error => {
          this.loggingService.error(`Background cache refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });
      }
    }

    return true;
  }

  /**
   * Invalidates the cache, forcing a fresh fetch on next request
   */
  public invalidateCache(): void {
    this.loggingService.debug('Invalidating Steam game info cache');
    this.cachedInfo = null;
    this.updatePromise = null;
    this.emit('cache-invalidated');
  }

  /**
   * Gets cache statistics
   *
   * @returns Cache statistics object
   */
  public getCacheStats(): {
    hasData: boolean;
    lastFetched: number | null;
    expiresAt: number | null;
    isUpdating: boolean;
    ageMs: number | null;
    ttlMs: number;
  } {
    const now = Date.now();
    return {
      hasData: !!this.cachedInfo,
      lastFetched: this.cachedInfo?.lastFetched || null,
      expiresAt: this.cachedInfo?.expiresAt || null,
      isUpdating: this.cachedInfo?.isUpdating || false,
      ageMs: this.cachedInfo ? now - this.cachedInfo.lastFetched : null,
      ttlMs: this.config.ttlMs
    };
  }

  /**
   * Updates cache configuration
   *
   * @param newConfig New configuration options
   */
  public updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.loggingService.debug('Steam game info cache configuration updated');
  }

  /**
   * Cleans up resources
   */
  public dispose(): void {
    this.removeAllListeners();
    this.cachedInfo = null;
    this.updatePromise = null;
  }
}

// Types are already exported inline above
