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

  /**
   * Initializes the Steam Update Service
   *
   * @param loggingService Logging service instance
   * @param options Steam connection options
   */
  constructor(loggingService: LoggingService, options?: Partial<SteamConnectionOptions>) {
    super();

    this.loggingService = loggingService;
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

      // Login anonymously - no credentials required
      this.steamUser.logOn({
        anonymous: true
      });

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
   * Retrieve all known branch build IDs
   */
  public async getAllBranchBuildIds(): Promise<Record<string, string>> {
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
   * Sets the last known changenumber for a branch
   *
   * @param branchName Branch name
   * @param changenumber Changenumber to store
   */
  public setLastKnownChangenumber(branchName: string, changenumber: number): void {
    this.lastKnownChangenumbers.set(branchName, changenumber);
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
  }
}

// Export types for use in other modules
export { SteamUser };
