/**
 * Steam Update IPC Handlers for Schedule I Developer Environment Utility
 *
 * Provides IPC communication layer between the renderer process and the Steam Update Service.
 * Handles real-time Steam update monitoring, manual update checking, and notification management
 * through secure Electron IPC channels.
 *
 * Key features:
 * - Start/stop Steam update monitoring
 * - Manual update checking
 * - Real-time update notifications via IPC events
 * - Connection status management
 * - Configuration management for Steam settings
 * - Integration with existing configuration service
 *
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import { ipcMain, BrowserWindow } from 'electron';
import { SteamUpdateService, SteamUpdateInfo } from '../services/SteamUpdateService';
import { LoggingService } from '../services/LoggingService';
import { ConfigService } from '../services/ConfigService';
import { SteamUpdateSettings, SteamConnectionSettings, SteamUpdateNotification } from '../../shared/types';

/**
 * Steam Update Handler class for managing IPC communication
 *
 * Provides a bridge between the renderer process and Steam Update Service,
 * handling all Steam-related update operations and real-time notifications.
 */
class SteamUpdateHandlers {
  private steamUpdateService: SteamUpdateService | null = null;
  private loggingService: LoggingService;
  private configService: ConfigService;
  private isInitialized = false;

  constructor(loggingService: LoggingService, configService: ConfigService) {
    this.loggingService = loggingService;
    this.configService = configService;
  }

  /**
   * Initializes the Steam Update Service with configuration
   */
  private async initializeSteamService(): Promise<void> {
    if (this.isInitialized && this.steamUpdateService) {
      return;
    }

    const config = this.configService.getConfig();
    const connectionSettings: SteamConnectionSettings = {
      useAnonymousLogin: true,
      enablePicsCache: true,
      changelistUpdateInterval: 60000, // 1 minute
      autoReconnect: true,
      maxReconnectAttempts: 10,
      ...config.steamConnectionSettings
    };

    this.steamUpdateService = new SteamUpdateService(this.loggingService, connectionSettings);
    this.setupServiceEventHandlers();
    this.isInitialized = true;

    await this.loggingService.info('Steam Update Service initialized');
  }

  /**
   * Sets up event handlers for Steam Update Service events
   */
  private setupServiceEventHandlers(): void {
    if (!this.steamUpdateService) return;

    // Forward Steam events to renderer via IPC
    this.steamUpdateService.on('connected', () => {
      this.sendToRenderer('steam-update:connected');
    });

    this.steamUpdateService.on('disconnected', (error?: Error) => {
      this.sendToRenderer('steam-update:disconnected', { error: error?.message });
    });

    this.steamUpdateService.on('update-available', (updateInfo: SteamUpdateInfo) => {
      this.sendToRenderer('steam-update:update-available', updateInfo);
      this.handleUpdateAvailable(updateInfo);
    });

    this.steamUpdateService.on('update-checked', (updateInfo: SteamUpdateInfo) => {
      this.sendToRenderer('steam-update:update-checked', updateInfo);
    });

    this.steamUpdateService.on('error', (error: Error) => {
      this.sendToRenderer('steam-update:error', { error: error.message });
    });

    this.steamUpdateService.on('ownership-cached', () => {
      this.sendToRenderer('steam-update:ownership-cached');
    });
  }

  /**
   * Handles update available events
   */
  private async handleUpdateAvailable(updateInfo: SteamUpdateInfo): Promise<void> {
    // Store the new changenumber in config
    const config = this.configService.getConfig();
    const changenumbers = config.lastKnownChangenumbers || {};
    const branchName = updateInfo.branchName || 'main';

    changenumbers[branchName] = updateInfo.changenumber;

    this.configService.updateConfig({
      lastKnownChangenumbers: changenumbers
    });

    await this.loggingService.info(`Update available for Schedule I: changenumber ${updateInfo.changenumber}`);
  }

  /**
   * Sends IPC message to renderer process
   */
  private sendToRenderer(channel: string, data?: any): void {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * Registers all IPC handlers for Steam update operations
   */
  public setupHandlers(): void {
    // Start Steam update monitoring
    ipcMain.handle('steam-update:start-monitoring', async () => {
      try {
        await this.initializeSteamService();

        if (!this.steamUpdateService) {
          throw new Error('Failed to initialize Steam Update Service');
        }

        await this.steamUpdateService.connect();

        return { success: true };
      } catch (error) {
        await this.loggingService.error(`Failed to start Steam update monitoring: ${error}`);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Stop Steam update monitoring
    ipcMain.handle('steam-update:stop-monitoring', async () => {
      try {
        if (this.steamUpdateService) {
          await this.steamUpdateService.disconnect();
        }

        return { success: true };
      } catch (error) {
        await this.loggingService.error(`Failed to stop Steam update monitoring: ${error}`);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Check for updates manually
    ipcMain.handle('steam-update:check-updates', async () => {
      try {
        await this.initializeSteamService();

        if (!this.steamUpdateService) {
          throw new Error('Steam Update Service not initialized');
        }

        if (!this.steamUpdateService.isConnectedToSteam()) {
          await this.steamUpdateService.connect();

          // Wait a moment for connection to establish
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const updateInfo = await this.steamUpdateService.checkForUpdates();

        return { success: true, updateInfo };
      } catch (error) {
        await this.loggingService.error(`Failed to check for updates: ${error}`);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Get connection status
    ipcMain.handle('steam-update:get-status', async () => {
      try {
        const isConnected = this.steamUpdateService?.isConnectedToSteam() || false;
        const isInitialized = this.isInitialized;

        return {
          success: true,
          status: {
            connected: isConnected,
            initialized: isInitialized
          }
        };
      } catch (error) {
        await this.loggingService.error(`Failed to get Steam update status: ${error}`);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Get Steam update settings
    ipcMain.handle('steam-update:get-settings', async () => {
      try {
        const config = this.configService.getConfig();
        const defaultSettings: SteamUpdateSettings = {
          enableRealTimeUpdates: true,
          updateCheckInterval: 30, // 30 minutes
          showUpdateNotifications: true,
          autoCheckOnStartup: true,
          monitorAllBranches: false
        };

        return {
          success: true,
          settings: { ...defaultSettings, ...config.steamUpdateSettings }
        };
      } catch (error) {
        await this.loggingService.error(`Failed to get Steam update settings: ${error}`);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Update Steam update settings
    ipcMain.handle('steam-update:update-settings', async (event, settings: Partial<SteamUpdateSettings>) => {
      try {
        const config = this.configService.getConfig();
        const updatedSettings = { ...config.steamUpdateSettings, ...settings };

        this.configService.updateConfig({
          steamUpdateSettings: updatedSettings as SteamUpdateSettings
        });

        // If real-time updates were disabled, stop monitoring
        if (settings.enableRealTimeUpdates === false && this.steamUpdateService) {
          await this.steamUpdateService.disconnect();
        }

        // If real-time updates were enabled, start monitoring
        if (settings.enableRealTimeUpdates === true && this.steamUpdateService && !this.steamUpdateService.isConnectedToSteam()) {
          await this.steamUpdateService.connect();
        }

        return { success: true, settings: updatedSettings };
      } catch (error) {
        await this.loggingService.error(`Failed to update Steam settings: ${error}`);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Get last known changenumber for a branch
    ipcMain.handle('steam-update:get-changenumber', async (event, branchName: string = 'main') => {
      try {
        const config = this.configService.getConfig();
        const changenumber = config.lastKnownChangenumbers?.[branchName] || 0;

        return { success: true, changenumber };
      } catch (error) {
        await this.loggingService.error(`Failed to get changenumber: ${error}`);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Set last known changenumber for a branch
    ipcMain.handle('steam-update:set-changenumber', async (event, branchName: string, changenumber: number) => {
      try {
        const config = this.configService.getConfig();
        const changenumbers = config.lastKnownChangenumbers || {};
        changenumbers[branchName] = changenumber;

        this.configService.updateConfig({
          lastKnownChangenumbers: changenumbers
        });

        // Update service if available
        if (this.steamUpdateService) {
          this.steamUpdateService.setLastKnownChangenumber(branchName, changenumber);
        }

        return { success: true };
      } catch (error) {
        await this.loggingService.error(`Failed to set changenumber: ${error}`);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Initialize with startup check if enabled
    ipcMain.handle('steam-update:initialize', async () => {
      try {
        const config = this.configService.getConfig();
        const settings = config.steamUpdateSettings;

        if (settings?.autoCheckOnStartup || settings?.enableRealTimeUpdates) {
          await this.initializeSteamService();

          if (settings.enableRealTimeUpdates && this.steamUpdateService) {
            await this.steamUpdateService.connect();
          } else if (settings.autoCheckOnStartup && this.steamUpdateService) {
            // Perform a one-time check without persistent connection
            await this.steamUpdateService.connect();
            setTimeout(() => {
              this.steamUpdateService?.checkForUpdates().catch(err => {
                this.loggingService.error(`Startup update check failed: ${err.message}`);
              });
            }, 3000); // Wait 3 seconds for connection
          }
        }

        return { success: true };
      } catch (error) {
        await this.loggingService.error(`Failed to initialize Steam updates: ${error}`);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    this.loggingService.info('Steam Update IPC handlers registered successfully');
  }

  /**
   * Cleanup method for service disposal
   */
  public async dispose(): Promise<void> {
    if (this.steamUpdateService) {
      await this.steamUpdateService.dispose();
      this.steamUpdateService = null;
    }
    this.isInitialized = false;
  }
}

// Global instance
let steamUpdateHandlers: SteamUpdateHandlers | null = null;

/**
 * Sets up Steam update IPC handlers
 *
 * @param loggingService Logging service instance
 * @param configService Configuration service instance
 */
export function setupSteamUpdateHandlers(loggingService: LoggingService, configService: ConfigService): void {
  steamUpdateHandlers = new SteamUpdateHandlers(loggingService, configService);
  steamUpdateHandlers.setupHandlers();
}

/**
 * Cleanup function for Steam update handlers
 */
export async function disposeSteamUpdateHandlers(): Promise<void> {
  if (steamUpdateHandlers) {
    await steamUpdateHandlers.dispose();
    steamUpdateHandlers = null;
  }
}