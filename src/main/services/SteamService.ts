/**
 * Steam Service for Schedule I Developer Environment Utility
 * 
 * Handles all Steam-related operations including library detection, app manifest parsing,
 * branch detection, and game management. This service provides the core functionality
 * for detecting Steam installations and managing Schedule I game branches.
 * 
 * Key features:
 * - Automatic Steam library detection across multiple drives
 * - App manifest parsing for build information
 * - Branch detection and verification
 * - Cross-platform Steam installation detection
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as vdf from 'vdf';
import { AppManifest, InstalledDepotInfo } from '../../shared/types';

// AppManifest interface is now imported from shared/types

/**
 * Steam Service class for managing Steam-related operations
 * 
 * Provides comprehensive functionality for detecting Steam installations,
 * parsing app manifests, and managing game branches for Schedule I.
 */
export class SteamService {
  /** Array of detected Steam library paths */
  private steamPaths: string[] = [];
  
  /** Schedule I Steam App ID - constant identifier for the game */
  private static readonly SCHEDULE_I_APP_ID = '3164500';
  
  /**
   * Detects all Steam library folders on the system
   * 
   * Searches for Steam installations in common locations and reads the libraryfolders.vdf
   * file to discover all Steam library folders, including the default library and any
   * additional libraries on other drives.
   * 
   * @returns Promise<string[]> Array of Steam library paths (steamapps folders)
   * @throws Error if Steam installation cannot be found or accessed
   */
  async detectSteamLibraries(): Promise<string[]> {
    try {
      
      // Find Steam installation path
      const steamInstallPath = await this.findSteamInstallPath();
      if (!steamInstallPath) {
        return [];
      }
      
      
      const libraryPaths: string[] = [];
      const addedPaths = new Set<string>();
      
      // Read libraryfolders.vdf to find all libraries (including default)
      const libraryFoldersPath = path.join(steamInstallPath, 'steamapps', 'libraryfolders.vdf');
      if (await fs.pathExists(libraryFoldersPath)) {
        const content = await fs.readFile(libraryFoldersPath, 'utf-8');
        const allLibraries = this.parseLibraryFolders(content);
        
        // Add the default Steam library first
        const defaultLibrary = path.join(steamInstallPath, 'steamapps');
        if (await fs.pathExists(defaultLibrary)) {
          libraryPaths.push(defaultLibrary);
          addedPaths.add(defaultLibrary.toLowerCase());
        }
        
        // Add additional libraries (avoiding duplicates)
        for (const libPath of allLibraries) {
          const steamAppsPath = path.join(libPath, 'steamapps');
          const normalizedPath = steamAppsPath.toLowerCase();
          
          if (await fs.pathExists(steamAppsPath) && !addedPaths.has(normalizedPath)) {
            libraryPaths.push(steamAppsPath);
            addedPaths.add(normalizedPath);
          }
        }
      } else {
        // Fallback: just add default library if libraryfolders.vdf doesn't exist
        const defaultLibrary = path.join(steamInstallPath, 'steamapps');
        if (await fs.pathExists(defaultLibrary)) {
          libraryPaths.push(defaultLibrary);
        }
      }
      
      this.steamPaths = libraryPaths;
      
      return libraryPaths;
    } catch (error) {
      console.error('Error detecting Steam libraries:', error);
      return [];
    }
  }
  
  /**
   * Finds the Steam installation path on the system
   * 
   * Searches common Steam installation locations including Program Files,
   * Program Files (x86), and LocalAppData. Checks for the presence of
   * steam.exe to confirm a valid Steam installation.
   * 
   * @returns Promise<string | null> Steam installation path or null if not found
   */
  private async findSteamInstallPath(): Promise<string | null> {
    const possiblePaths = [
      path.join(process.env.PROGRAMFILES || '', 'Steam'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Steam'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Steam')
    ];
    
    for (const steamPath of possiblePaths) {
      if (await fs.pathExists(path.join(steamPath, 'steam.exe'))) {
        return steamPath;
      }
    }
    
    return null;
  }
  
  /**
   * Parses Steam libraryfolders.vdf content to extract library paths
   * 
   * Extracts library paths from the VDF (Valve Data Format) file content
   * by searching for "path" entries and extracting the quoted values.
   * 
   * @param content The raw content of the libraryfolders.vdf file
   * @returns string[] Array of library paths
   */
  private parseLibraryFolders(content: string): string[] {
    const libraries: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.includes('"path"')) {
        const pathMatch = line.match(/"path"\s+"([^"]+)"/);
        if (pathMatch && pathMatch[1]) {
          libraries.push(pathMatch[1]);
        }
      }
    }
    
    return libraries;
  }
  
  /**
   * Parses a Steam app manifest file for the specified app ID
   * 
   * Reads and parses the ACF (Application Cache File) manifest for a specific
   * Steam application, extracting build information and metadata.
   * 
   * @param appId The Steam App ID to parse
   * @param libraryPath The Steam library steamapps folder path containing the manifest (must be the steamapps folder, not the library root)
   * @returns Promise<AppManifest> Parsed manifest data
   * @throws Error if manifest file is not found or cannot be read
   */
  async parseAppManifest(appId: string, libraryPath: string): Promise<AppManifest> {
    const manifestPath = path.join(libraryPath, `appmanifest_${appId}.acf`);
    
    if (!await fs.pathExists(manifestPath)) {
      throw new Error(`App manifest not found: ${manifestPath}`);
    }
    
    const content = await fs.readFile(manifestPath, 'utf-8');
    return this.parseACFContent(content);
  }
  
  /**
   * Parses ACF (Application Cache File) content to extract app manifest data
   * 
   * Uses a proper VDF parser to extract build ID, name, state flags, last updated
   * timestamp, and installed depot information from the ACF file content.
   * 
   * @param content The raw ACF file content
   * @returns AppManifest Parsed manifest data with fallback values
   */
  private parseACFContent(content: string): AppManifest {
    try {
      const parsed = vdf.parse(content);
      const data = parsed.AppState ?? parsed;
      
      return {
        buildId: data.buildid ? parseInt(data.buildid) : 0,
        name: data.name || '',
        state: data.StateFlags ? parseInt(data.StateFlags) : 0,
        lastUpdated: data.LastUpdated ? parseInt(data.LastUpdated) : 0,
        installedDepots: this.parseInstalledDepots(data.InstalledDepots)
      };
    } catch (error) {
      console.error('Error parsing ACF content:', error);
      // Fallback to regex parsing for backward compatibility
      return this.parseACFContentRegex(content);
    }
  }

  /**
   * Fallback regex-based ACF parser for backward compatibility
   * 
   * @param content The raw ACF file content
   * @returns AppManifest Parsed manifest data with fallback values
   */
  private parseACFContentRegex(content: string): AppManifest {
    const buildIdMatch = content.match(/"buildid"\s+"(\d+)"/);
    const nameMatch = content.match(/"name"\s+"([^"]+)"/);
    const stateMatch = content.match(/"StateFlags"\s+"(\d+)"/);
    const lastUpdatedMatch = content.match(/"LastUpdated"\s+"(\d+)"/);
    
    // Parse InstalledDepots using regex fallback
    const installedDepots = this.parseInstalledDepotsRegex(content);
    
    return {
      buildId: buildIdMatch ? parseInt(buildIdMatch[1]) : 0,
      name: nameMatch ? nameMatch[1] : '',
      state: stateMatch ? parseInt(stateMatch[1]) : 0,
      lastUpdated: lastUpdatedMatch ? parseInt(lastUpdatedMatch[1]) : 0,
      installedDepots
    };
  }

  /**
   * Fallback regex-based InstalledDepots parser
   * 
   * @param content The raw ACF file content
   * @returns Record<string, InstalledDepotInfo> | undefined Map of depot ID to depot info
   */
  private parseInstalledDepotsRegex(content: string): Record<string, InstalledDepotInfo> | undefined {
    try {
      // Look for InstalledDepots block
      const installedDepotsMatch = content.match(/"InstalledDepots"\s*\{([^}]+)\}/);
      if (!installedDepotsMatch) {
        return undefined;
      }

      const depotsContent = installedDepotsMatch[1];
      const depots: Record<string, InstalledDepotInfo> = {};

      // Find all depot blocks within InstalledDepots
      const depotMatches = depotsContent.match(/"(\d+)"\s*\{([^}]+)\}/g);
      if (!depotMatches) {
        return undefined;
      }

      for (const depotMatch of depotMatches) {
        const depotIdMatch = depotMatch.match(/"(\d+)"/);
        if (!depotIdMatch) continue;

        const depotId = depotIdMatch[1];
        const depotContent = depotMatch;

        // Extract manifest ID from depot content
        const manifestMatch = depotContent.match(/"manifest"\s+"([^"]+)"/);
        const sizeMatch = depotContent.match(/"size"\s+"(\d+)"/);
        const lastUpdatedMatch = depotContent.match(/"lastupdated"\s+"(\d+)"/);

        depots[depotId] = {
          depotId: depotId,
          manifestId: manifestMatch ? manifestMatch[1] : '',
          size: sizeMatch ? parseInt(sizeMatch[1]) : undefined,
          lastUpdated: lastUpdatedMatch ? parseInt(lastUpdatedMatch[1]) : undefined
        };
      }

      return Object.keys(depots).length > 0 ? depots : undefined;
    } catch (error) {
      console.error('Error parsing InstalledDepots with regex:', error);
      return undefined;
    }
  }


  /**
   * Parses the InstalledDepots section to extract manifest IDs
   * 
   * @param installedDepotsData The InstalledDepots section from VDF
   * @returns Record<string, InstalledDepotInfo> Map of depot ID to depot info
   */
  private parseInstalledDepots(installedDepotsData: any): Record<string, InstalledDepotInfo> | undefined {
    if (!installedDepotsData || typeof installedDepotsData !== 'object') {
      return undefined;
    }

    const depots: Record<string, InstalledDepotInfo> = {};
    
    for (const [depotId, depotData] of Object.entries(installedDepotsData)) {
      if (typeof depotData === 'object' && depotData !== null) {
        const depotInfo = depotData as any;
        depots[depotId] = {
          depotId: depotId,
          manifestId: depotInfo.manifest || '',
          size: depotInfo.size ? parseInt(depotInfo.size) : undefined,
          lastUpdated: depotInfo.lastupdated ? parseInt(depotInfo.lastupdated) : undefined
        };
      }
    }
    
    return Object.keys(depots).length > 0 ? depots : undefined;
  }

  /**
   * Gets the primary manifest ID from installed depots
   * 
   * @param manifest The app manifest containing installed depots
   * @returns string | null The primary manifest ID or null if not found
   */
  getPrimaryManifestId(manifest: AppManifest): string | null {
    if (!manifest.installedDepots) {
      return null;
    }

    // Get priority depots from config or use defaults
    const priorityDepots = this.getPriorityDepots();
    
    for (const depotId of priorityDepots) {
      const depot = manifest.installedDepots[depotId];
      if (depot && depot.manifestId) {
        return depot.manifestId;
      }
    }
    
    // Fallback to first available manifest ID
    for (const depot of Object.values(manifest.installedDepots)) {
      if (depot.manifestId) {
        return depot.manifestId;
      }
    }
    
    return null;
  }

  /**
   * Gets the priority depot IDs for manifest selection
   * 
   * @returns string[] Array of depot IDs in priority order
   */
  private getPriorityDepots(): string[] {
    // Default priority order for depot IDs (main executable depot first)
    const defaultPriorityDepots = ['3164501', '3164500', '3164502'];
    
    // TODO: In the future, this could be made configurable via ConfigService
    // For now, return the default priority order
    return defaultPriorityDepots;
  }

  /**
   * Gets all installed manifest IDs from a manifest
   * 
   * @param manifest The app manifest containing installed depots
   * @returns string[] Array of manifest IDs
   */
  getInstalledManifestIds(manifest: AppManifest): string[] {
    if (!manifest.installedDepots) {
      return [];
    }

    return Object.values(manifest.installedDepots)
      .map(depot => depot.manifestId)
      .filter(manifestId => manifestId && manifestId.length > 0);
  }
  
  async getSteamLibraries(): Promise<string[]> {
    return this.steamPaths;
  }
  
  getScheduleIAppId(): string {
    return SteamService.SCHEDULE_I_APP_ID;
  }
  
  async detectInstalledBranch(libraryPath: string): Promise<string | null> {
    try {
      
      const scheduleIAppId = SteamService.SCHEDULE_I_APP_ID;
      
      // libraryPath should already be the steamapps path, so we don't need to add 'steamapps' again
      const manifestPath = path.join(libraryPath, `appmanifest_${scheduleIAppId}.acf`);
      
      
      if (!await fs.pathExists(manifestPath)) {
        return null;
      }
      
      const content = await fs.readFile(manifestPath, 'utf-8');
      const branch = this.parseBranchFromManifest(content);
      
      return branch;
    } catch (error) {
      console.error('Error detecting installed branch:', error);
      return null;
    }
  }

  async detectCurrentSteamBranchKey(libraryPath: string): Promise<string | null> {
    try {
      
      const scheduleIAppId = SteamService.SCHEDULE_I_APP_ID;
      
      // libraryPath should already be the steamapps path, so we don't need to add 'steamapps' again
      const manifestPath = path.join(libraryPath, `appmanifest_${scheduleIAppId}.acf`);
      
      
      if (!await fs.pathExists(manifestPath)) {
        return null;
      }
      
      const content = await fs.readFile(manifestPath, 'utf-8');
      const steamBranchKey = this.parseSteamBranchKey(content);
      
      return steamBranchKey;
    } catch (error) {
      console.error('Error detecting Steam branch key:', error);
      return null;
    }
  }
  
  private parseBranchFromManifest(content: string): string | null {
    try {
      // Look for betakey in the manifest (case-insensitive)
      const betaKeyMatch = content.match(/"betakey"\s+"([^"]*)"/i);
      
      if (betaKeyMatch) {
        const betaKey = betaKeyMatch[1]?.trim() || '';
        return this.mapBetaKeyToBranch(betaKey);
      }
      
      // No betakey found, default to main branch
      return 'main-branch';
    } catch (error) {
      console.error('Error parsing branch from manifest:', error);
      return null;
    }
  }

  private parseSteamBranchKey(content: string): string | null {
    try {
      // Look for betakey in the manifest (case-insensitive)
      const betaKeyMatch = content.match(/"betakey"\s+"([^"]*)"/i);
      
      if (betaKeyMatch) {
        const betaKey = betaKeyMatch[1]?.trim() || '';
        return this.mapBetaKeyToSteamKey(betaKey);
      }
      
      // No betakey found, default to public branch
      return 'public';
    } catch (error) {
      console.error('Error parsing Steam branch key from manifest:', error);
      return null;
    }
  }

  private mapBetaKeyToSteamKey(betaKey: string): string {
    switch (betaKey.toLowerCase()) {
      case 'beta':
        return 'beta';
      case 'alternate':
        return 'alternate';
      case 'alternate-beta':
      case 'alternatebeta':
        return 'alternate-beta';
      case 'public':
      case 'default':
      case 'main':
      case 'stable':
      case 'release':
      case '':
      default:
        return 'public';
    }
  }
  
  private mapBetaKeyToBranch(betaKey: string): string {
    switch (betaKey.toLowerCase()) {
      case 'beta':
        return 'beta-branch';
      case 'alternate':
        return 'alternate-branch';
      case 'alternate-beta':
      case 'alternatebeta':
        return 'alternate-beta-branch';
      case 'public':
      case 'default':
      case 'main':
      case 'stable':
      case 'release':
      case '':
      default:
        return 'main-branch';
    }
  }
  
  async findScheduleIInLibraries(): Promise<string | null> {
    try {
      
      const libraries = await this.detectSteamLibraries();
      if (libraries.length === 0) {
        return null;
      }
      
      for (const libraryPath of libraries) {
        
        // Check if Schedule I manifest exists in this library
        // libraryPath is already the steamapps path, so we don't need to add 'steamapps' again
        const manifestPath = path.join(libraryPath, `appmanifest_${SteamService.SCHEDULE_I_APP_ID}.acf`);
        
        
        if (await fs.pathExists(manifestPath)) {
          return libraryPath;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error searching for Schedule I:', error);
      return null;
    }
  }
  
  async getSteamGamesFromLibrary(libraryPath: string): Promise<any[]> {
    try {
      const games: any[] = [];
      
      if (!await fs.pathExists(libraryPath)) {
        return games;
      }
      
      const manifestFiles = await fs.readdir(libraryPath);
      const appManifestFiles = manifestFiles.filter(file => file.startsWith('appmanifest_') && file.endsWith('.acf'));
      
      
      for (const manifestFile of appManifestFiles) {
        try {
          const manifestPath = path.join(libraryPath, manifestFile);
          const content = await fs.readFile(manifestPath, 'utf-8');
          const gameInfo = this.parseAppManifestContent(content);
          
          if (gameInfo) {
            games.push({
              ...gameInfo,
              libraryPath: libraryPath,
              manifestPath: manifestPath
            });
          }
        } catch (error) {
          console.warn(`Error parsing manifest ${manifestFile}:`, error);
        }
      }
      
      return games;
    } catch (error) {
      console.error('Error getting Steam games from library:', error);
      return [];
    }
  }
  
  private parseAppManifestContent(content: string): any | null {
    try {
      const appIdMatch = content.match(/"appid"\s+"(\d+)"/);
      const nameMatch = content.match(/"name"\s+"([^"]+)"/);
      const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/);
      
      if (appIdMatch && nameMatch && installDirMatch) {
        return {
          appId: appIdMatch[1],
          name: nameMatch[1],
          installDir: installDirMatch[1]
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing app manifest content:', error);
      return null;
    }
  }
  
  async verifyBranchInstalled(libraryPath: string, expectedBranch: string): Promise<boolean> {
    try {
      
      const currentSteamBranchKey = await this.detectCurrentSteamBranchKey(libraryPath);
      const isCorrect = currentSteamBranchKey === expectedBranch;
      
      
      return isCorrect;
    } catch (error) {
      console.error('Error verifying branch installation:', error);
      return false;
    }
  }
  
  async waitForBranchChange(libraryPath: string, expectedBranch: string, maxWaitTime: number = 300000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds
    
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const currentSteamBranchKey = await this.detectCurrentSteamBranchKey(libraryPath);
        
        if (currentSteamBranchKey === expectedBranch) {
          return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } catch (error) {
        console.error('Error checking branch during wait:', error);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }
    
    return false;
  }

  async getBranchBuildId(libraryPath: string, branchName: string): Promise<string> {
    try {
      // libraryPath already contains steamapps, so we don't need to add it again
      const manifestPath = path.join(libraryPath, `appmanifest_${SteamService.SCHEDULE_I_APP_ID}.acf`);
      
      if (!await fs.pathExists(manifestPath)) {
        return '';
      }
      
      // Read and parse the manifest directly
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest = this.parseACFContent(content);
      return manifest.buildId.toString();
    } catch (error) {
      console.error(`Failed to get build ID for branch ${branchName}:`, error);
      return '';
    }
  }

  async getCurrentSteamBuildId(libraryPath: string): Promise<string> {
    try {
      // Get the currently installed branch's build ID from Steam
      const manifestPath = path.join(libraryPath, `appmanifest_${SteamService.SCHEDULE_I_APP_ID}.acf`);
      
      if (!await fs.pathExists(manifestPath)) {
        return '';
      }
      
      // Read and parse the manifest directly
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest = this.parseACFContent(content);
      return manifest.buildId.toString();
    } catch (error) {
      console.error(`Failed to get current Steam build ID:`, error);
      return '';
    }
  }
}
