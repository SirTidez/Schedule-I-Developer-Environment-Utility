import * as fs from 'fs-extra';
import * as path from 'path';

export interface AppManifest {
  buildId: number;
  name: string;
  state: number;
  lastUpdated: number;
}

export class SteamService {
  private steamPaths: string[] = [];
  private static readonly SCHEDULE_I_APP_ID = '3164500'; // Schedule I Steam App ID
  
  async detectSteamLibraries(): Promise<string[]> {
    try {
      console.log('Detecting Steam libraries...');
      
      // Find Steam installation path
      const steamInstallPath = await this.findSteamInstallPath();
      if (!steamInstallPath) {
        console.log('Steam installation not found');
        return [];
      }
      
      console.log(`Found Steam installation at: ${steamInstallPath}`);
      
      const libraryPaths: string[] = [];
      const addedPaths = new Set<string>();
      
      // Read libraryfolders.vdf to find all libraries (including default)
      const libraryFoldersPath = path.join(steamInstallPath, 'steamapps', 'libraryfolders.vdf');
      if (await fs.pathExists(libraryFoldersPath)) {
        console.log(`Reading library folders from: ${libraryFoldersPath}`);
        const content = await fs.readFile(libraryFoldersPath, 'utf-8');
        const allLibraries = this.parseLibraryFolders(content);
        
        // Add the default Steam library first
        const defaultLibrary = path.join(steamInstallPath, 'steamapps');
        if (await fs.pathExists(defaultLibrary)) {
          libraryPaths.push(defaultLibrary);
          addedPaths.add(defaultLibrary.toLowerCase());
          console.log(`Added default library: ${defaultLibrary}`);
        }
        
        // Add additional libraries (avoiding duplicates)
        for (const libPath of allLibraries) {
          const steamAppsPath = path.join(libPath, 'steamapps');
          const normalizedPath = steamAppsPath.toLowerCase();
          
          if (await fs.pathExists(steamAppsPath) && !addedPaths.has(normalizedPath)) {
            libraryPaths.push(steamAppsPath);
            addedPaths.add(normalizedPath);
            console.log(`Added additional library: ${steamAppsPath}`);
          }
        }
      } else {
        // Fallback: just add default library if libraryfolders.vdf doesn't exist
        const defaultLibrary = path.join(steamInstallPath, 'steamapps');
        if (await fs.pathExists(defaultLibrary)) {
          libraryPaths.push(defaultLibrary);
          console.log(`Added default library (no libraryfolders.vdf): ${defaultLibrary}`);
        }
      }
      
      this.steamPaths = libraryPaths;
      console.log(`Found ${libraryPaths.length} Steam libraries total`);
      
      return libraryPaths;
    } catch (error) {
      console.error('Error detecting Steam libraries:', error);
      return [];
    }
  }
  
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
  
  async parseAppManifest(appId: string, libraryPath: string): Promise<AppManifest> {
    const manifestPath = path.join(libraryPath, 'steamapps', `appmanifest_${appId}.acf`);
    
    if (!await fs.pathExists(manifestPath)) {
      throw new Error(`App manifest not found: ${manifestPath}`);
    }
    
    const content = await fs.readFile(manifestPath, 'utf-8');
    return this.parseACFContent(content);
  }
  
  private parseACFContent(content: string): AppManifest {
    // Parse ACF format (similar to original C# implementation)
    const buildIdMatch = content.match(/"buildid"\s+"(\d+)"/);
    const nameMatch = content.match(/"name"\s+"([^"]+)"/);
    const stateMatch = content.match(/"StateFlags"\s+"(\d+)"/);
    const lastUpdatedMatch = content.match(/"LastUpdated"\s+"(\d+)"/);
    
    return {
      buildId: buildIdMatch ? parseInt(buildIdMatch[1]) : 0,
      name: nameMatch ? nameMatch[1] : '',
      state: stateMatch ? parseInt(stateMatch[1]) : 0,
      lastUpdated: lastUpdatedMatch ? parseInt(lastUpdatedMatch[1]) : 0
    };
  }
  
  async getSteamLibraries(): Promise<string[]> {
    return this.steamPaths;
  }
  
  getScheduleIAppId(): string {
    return SteamService.SCHEDULE_I_APP_ID;
  }
  
  async detectInstalledBranch(libraryPath: string): Promise<string | null> {
    try {
      console.log(`Detecting installed branch for library: ${libraryPath}`);
      
      const scheduleIAppId = SteamService.SCHEDULE_I_APP_ID;
      
      // libraryPath should already be the steamapps path, so we don't need to add 'steamapps' again
      const manifestPath = path.join(libraryPath, `appmanifest_${scheduleIAppId}.acf`);
      
      console.log(`Looking for manifest at: ${manifestPath}`);
      
      if (!await fs.pathExists(manifestPath)) {
        console.log(`Manifest not found at: ${manifestPath}`);
        return null;
      }
      
      console.log(`Found manifest, parsing branch...`);
      const content = await fs.readFile(manifestPath, 'utf-8');
      const branch = this.parseBranchFromManifest(content);
      console.log(`Detected branch: ${branch}`);
      
      return branch;
    } catch (error) {
      console.error('Error detecting installed branch:', error);
      return null;
    }
  }

  async detectCurrentSteamBranchKey(libraryPath: string): Promise<string | null> {
    try {
      console.log(`Detecting current Steam branch key for library: ${libraryPath}`);
      
      const scheduleIAppId = SteamService.SCHEDULE_I_APP_ID;
      
      // libraryPath should already be the steamapps path, so we don't need to add 'steamapps' again
      const manifestPath = path.join(libraryPath, `appmanifest_${scheduleIAppId}.acf`);
      
      console.log(`Looking for manifest at: ${manifestPath}`);
      
      if (!await fs.pathExists(manifestPath)) {
        console.log(`Manifest not found at: ${manifestPath}`);
        return null;
      }
      
      console.log(`Found manifest, parsing Steam branch key...`);
      const content = await fs.readFile(manifestPath, 'utf-8');
      const steamBranchKey = this.parseSteamBranchKey(content);
      console.log(`Detected Steam branch key: ${steamBranchKey}`);
      
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
      console.log('Searching for Schedule I in all Steam libraries...');
      
      const libraries = await this.detectSteamLibraries();
      if (libraries.length === 0) {
        console.log('No Steam libraries found');
        return null;
      }
      
      for (const libraryPath of libraries) {
        console.log(`Checking library: ${libraryPath}`);
        
        // Check if Schedule I manifest exists in this library
        // libraryPath is already the steamapps path, so we don't need to add 'steamapps' again
        const manifestPath = path.join(libraryPath, `appmanifest_${SteamService.SCHEDULE_I_APP_ID}.acf`);
        
        console.log(`Looking for Schedule I manifest at: ${manifestPath}`);
        
        if (await fs.pathExists(manifestPath)) {
          console.log(`Found Schedule I in library: ${libraryPath}`);
          return libraryPath;
        }
      }
      
      console.log('Schedule I not found in any Steam library');
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
        console.log(`Library path does not exist: ${libraryPath}`);
        return games;
      }
      
      const manifestFiles = await fs.readdir(libraryPath);
      const appManifestFiles = manifestFiles.filter(file => file.startsWith('appmanifest_') && file.endsWith('.acf'));
      
      console.log(`Found ${appManifestFiles.length} app manifests in ${libraryPath}`);
      
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
      console.log(`Verifying branch ${expectedBranch} is installed in library: ${libraryPath}`);
      
      const currentSteamBranchKey = await this.detectCurrentSteamBranchKey(libraryPath);
      const isCorrect = currentSteamBranchKey === expectedBranch;
      
      console.log(`Expected Steam branch key: ${expectedBranch}, Current Steam branch key: ${currentSteamBranchKey}, Match: ${isCorrect}`);
      
      return isCorrect;
    } catch (error) {
      console.error('Error verifying branch installation:', error);
      return false;
    }
  }
  
  async waitForBranchChange(libraryPath: string, expectedBranch: string, maxWaitTime: number = 300000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds
    
    console.log(`Waiting for branch change to ${expectedBranch} in library: ${libraryPath}`);
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const currentSteamBranchKey = await this.detectCurrentSteamBranchKey(libraryPath);
        
        if (currentSteamBranchKey === expectedBranch) {
          console.log(`Branch successfully changed to ${expectedBranch}`);
          return true;
        }
        
        console.log(`Current Steam branch key: ${currentSteamBranchKey}, waiting for: ${expectedBranch}`);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } catch (error) {
        console.error('Error checking branch during wait:', error);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }
    
    console.log(`Timeout waiting for branch change to ${expectedBranch}`);
    return false;
  }

  async getBranchBuildId(libraryPath: string, branchName: string): Promise<string> {
    try {
      // libraryPath already contains steamapps, so we don't need to add it again
      const manifestPath = path.join(libraryPath, `appmanifest_${SteamService.SCHEDULE_I_APP_ID}.acf`);
      
      if (!await fs.pathExists(manifestPath)) {
        console.log(`Manifest not found for branch ${branchName}: ${manifestPath}`);
        return '';
      }
      
      // Read and parse the manifest directly
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest = this.parseACFContent(content);
      console.log(`Build ID for branch ${branchName}: ${manifest.buildId}`);
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
        console.log(`Steam manifest not found: ${manifestPath}`);
        return '';
      }
      
      // Read and parse the manifest directly
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest = this.parseACFContent(content);
      console.log(`Current Steam build ID: ${manifest.buildId}`);
      return manifest.buildId.toString();
    } catch (error) {
      console.error(`Failed to get current Steam build ID:`, error);
      return '';
    }
  }
}
