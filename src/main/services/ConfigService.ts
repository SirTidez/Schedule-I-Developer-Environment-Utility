/**
 * Configuration Service for Schedule I Developer Environment Utility
 * 
 * Manages application configuration using electron-store for persistence and
 * provides validation, file I/O operations, and path management. Maintains
 * compatibility with the original C# application's configuration format.
 * 
 * Key features:
 * - Persistent configuration storage using electron-store
 * - Configuration validation and error reporting
 * - File-based configuration backup and restore
 * - Path management for managed environments
 * - Build ID tracking for branches
 * - Custom launch command management
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import Store from 'electron-store';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { DevEnvironmentConfig, BranchBuildInfo } from '../../shared/types';

/**
 * Configuration Service class for managing application settings
 * 
 * Provides comprehensive configuration management including storage, validation,
 * and file operations. Uses the same configuration path as the original C# application.
 */
export class ConfigService {
  /** Electron store instance for configuration persistence */
  private store: any;
  
  /** Path to the configuration file */
  private configPath: string;
  
  /** Path to the logs directory */
  private logsPath: string;
  
  /**
   * Initializes the configuration service
   * 
   * Sets up the configuration directory structure, initializes the electron-store
   * with default values, and loads existing configuration from file if available.
   * Uses the same configuration path as the original C# application for compatibility.
   */
  constructor() {
    // Use the same config path as the C# application
    const configDir = path.join(os.homedir(), 'AppData', 'LocalLow', 'TVGS', 'Development Environment Manager');
    this.configPath = path.join(configDir, 'config.json');
    this.logsPath = path.join(configDir, 'logs');
    
    // Ensure config directory exists
    fs.ensureDirSync(configDir);
    fs.ensureDirSync(this.logsPath);
    
    // Initialize with config from file if it exists, otherwise use defaults
    this.store = new Store({
      name: 'config',
      projectName: 'schedule-i-dev-environment',
      defaults: this.getDefaultConfig(),
      cwd: configDir  // Set the working directory to our custom location
    });
    
    // Load existing config from file if it exists
    this.loadConfigFromFile();
  }
  
  /**
   * Gets the default configuration object
   * 
   * Returns a configuration object with default values for all required fields.
   * This ensures the application has valid configuration even on first run.
   * 
   * @returns DevEnvironmentConfig Default configuration object
   */
  private getDefaultConfig(): DevEnvironmentConfig {
    return {
      steamLibraryPath: '',
      gameInstallPath: '',
      managedEnvironmentPath: '',
      selectedBranches: [],
      installedBranch: null,
      branchBuildIds: {},
      customLaunchCommands: {},
      lastUpdated: new Date().toISOString(),
      configVersion: '2.0',
      useSteamCMD: false,
      steamCMDPath: null
    };
  }
  
  /**
   * Gets the current configuration
   * 
   * @returns DevEnvironmentConfig Current configuration object
   */
  getConfig(): DevEnvironmentConfig {
    return this.store.store;
  }
  
  /**
   * Updates the configuration with new values
   * 
   * Merges the provided updates with the current configuration and updates
   * the lastUpdated timestamp. Saves changes to both the store and file.
   * 
   * @param updates Partial configuration object with updates
   */
  updateConfig(updates: Partial<DevEnvironmentConfig>): void {
    const currentConfig = this.getConfig();
    const updatedConfig = {
      ...currentConfig,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    this.store.set(updatedConfig);
    
    // Also save to the actual config file
    this.saveConfigToFile(updatedConfig);
  }
  
  getManagedEnvironmentPath(): string {
    return this.store.get('managedEnvironmentPath', '');
  }
  
  setManagedEnvironmentPath(path: string): void {
    this.store.set('managedEnvironmentPath', path);
  }
  
  getSteamLibraryPath(): string {
    return this.store.get('steamLibraryPath', '');
  }
  
  setSteamLibraryPath(path: string): void {
    this.store.set('steamLibraryPath', path);
  }
  
  getGameInstallPath(): string {
    return this.store.get('gameInstallPath', '');
  }
  
  setGameInstallPath(path: string): void {
    this.store.set('gameInstallPath', path);
  }
  
  getLogsPath(): string {
    return this.logsPath;
  }
  
  getConfigPath(): string {
    return this.configPath;
  }
  
  getConfigDir(): string {
    return path.dirname(this.configPath);
  }
  
  setBuildIdForBranch(branchName: string, buildId: string): void {
    const config = this.getConfig();
    config.branchBuildIds[branchName] = {
      buildId: buildId,
      updatedTime: new Date().toISOString()
    };
    this.updateConfig(config);
  }
  
  getBuildIdForBranch(branchName: string): string {
    const config = this.getConfig();
    return config.branchBuildIds[branchName]?.buildId || '';
  }
  
  setCustomLaunchCommand(branchName: string, command: string): void {
    const config = this.getConfig();
    if (command.trim()) {
      config.customLaunchCommands[branchName] = command.trim();
    } else {
      delete config.customLaunchCommands[branchName];
    }
    this.updateConfig(config);
  }
  
  getCustomLaunchCommand(branchName: string): string {
    const config = this.getConfig();
    return config.customLaunchCommands[branchName] || '';
  }

  getUseSteamCMD(): boolean {
    return this.store.get('useSteamCMD', false);
  }

  setUseSteamCMD(useSteamCMD: boolean): void {
    this.store.set('useSteamCMD', useSteamCMD);
  }

  getSteamCMDPath(): string | null {
    return this.store.get('steamCMDPath', null);
  }

  setSteamCMDPath(path: string | null): void {
    this.store.set('steamCMDPath', path);
  }
  
  validateConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const config = this.getConfig();
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    if (!config.steamLibraryPath || config.steamLibraryPath.trim() === '') {
      errors.push('steamLibraryPath is required');
    }
    
    if (!config.gameInstallPath || config.gameInstallPath.trim() === '') {
      errors.push('gameInstallPath is required');
    }
    
    if (!config.managedEnvironmentPath || config.managedEnvironmentPath.trim() === '') {
      errors.push('managedEnvironmentPath is required');
    }
    
    if (!config.selectedBranches || !Array.isArray(config.selectedBranches)) {
      errors.push('selectedBranches must be an array');
    }
    
    if (!config.configVersion || config.configVersion.trim() === '') {
      errors.push('configVersion is required');
    }
    
    // Check if paths exist
    if (config.steamLibraryPath && !fs.existsSync(config.steamLibraryPath)) {
      warnings.push(`Steam library path does not exist: ${config.steamLibraryPath}`);
    }
    
    if (config.gameInstallPath && !fs.existsSync(config.gameInstallPath)) {
      warnings.push(`Game install path does not exist: ${config.gameInstallPath}`);
    }
    
    if (config.managedEnvironmentPath && !fs.existsSync(config.managedEnvironmentPath)) {
      warnings.push(`Managed environment path does not exist: ${config.managedEnvironmentPath}`);
    }
    
    // Check config version compatibility
    if (config.configVersion && config.configVersion !== '2.0') {
      warnings.push(`Config version ${config.configVersion} may not be fully compatible with current application`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  isConfigFileExists(): boolean {
    return fs.existsSync(this.configPath);
  }
  
  loadConfigFromFile(): DevEnvironmentConfig | null {
    try {
      if (!this.isConfigFileExists()) {
        return null;
      }
      
      const configData = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Ensure all required fields exist with defaults
      const validatedConfig: DevEnvironmentConfig = {
        steamLibraryPath: config.steamLibraryPath || '',
        gameInstallPath: config.gameInstallPath || '',
        managedEnvironmentPath: config.managedEnvironmentPath || '',
        selectedBranches: config.selectedBranches || [],
        installedBranch: config.installedBranch || null,
        branchBuildIds: config.branchBuildIds || {},
        customLaunchCommands: config.customLaunchCommands || {},
        lastUpdated: config.lastUpdated || new Date().toISOString(),
        configVersion: config.configVersion || '2.0',
        useSteamCMD: config.useSteamCMD || false,
        steamCMDPath: config.steamCMDPath || null
      };
      
      // Load the config into the store
      this.store.set(validatedConfig);
      
      return validatedConfig;
    } catch (error) {
      console.error('Failed to load config from file:', error);
      return null;
    }
  }
  
  saveConfigToFile(config: DevEnvironmentConfig): boolean {
    try {
      console.log(`Saving config to: ${this.configPath}`);
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      console.log('Config saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save config to file:', error);
      return false;
    }
  }
}
