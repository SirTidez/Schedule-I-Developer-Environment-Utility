/**
 * Steam Update Service for Schedule I Developer Environment Utility
 *
 * Provides real-time Steam update detection using node-steam-user for enhanced
 * branch monitoring and automated update notifications. Works with Steam's PICS
 * (Product Info and Changes System) to detect when Schedule I updates are available.
 *
 * Key features:
 * - Anonymous Steam connection (no credentials required)
 * - Real-time update notifications via Steam events
 * - PICS cache for efficient data storage and retrieval
 * - Branch-specific changenumber tracking
 * - Automated reconnection with exponential backoff
 * - Integration with existing DepotDownloader workflow
 *
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import SteamUser from 'steam-user';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as os from 'os';
import { LoggingService } from './LoggingService';
import { DepotInfo, RecentBuildInfo, RecentBuildsResult } from '../../shared/types';
import { SteamWebApiService, SteamBuildInfo } from './SteamWebApiService';
import { SteamGameInfoCache } from './SteamGameInfoCache';

/**
 * Interface for Steam update information
 */
export interface SteamUpdateInfo {
  appId: number;
  changenumber: number;
  branchName?: string;
  buildId?: string;
  updateAvailable: boolean;
  lastChecked: Date;
}

/**
 * Interface for Steam connection options
 */
export interface SteamConnectionOptions {
  enablePicsCache: boolean;
  changelistUpdateInterval: number;
  dataDirectory?: string;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
}

/**
 * Steam Update Service Events
 */
export interface SteamUpdateServiceEvents {
  'connected': () => void;
  'disconnected': (error?: Error) => void;
  'update-available': (updateInfo: SteamUpdateInfo) => void;
  'update-checked': (updateInfo: SteamUpdateInfo) => void;
  'error': (error: Error) => void;
  'ownership-cached': () => void;
}

/**
 * Steam Update Service class for managing Steam API connections and update monitoring
 *
 * Provides a high-level interface for Steam update detection using node-steam-user.
 * Handles connection management, event processing, and data caching automatically.
 */
export class SteamUpdateService extends EventEmitter {
  /** Steam user client instance */
  private steamUser!: SteamUser;

  /** Logging service instance */
  private loggingService: LoggingService;

  /** Schedule I Steam AppID */
  private readonly SCHEDULE_I_APP_ID = 3164500;

  /** Connection options */
  private options: SteamConnectionOptions;

  /** Connection state tracking */
  private isConnected = false;
  private isConnecting = false;
  private reconnectAttempts = 0;

  /** Update monitoring state */
  private lastKnownChangenumbers: Map<string, number> = new Map();
  private monitoringEnabled = false;

  /** Reconnection timer */
  private reconnectTimer?: NodeJS.Timeout;

  /** Local build history cache */
  private buildHistoryCache: Map<string, RecentBuildInfo[]> = new Map();
  private readonly MAX_CACHED_BUILDS = 20;

  /** Steam Web API service for historical build data */
  private steamWebApiService: SteamWebApiService;

  /** Steam Game Info Cache service for caching Steam data */
  private gameInfoCache: SteamGameInfoCache;

  /**
   * Initializes the Steam Update Service
   *
   * @param loggingService Logging service instance
   * @param options Steam connection options
   */
  constructor(loggingService: LoggingService, options?: Partial<SteamConnectionOptions>) {
    super();

    this.loggingService = loggingService;
    this.steamWebApiService = new SteamWebApiService(loggingService);
    this.gameInfoCache = new SteamGameInfoCache(loggingService, {
      ttlMs: 5 * 60 * 1000, // 5 minutes cache TTL
      enableAutoRefresh: true,
      refreshThreshold: 0.8 // Refresh when 80% of TTL has passed
    });
    
    // Set the Steam Update Service reference in the cache after construction
    this.gameInfoCache.setSteamUpdateService(this);
    this.options = {
      enablePicsCache: true,
      changelistUpdateInterval: 60000, // 1 minute
      autoReconnect: true,
      maxReconnectAttempts: 10,
      dataDirectory: path.join(os.homedir(), 'AppData', 'LocalLow', 'TVGS', 'Development Environment Manager', 'steam-data'),
      ...options
    };

    this.initializeSteamUser();
  }

  /**
   * Initializes the Steam user client with appropriate options
   *
   * Sets up the steam-user client with PICS cache enabled for efficient
   * data storage and automatic update detection.
   */
  private initializeSteamUser(): void {
    this.steamUser = new SteamUser({
      enablePicsCache: this.options.enablePicsCache,
      changelistUpdateInterval: this.options.changelistUpdateInterval,
      dataDirectory: this.options.dataDirectory,
      picsCacheAll: false, // Only cache known apps (Schedule I)
      autoRelogin: false // We handle reconnection manually
    });

    this.setupEventHandlers();
  }

  /**
   * Sets up event handlers for Steam user client
   *
   * Configures all necessary event listeners for connection management,
   * update detection, and error handling.
   */
  private setupEventHandlers(): void {
    // Connection events
    this.steamUser.on('loggedOn', this.handleLoggedOn.bind(this));
    this.steamUser.on('disconnected', this.handleDisconnected.bind(this));
    this.steamUser.on('error', this.handleError.bind(this));

    // PICS events for update detection
    this.steamUser.on('appUpdate', this.handleAppUpdate.bind(this));
    this.steamUser.on('ownershipCached', this.handleOwnershipCached.bind(this));

    // Debug events
    this.steamUser.on('debug', (message: string) => {
      this.loggingService.debug(`Steam API Debug: ${message}`);
    });
  }

  /**
   * Handles successful Steam login
   *
   * @param details Login details from Steam
   */
  private async handleLoggedOn(details: any): Promise<void> {
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    await this.loggingService.info('Steam Update Service connected successfully');
    await this.loggingService.info(`Steam session: ${details.client_supplied_steam_id || 'Anonymous'}`);

    // Request product info for Schedule I to initialize cache
    await this.requestScheduleIProductInfo();

    this.emit('connected');
  }

  /**
   * Handles Steam disconnection
   *
   * @param eresult Disconnection reason
   * @param msg Optional error message
   */
  private async handleDisconnected(eresult: number, msg?: string): Promise<void> {
    this.isConnected = false;
    this.isConnecting = false;

    await this.loggingService.warn(`Steam Update Service disconnected: ${msg || `EResult ${eresult}`}`);

    this.emit('disconnected', new Error(msg || `Steam disconnected with EResult ${eresult}`));

    // Attempt reconnection if enabled
    if (this.options.autoReconnect && this.monitoringEnabled) {
      this.scheduleReconnection();
    }
  }

  /**
   * Handles Steam connection errors
   *
   * @param error Error object
   */
  private async handleError(error: Error): Promise<void> {
    await this.loggingService.error(`Steam Update Service error: ${error.message}`);
    this.emit('error', error);

    // Reset connection state
    this.isConnected = false;
    this.isConnecting = false;

    // Attempt reconnection for recoverable errors
    if (this.options.autoReconnect && this.monitoringEnabled) {
      this.scheduleReconnection();
    }
  }

  /**
   * Handles app update events from Steam
   *
   * @param appId Application ID that was updated
   * @param data Updated app data from Steam
   */
  private async handleAppUpdate(appId: number, data: any): Promise<void> {
    // Only process updates for Schedule I
    if (appId !== this.SCHEDULE_I_APP_ID) {
      return;
    }

    await this.loggingService.info(`Schedule I update detected: changenumber ${data.changenumber}`);

    // Invalidate cache when Steam data changes
    this.gameInfoCache.invalidateCache();
    await this.loggingService.debug('Steam game info cache invalidated due to update');

    const updateInfo: SteamUpdateInfo = {
      appId: appId,
      changenumber: data.changenumber,
      updateAvailable: true,
      lastChecked: new Date()
    };

    // Check if this is actually a new update
    const lastKnown = this.lastKnownChangenumbers.get('main') || 0;
    if (data.changenumber > lastKnown) {
      this.lastKnownChangenumbers.set('main', data.changenumber);
      this.emit('update-available', updateInfo);
    }
  }

  /**
   * Handles ownership cache completion
   */
  private async handleOwnershipCached(): Promise<void> {
    await this.loggingService.info('Steam ownership cache populated');
    this.emit('ownership-cached');
  }

  /**
   * Schedules reconnection attempt with exponential backoff
   */
  private scheduleReconnection(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.loggingService.error('Maximum reconnection attempts reached, giving up');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 60000); // Max 1 minute
    this.reconnectAttempts++;

    this.loggingService.info(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Requests product information for Schedule I
   *
   * Initializes the PICS cache with Schedule I data for update monitoring.
   */
  private async requestScheduleIProductInfo(): Promise<void> {
    try {
      this.steamUser.getProductInfo([this.SCHEDULE_I_APP_ID], [], false, (err: Error | null, apps: any) => {
        if (err) {
          this.loggingService.error(`Failed to get Schedule I product info: ${err.message}`);
          return;
        }

        const scheduleIData = apps[this.SCHEDULE_I_APP_ID];
        if (scheduleIData) {
          this.loggingService.info(`Schedule I product info loaded: changenumber ${scheduleIData.changenumber}`);
          this.lastKnownChangenumbers.set('main', scheduleIData.changenumber);
        }
      });
    } catch (error) {
      await this.loggingService.error(`Error requesting Schedule I product info: ${error}`);
    }
  }

  /**
   * Starts the Steam connection and update monitoring
   *
   * Initiates an anonymous connection to Steam for update monitoring.
   * Does not require user credentials.
   */
  public async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      await this.loggingService.warn('Steam Update Service already connected or connecting');
      return;
    }

    this.isConnecting = true;
    this.monitoringEnabled = true;

    // Clear any existing reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    try {
      await this.loggingService.info('Connecting to Steam for update monitoring (anonymous)...');

      // Create a promise that resolves when connection is established
      const connectionPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.isConnecting = false;
          reject(new Error('Steam connection timeout'));
        }, 30000); // 30 second timeout

        const onLoggedOn = () => {
          clearTimeout(timeout);
          this.steamUser.off('loggedOn', onLoggedOn);
          this.steamUser.off('error', onError);
          resolve();
        };

        const onError = (error: Error) => {
          clearTimeout(timeout);
          this.steamUser.off('loggedOn', onLoggedOn);
          this.steamUser.off('error', onError);
          this.isConnecting = false;
          reject(error);
        };

        this.steamUser.once('loggedOn', onLoggedOn);
        this.steamUser.once('error', onError);
      });

      // Login anonymously - no credentials required
      this.steamUser.logOn({
        anonymous: true
      });

      // Wait for connection to be established
      await connectionPromise;

    } catch (error) {
      this.isConnecting = false;
      await this.loggingService.error(`Failed to connect to Steam: ${error}`);
      throw error;
    }
  }

  /**
   * Disconnects from Steam and stops monitoring
   */
  public async disconnect(): Promise<void> {
    this.monitoringEnabled = false;

    // Clear reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.isConnected) {
      await this.loggingService.info('Disconnecting Steam Update Service...');
      this.steamUser.logOff();
    }

    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Manually checks for updates to Schedule I
   *
   * @returns Promise resolving to update information
   */
  public async checkForUpdates(): Promise<SteamUpdateInfo> {
    if (!this.isConnected) {
      throw new Error('Steam Update Service not connected');
    }

    return new Promise((resolve, reject) => {
      this.steamUser.getProductInfo([this.SCHEDULE_I_APP_ID], [], false, (err: Error | null, apps: any) => {
        if (err) {
          reject(new Error(`Failed to check for updates: ${err.message}`));
          return;
        }

        const scheduleIData = apps[this.SCHEDULE_I_APP_ID];
        if (!scheduleIData) {
          reject(new Error('Schedule I data not found'));
          return;
        }

        const lastKnown = this.lastKnownChangenumbers.get('main') || 0;
        const updateAvailable = scheduleIData.changenumber > lastKnown;

        const updateInfo: SteamUpdateInfo = {
          appId: this.SCHEDULE_I_APP_ID,
          changenumber: scheduleIData.changenumber,
          updateAvailable: updateAvailable,
          lastChecked: new Date()
        };

        // Update stored changenumber
        if (updateAvailable) {
          this.lastKnownChangenumbers.set('main', scheduleIData.changenumber);
        }

        this.emit('update-checked', updateInfo);
        resolve(updateInfo);
      });
    });
  }

  /**
   * Retrieve the current build ID for a specific branch via Steam (node-steam-user)
   * @param branchKey Steam branch key (e.g., 'public', 'beta', 'alternate', 'alternate-beta')
   */
  public async getBranchBuildId(branchKey: string): Promise<string | null> {
    if (!this.isConnected) {
      throw new Error('Steam Update Service not connected');
    }

    return new Promise((resolve, reject) => {
      this.steamUser.getProductInfo([this.SCHEDULE_I_APP_ID], [], false, (err: Error | null, apps: any) => {
        if (err) {
          reject(new Error(`Failed to get product info: ${err.message}`));
          return;
        }

        const app = apps[this.SCHEDULE_I_APP_ID];
        if (!app || !app.appinfo) {
          resolve(null);
          return;
        }
        const branches = app.appinfo?.depots?.branches || {};
        const info = branches[branchKey];
        const buildId = info?.buildid ? String(info.buildid) : null;
        resolve(buildId);
      });
    });
  }

  /**
   * Retrieve all known branch build IDs (cached version)
   * This method uses the cache to avoid repeated API calls
   */
  public async getAllBranchBuildIds(): Promise<Record<string, string>> {
    try {
      
      // Temporary bypass for testing - remove this after confirming fix works
      const BYPASS_CACHE = process.env.NODE_ENV === 'development' && process.env.BYPASS_STEAM_CACHE === 'true';
      if (BYPASS_CACHE) {
        return await this.fetchAllBranchBuildIdsFromSteam();
      }
      
      // Check if we're already in a cache update to prevent infinite loops
      if (this.gameInfoCache && this.gameInfoCache.getCacheStats().isUpdating) {
        await this.loggingService.debug('Cache update in progress, using direct Steam API call');
        return await this.fetchAllBranchBuildIdsFromSteam();
      }

      // Use the cache to get branch build IDs
      const cachedBuildIds = await this.gameInfoCache.getBranchBuildIds();
      
      // If cache has data, return it
      if (Object.keys(cachedBuildIds).length > 0) {
        await this.loggingService.debug(`Returning cached branch build IDs: ${Object.keys(cachedBuildIds).join(', ')}`);
        return cachedBuildIds;
      }

      // If cache is empty, fetch fresh data
      await this.loggingService.debug('Cache empty, fetching fresh branch build IDs from Steam');
      return await this.fetchAllBranchBuildIdsFromSteam();
    } catch (error) {
      console.error('[SteamUpdateService] Error in getAllBranchBuildIds:', error);
      await this.loggingService.error(`Failed to get branch build IDs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {};
    }
  }

  /**
   * Fetch all branch build IDs directly from Steam (uncached)
   * This is the original implementation that makes direct API calls
   */
  public async fetchAllBranchBuildIdsFromSteam(): Promise<Record<string, string>> {
    if (!this.isConnected) {
      throw new Error('Steam Update Service not connected');
    }
    return new Promise((resolve, reject) => {
      this.steamUser.getProductInfo([this.SCHEDULE_I_APP_ID], [], false, (err: Error | null, apps: any) => {
        if (err) {
          reject(new Error(`Failed to get product info: ${err.message}`));
          return;
        }
        const app = apps[this.SCHEDULE_I_APP_ID];
        const out: Record<string, string> = {};
        const branches = app?.appinfo?.depots?.branches || {};
        for (const k of Object.keys(branches)) {
          const id = branches[k]?.buildid;
          if (id != null) out[k] = String(id);
        }
        resolve(out);
      });
    });
  }


  /**
   * Get depot IDs and manifest IDs for a specific build ID
   * @param buildId The build ID to get depot information for
   * @returns Promise resolving to array of depot information
   */
  public async getDepotManifestsForBuild(buildId: string): Promise<DepotInfo[]> {
    if (!this.isConnected) {
      throw new Error('Steam Update Service not connected');
    }

    return new Promise((resolve, reject) => {
      this.steamUser.getProductInfo([this.SCHEDULE_I_APP_ID], [], false, (err: Error | null, apps: any) => {
        if (err) {
          reject(new Error(`Failed to get product info: ${err.message}`));
          return;
        }

        const app = apps[this.SCHEDULE_I_APP_ID];
        if (!app || !app.appinfo) {
          reject(new Error('Schedule I app info not found'));
          return;
        }

        const depots: DepotInfo[] = [];
        const appDepots = app.appinfo.depots || {};
        const branches = app.appinfo.depots?.branches || {};

        // Find the branch KEY that matches the build ID
        let targetBranchKey: string | null = null;
        for (const [branchKey, branchInfo] of Object.entries(branches)) {
          if (branchInfo && typeof branchInfo === 'object' && 'buildid' in branchInfo && String(branchInfo.buildid) === buildId) {
            targetBranchKey = branchKey;
            break;
          }
        }

        if (!targetBranchKey) {
          reject(new Error(`Build ID ${buildId} not found in any branch`));
          return;
        }

        // Now, iterate through the app's depots and find the manifest for the target branch
        for (const [depotId, depotData] of Object.entries(appDepots)) {
          if (depotData && typeof depotData === 'object' && 'manifests' in depotData) {
            const manifestData = (depotData as any).manifests[targetBranchKey];
            if (manifestData && manifestData.gid) {
              depots.push({
                depotId: depotId,
                manifestId: String(manifestData.gid),
                name: `Depot ${depotId}`, // Name is not readily available here
                size: manifestData.size || 0
              });
            }
          }
        }

        if (depots.length === 0) {
          this.loggingService.warn(`No depot manifest information (gid) found for build ID ${buildId} in branch ${targetBranchKey}`);
        }

        resolve(depots);
      });
    });
  }

  /**
   * Get depot information for a specific branch and build
   * @param branchKey Steam branch key (e.g., 'public', 'beta')
   * @param buildId Optional build ID, if not provided gets current build
   * @returns Promise resolving to array of depot information
   */
  public async getDepotManifestsForBranch(branchKey: string, buildId?: string): Promise<DepotInfo[]> {
    if (!this.isConnected) {
      throw new Error('Steam Update Service not connected');
    }

    return new Promise((resolve, reject) => {
      this.steamUser.getProductInfo([this.SCHEDULE_I_APP_ID], [], false, (err: Error | null, apps: any) => {
        if (err) {
          reject(new Error(`Failed to get product info: ${err.message}`));
          return;
        }

        const app = apps[this.SCHEDULE_I_APP_ID];
        if (!app || !app.appinfo) {
          reject(new Error('Schedule I app info not found'));
          return;
        }

        const branches = app.appinfo.depots?.branches || {};
        const branchInfo = branches[branchKey];
        const appDepots = app.appinfo.depots || {};

        // Debug logging to help understand available branches

        if (!branchInfo) {
          const availableBranches = Object.keys(branches);
          reject(new Error(`Branch ${branchKey} not found. Available branches: ${availableBranches.join(', ')}`));
          return;
        }

        // Debug logging for depot structure

        // If buildId is provided, verify it matches the branch
        if (buildId && String(branchInfo.buildid) !== buildId) {
          reject(new Error(`Build ID ${buildId} does not match branch ${branchKey} (current: ${branchInfo.buildid})`));
          return;
        }

        const depots: DepotInfo[] = [];

        // Look for manifest information in the app's depots, not in branch depots
        for (const [depotId, depotData] of Object.entries(appDepots)) {
          if (depotData && typeof depotData === 'object' && 'manifests' in depotData) {
            const manifestData = (depotData as any).manifests[branchKey];
            if (manifestData && manifestData.gid) {
              depots.push({
                depotId: depotId,
                manifestId: String(manifestData.gid),
                name: `Depot ${depotId}`, // Name is not readily available here
                size: manifestData.size || 0
              });
            }
          }
        }

        if (depots.length === 0) {
          reject(new Error(`No depot information found for branch ${branchKey}`));
          return;
        }

        resolve(depots);
      });
    });
  }

  /**
   * Gets the current connection status
   *
   * @returns True if connected to Steam
   */
  public isConnectedToSteam(): boolean {
    return this.isConnected;
  }

  /**
   * Gets the last known changenumber for a branch
   *
   * @param branchName Branch name (defaults to 'main')
   * @returns Last known changenumber
   */
  public getLastKnownChangenumber(branchName: string = 'main'): number {
    return this.lastKnownChangenumbers.get(branchName) || 0;
  }

  /**
   * Get recent builds for a specific branch using PICS cache
   * 
   * Note: Steam's PICS system provides limited historical data. This method
   * attempts to retrieve recent build information, but Steam may not provide
   * extensive build history for all branches. The method will return whatever
   * historical data is available from the PICS cache.
   *
   * @param branchKey Steam branch key (e.g., 'public', 'beta')
   * @param maxCount Maximum number of recent builds to return (1-50)
   * @returns Promise resolving to recent builds result
   */
  public async getRecentBuildsForBranch(branchKey: string, maxCount: number = 10): Promise<RecentBuildsResult> {
    if (!this.isConnected) {
      throw new Error('Steam Update Service not connected');
    }

    // Validate maxCount parameter
    const clampedMaxCount = Math.max(1, Math.min(50, maxCount));

    return new Promise((resolve, reject) => {
      // First, try to get product info with access tokens for more detailed data
      this.steamUser.getProductAccessToken([this.SCHEDULE_I_APP_ID], [], (tokenErr: Error | null, appTokens: any) => {
        if (tokenErr) {
          this.loggingService.warn(`Failed to get access tokens, proceeding without: ${tokenErr.message}`);
        }

        // Use access tokens if available
        const appsToRequest = tokenErr || !appTokens || !appTokens[this.SCHEDULE_I_APP_ID] 
          ? [this.SCHEDULE_I_APP_ID] 
          : [{ appid: this.SCHEDULE_I_APP_ID, access_token: appTokens[this.SCHEDULE_I_APP_ID] }];

        this.steamUser.getProductInfo(appsToRequest, [], true, async (err: Error | null, apps: any) => {
          if (err) {
            reject(new Error(`Failed to get product info: ${err.message}`));
            return;
          }

          const app = apps[this.SCHEDULE_I_APP_ID];
          if (!app || !app.appinfo) {
            reject(new Error('Schedule I app info not found'));
            return;
          }

          const branches = app.appinfo.depots?.branches || {};
          const branchInfo = branches[branchKey];

          // Debug logging for branch information
          this.loggingService.debug(`=== Branch Debug Info for ${branchKey} ===`);
          this.loggingService.debug(`Available branches: ${Object.keys(branches).join(', ')}`);
          this.loggingService.debug(`Branch info for ${branchKey}: ${JSON.stringify(branchInfo, null, 2)}`);
          this.loggingService.debug(`App changenumber: ${app.changenumber}`);
          this.loggingService.debug(`App info structure: ${JSON.stringify(app.appinfo, null, 2)}`);

          if (!branchInfo) {
            reject(new Error(`Branch ${branchKey} not found`));
            return;
          }

          // Get current build information with proper validation
          const rawBuildId = branchInfo.buildid;
          this.loggingService.debug(`Raw buildid for ${branchKey}: ${rawBuildId} (type: ${typeof rawBuildId})`);

          if (rawBuildId === undefined || rawBuildId === null) {
            this.loggingService.warn(`Branch ${branchKey} has no buildid - this may cause issues`);
          }

          const currentBuildId = rawBuildId !== undefined && rawBuildId !== null ? String(rawBuildId) : 'unknown';
          const currentChangenumber = app.changenumber || 0;
          const currentTimeUpdated = Math.floor(Date.now() / 1000);

          // Get depot manifests for the current build
          let depots: DepotInfo[] = [];
          let primaryManifestId: string | undefined;
          if (currentBuildId !== 'unknown') {
            try {
              depots = await this.getDepotManifestsForBuild(currentBuildId);
              // Find primary manifest ID (assuming depot 3164501 is the main one)
              primaryManifestId = depots.find(d => d.depotId === '3164501')?.manifestId;
              if (!primaryManifestId && depots.length > 0) {
                primaryManifestId = depots[0].manifestId;
              }
            } catch (depotError) {
              this.loggingService.warn(`Could not fetch depot manifests for build ${currentBuildId}: ${depotError}`);
            }
          }

          // Create the current build info
          const currentBuild: RecentBuildInfo = {
            buildId: currentBuildId,
            manifestId: primaryManifestId,
            changenumber: currentChangenumber,
            timeUpdated: currentTimeUpdated,
            description: `Current build for ${branchKey} branch`,
            isCurrent: true,
            depots: depots
          };

          // Debug logging for PICS cache
          this.loggingService.debug(`=== PICS Cache Debug Info ===`);
          this.loggingService.debug(`PICS cache exists: ${!!this.steamUser.picsCache}`);
          if (this.steamUser.picsCache) {
            this.loggingService.debug(`PICS cache changenumber: ${this.steamUser.picsCache.changenumber}`);
            this.loggingService.debug(`PICS cache apps: ${Object.keys(this.steamUser.picsCache.apps || {}).join(', ')}`);
            if (this.steamUser.picsCache.apps && this.steamUser.picsCache.apps[this.SCHEDULE_I_APP_ID]) {
              const cachedApp = this.steamUser.picsCache.apps[this.SCHEDULE_I_APP_ID];
              this.loggingService.debug(`Cached app data: ${JSON.stringify(cachedApp, null, 2)}`);
            }
          }

          // Add current build to cache
          this.addBuildToHistory(branchKey, currentBuild);

          let builds: RecentBuildInfo[] = [currentBuild];

          // Ensure current build is marked as current and is first
          builds.forEach(build => build.isCurrent = build.buildId === currentBuildId);
          builds.sort((a, b) => {
            if (a.isCurrent) return -1;
            if (b.isCurrent) return 1;
            return b.timeUpdated - a.timeUpdated;
          });
          
          // Debug logging for final result
          this.loggingService.debug(`=== Final Builds Result ===`);
          this.loggingService.debug(`Total builds found: ${builds.length}`);
          this.loggingService.debug(`Builds: ${JSON.stringify(builds, null, 2)}`);
          this.loggingService.debug(`History available: ${builds.length > 1}`);

          const result: RecentBuildsResult = {
            success: true,
            builds: builds.slice(0, clampedMaxCount),
            historyAvailable: builds.length > 1, // True if we have more than just current build
            maxCount: clampedMaxCount,
            actualCount: builds.length
          };

          resolve(result);
        });
      });
    });
  }

  /**
   * Sets the last known changenumber for a branch
   *
   * @param branchName Branch name
   * @param changenumber Changenumber to store
   */
  public setLastKnownChangenumber(branchName: string, changenumber: number): void {
    this.lastKnownChangenumbers.set(branchName, changenumber);
  }

  /**
   * Adds a build to the local history cache
   *
   * @param branchKey Branch key
   * @param buildInfo Build information to cache
   */
  private addBuildToHistory(branchKey: string, buildInfo: RecentBuildInfo): void {
    if (!this.buildHistoryCache.has(branchKey)) {
      this.buildHistoryCache.set(branchKey, []);
    }

    const history = this.buildHistoryCache.get(branchKey)!;
    
    // Check if this build already exists
    const existingIndex = history.findIndex(build => build.buildId === buildInfo.buildId);
    if (existingIndex >= 0) {
      // Update existing build
      history[existingIndex] = buildInfo;
    } else {
      // Add new build
      history.push(buildInfo);
    }

    // Sort by timeUpdated (newest first) and limit cache size
    history.sort((a, b) => b.timeUpdated - a.timeUpdated);
    if (history.length > this.MAX_CACHED_BUILDS) {
      history.splice(this.MAX_CACHED_BUILDS);
    }

    this.loggingService.debug(`Cached build ${buildInfo.buildId} (manifest: ${buildInfo.manifestId || 'N/A'}) for branch ${branchKey}. Total cached builds: ${history.length}`);
  }

  /**
   * Gets cached build history for a branch
   *
   * @param branchKey Branch key
   * @returns Array of cached builds
   */
  private getCachedBuildHistory(branchKey: string): RecentBuildInfo[] {
    return this.buildHistoryCache.get(branchKey) || [];
  }

  

  /**
   * Gets cache statistics for monitoring
   *
   * @returns Cache statistics object
   */
  public getCacheStats(): any {
    return this.gameInfoCache.getCacheStats();
  }

  /**
   * Manually invalidates the Steam game info cache
   */
  public invalidateGameInfoCache(): void {
    this.gameInfoCache.invalidateCache();
  }

  /**
   * Cleanup resources and disconnect
   */
  public async dispose(): Promise<void> {
    await this.disconnect();
    this.removeAllListeners();

    if (this.steamUser) {
      this.steamUser.removeAllListeners();
    }

    // Dispose of cache
    this.gameInfoCache.dispose();
  }
}

// Export types for use in other modules
export { SteamUser };
