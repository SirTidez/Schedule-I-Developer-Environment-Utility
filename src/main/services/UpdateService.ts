/**
 * Update Service for Schedule I Developer Environment Utility
 * 
 * Handles application update checking by fetching release information from GitHub.
 * Provides version comparison, release note formatting, and caching functionality
 * to minimize API calls and improve performance.
 * 
 * Key features:
 * - GitHub API integration for release checking
 * - Semantic version comparison
 * - Release note formatting and cleanup
 * - Update caching with 1-hour validity for latest release info
 * - Always fresh current version detection (never cached)
 * - Support for pre-release versions
 * - Fallback version detection from package.json
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as fs from 'fs';
import * as path from 'path';
import { LoggingService } from './LoggingService';
import { UpdateCacheService } from './UpdateCacheService';

/**
 * Interface representing a GitHub release
 * 
 * Contains all relevant information about a GitHub release including
 * version tag, name, description, publication date, and download assets.
 */
export interface GitHubRelease {
  /** Release tag (e.g., "v1.0.0", "beta") */
  tag_name: string;
  /** Release name/title */
  name: string;
  /** Release description/body */
  body: string;
  /** Publication date in ISO format */
  published_at: string;
  /** URL to the release page */
  html_url: string;
  /** Array of downloadable assets */
  assets: Array<{
    /** Asset filename */
    name: string;
    /** Direct download URL */
    browser_download_url: string;
    /** File size in bytes */
    size: number;
  }>;
}

/**
 * Interface representing update information
 * 
 * Contains the result of an update check including whether an update
 * is available, current and latest versions, and release details.
 */
export interface UpdateInfo {
  /** Whether an update is available */
  hasUpdate: boolean;
  /** Current application version */
  currentVersion: string;
  /** Latest available version */
  latestVersion: string;
  /** GitHub release information (only if update available) */
  release?: GitHubRelease;
}

/**
 * Interface representing download progress information
 */
export interface DownloadProgress {
  /** Download progress percentage (0-100) */
  percent: number;
  /** Bytes transferred */
  transferred: number;
  /** Total bytes to download */
  total: number;
  /** Download speed in bytes per second */
  bytesPerSecond: number;
}

/**
 * Interface representing update status
 */
export interface UpdateStatus {
  /** Current status of the update process */
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  /** Error message if status is 'error' */
  error?: string;
  /** Download progress if status is 'downloading' */
  progress?: DownloadProgress;
  /** Update information if available */
  updateInfo?: UpdateInfo;
}

/**
 * Update Service class for managing application updates
 * 
 * Provides comprehensive update checking functionality with caching,
 * version comparison, and release information management.
 * Now includes electron-updater integration for automatic updates.
 */
export class UpdateService {
  /** GitHub repository identifier */
  private readonly GITHUB_REPO = 'SirTidez/Schedule-I-Developer-Environment-Utility';
  
  /** GitHub API URL for releases */
  private readonly GITHUB_API_URL = `https://api.github.com/repos/${this.GITHUB_REPO}/releases`;
  
  /** Logging service instance */
  private readonly loggingService: LoggingService;
  
  /** Update cache service instance */
  private readonly cacheService: UpdateCacheService;

  /** Current update status */
  private currentStatus: UpdateStatus = { status: 'not-available' };

  /** Event listeners for update events */
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(loggingService: LoggingService, configDir: string) {
    this.loggingService = loggingService;
    this.cacheService = new UpdateCacheService(loggingService, configDir);
    
    // Configure autoUpdater
    this.configureAutoUpdater();
  }

  /**
   * Configure autoUpdater settings
   */
  private configureAutoUpdater(): void {
    // Disable auto-download to give user control
    autoUpdater.autoDownload = false;
    
    // Disable auto-install to give user control
    autoUpdater.autoInstallOnAppQuit = false;

    // Set up event listeners
    autoUpdater.on('checking-for-update', () => {
      this.loggingService.info('Checking for update...');
      this.updateStatus({ status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      this.loggingService.info(`Update available: ${info.version}`);
      this.updateStatus({ 
        status: 'available',
        updateInfo: {
          hasUpdate: true,
          currentVersion: this.getCurrentVersion(),
          latestVersion: info.version,
          release: {
            tag_name: info.version,
            name: info.releaseName || info.version,
            body: Array.isArray(info.releaseNotes) ? info.releaseNotes.join('\n') : (info.releaseNotes || ''),
            published_at: new Date().toISOString(),
            html_url: `https://github.com/${this.GITHUB_REPO}/releases/tag/${info.version}`,
            assets: []
          }
        }
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      this.loggingService.info(`Update not available. Current version: ${info.version}`);
      this.updateStatus({ 
        status: 'not-available',
        updateInfo: {
          hasUpdate: false,
          currentVersion: this.getCurrentVersion(),
          latestVersion: info.version
        }
      });
    });

    autoUpdater.on('error', (err) => {
      this.loggingService.error('Auto-updater error:', err);
      this.updateStatus({ 
        status: 'error',
        error: err.message
      });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const progress: DownloadProgress = {
        percent: Math.round(progressObj.percent),
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond
      };
      
      this.loggingService.info(`Download progress: ${progress.percent}%`);
      this.updateStatus({ 
        status: 'downloading',
        progress
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.loggingService.info(`Update downloaded: ${info.version}`);
      this.updateStatus({ status: 'downloaded' });
    });
  }

  /**
   * Update the current status and notify listeners
   */
  private updateStatus(status: Partial<UpdateStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...status };
    this.emit('status-changed', this.currentStatus);
  }

  /**
   * Add event listener
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  /**
   * Get the current application version from package.json
   */
  getCurrentVersion(): string {
    let version = app.getVersion();
    this.loggingService.info(`App version from app.getVersion(): "${version}"`);

    const isPackaged = app.isPackaged;
    const electronVersion = (process.versions && process.versions.electron) || '';
    const looksLikeElectronVersion = version === electronVersion;

    // Helper to read version from a package.json path
    const readVersionFrom = (pkgPath: string): string | null => {
      try {
        if (fs.existsSync(pkgPath)) {
          const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
          const pkg = JSON.parse(pkgRaw);
          if (pkg && typeof pkg.version === 'string' && pkg.version.trim()) {
            this.loggingService.info(`Using package.json version from ${pkgPath}: "${pkg.version}"`);
            return pkg.version.trim();
          }
        }
      } catch (err) {
        this.loggingService.error(`Failed reading version from ${pkgPath}`, err as Error);
      }
      return null;
    };

    // In dev, or if Electron version leaked, prefer the application's package.json
    if (!isPackaged || looksLikeElectronVersion || !version || version.trim() === '') {
      // 1) app.getAppPath()/package.json
      const fromAppPath = readVersionFrom(path.resolve(app.getAppPath(), 'package.json'));
      if (fromAppPath) return fromAppPath;

      // 2) repo root relative to compiled file (dist/main/services -> ../../../)
      const fromRoot = readVersionFrom(path.resolve(__dirname, '../../../package.json'));
      if (fromRoot) return fromRoot;

      // 3) current working directory (when launched from project root)
      const fromCwd = readVersionFrom(path.resolve(process.cwd(), 'package.json'));
      if (fromCwd) return fromCwd;

      // 4) Walk up a few levels from __dirname to find package.json
      let walkDir = __dirname;
      for (let i = 0; i < 5; i++) {
        const candidate = path.resolve(walkDir, 'package.json');
        const v = readVersionFrom(candidate);
        if (v) return v;
        walkDir = path.resolve(walkDir, '..');
      }

      this.loggingService.warn('Could not determine app version from package.json; falling back.');
    }

    // Packaged builds or as a last resort, trust app.getVersion if present
    if (version && version.trim()) return version.trim();
    return '1.0.0';
  }

  /**
   * Fetch the latest release from GitHub (including pre-releases)
   */
  async fetchLatestRelease(): Promise<GitHubRelease | null> {
    try {
      this.loggingService.info(`Fetching all releases from GitHub: ${this.GITHUB_API_URL}`);
      
      const response = await fetch(this.GITHUB_API_URL, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Schedule-I-Developer-Environment-Utility'
        }
      });

      this.loggingService.info(`GitHub API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        this.loggingService.error(`GitHub API error response: ${errorText}`);
        throw new Error(`GitHub API responded with status: ${response.status} - ${errorText}`);
      }

      const releases: GitHubRelease[] = await response.json();
      this.loggingService.info(`Fetched ${releases.length} releases from GitHub`);
      
      if (releases.length === 0) {
        this.loggingService.warn('No releases found in repository');
        return null;
      }

      // Sort releases by published date (most recent first)
      releases.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
      
      const latestRelease = releases[0];
      this.loggingService.info(`Latest release: ${latestRelease.tag_name} - ${latestRelease.name} (published: ${latestRelease.published_at})`);
      this.loggingService.info(`Release URL: ${latestRelease.html_url}`);
      
      return latestRelease;
    } catch (error) {
      this.loggingService.error('Failed to fetch latest release:', error as Error);
      return null;
    }
  }

  /**
   * Compare version strings (semantic versioning)
   * Returns: -1 if current < latest, 0 if equal, 1 if current > latest
   */
  compareVersions(current: string, latest: string): number {
    this.loggingService.info(`Comparing versions: "${current}" vs "${latest}"`);
    
    // Handle special case where latest is just "beta" - extract version from release name
    let latestVersion = latest;
    if (latest === 'beta') {
      // For beta tag, we'll need to extract version from the release name
      // This will be handled in the checkForUpdates method
      this.loggingService.info('Latest release is beta tag, will extract version from release name');
      return -1; // Assume beta is newer than current stable version
    }
    
    // Remove 'v' prefix if present
    const currentVersion = current.replace(/^v/, '');
    latestVersion = latestVersion.replace(/^v/, '');

    // Handle pre-release versions (e.g., 1.0.1-beta, 1.0.1-BETA)
    const currentClean = currentVersion.split('-')[0];
    const latestClean = latestVersion.split('-')[0];

    const currentParts = currentClean.split('.').map(Number);
    const latestParts = latestClean.split('.').map(Number);

    // Ensure both arrays have the same length
    const maxLength = Math.max(currentParts.length, latestParts.length);
    while (currentParts.length < maxLength) currentParts.push(0);
    while (latestParts.length < maxLength) latestParts.push(0);

    for (let i = 0; i < maxLength; i++) {
      if (currentParts[i] < latestParts[i]) {
        this.loggingService.info(`Version comparison result: ${current} < ${latest}`);
        return -1;
      }
      if (currentParts[i] > latestParts[i]) {
        this.loggingService.info(`Version comparison result: ${current} > ${latest}`);
        return 1;
      }
    }

    this.loggingService.info(`Version comparison result: ${current} = ${latest}`);
    return 0;
  }

  /**
   * Get current update status
   */
  getCurrentStatus(): UpdateStatus {
    return this.currentStatus;
  }

  /**
   * Check for updates using autoUpdater
   */
  async checkForUpdatesAutoUpdater(): Promise<void> {
    try {
      this.loggingService.info('Checking for updates using autoUpdater...');
      await autoUpdater.checkForUpdates();
    } catch (error) {
      this.loggingService.error('Failed to check for updates:', error as Error);
      this.updateStatus({ 
        status: 'error',
        error: (error as Error).message
      });
    }
  }

  /**
   * Download the available update
   */
  async downloadUpdate(): Promise<void> {
    try {
      this.loggingService.info('Starting update download...');
      await autoUpdater.downloadUpdate();
    } catch (error) {
      this.loggingService.error('Failed to download update:', error as Error);
      this.updateStatus({ 
        status: 'error',
        error: (error as Error).message
      });
    }
  }

  /**
   * Install the downloaded update and restart the application
   */
  async installUpdate(): Promise<void> {
    try {
      this.loggingService.info('Installing update and restarting...');
      autoUpdater.quitAndInstall();
    } catch (error) {
      this.loggingService.error('Failed to install update:', error as Error);
      this.updateStatus({ 
        status: 'error',
        error: (error as Error).message
      });
    }
  }

  /**
   * Check if there's an update available (with caching)
   * 
   * Always gets the current version fresh from the application, but caches
   * the latest release information for up to 1 hour to reduce API calls.
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    // Always get current version fresh - never cache this
    const currentVersion = this.getCurrentVersion();
    this.loggingService.info(`Checking for updates. Current version: ${currentVersion}`);

    // Check if we have valid cached data for latest release info
    if (this.cacheService.isCacheValid()) {
      this.loggingService.info('Using cached latest release info');
      const cachedData = this.cacheService.loadCachedUpdateInfo();
      if (cachedData) {
        // Always use fresh current version, but cached latest version
        const comparison = this.compareVersions(currentVersion, cachedData.updateInfo.latestVersion);
        const hasUpdate = comparison < 0;

        this.loggingService.info(`Version comparison (cached): ${currentVersion} vs ${cachedData.updateInfo.latestVersion} (${comparison < 0 ? 'update available' : 'up to date'})`);

        return {
          hasUpdate,
          currentVersion, // Always fresh
          latestVersion: cachedData.updateInfo.latestVersion,
          release: hasUpdate ? cachedData.release : undefined
        };
      }
    }

    this.loggingService.info('Cache invalid or missing, fetching from GitHub API');

    const latestRelease = await this.fetchLatestRelease();
    
    if (!latestRelease) {
      this.loggingService.warn('Could not fetch latest release');
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion
      };
    }

    // Extract version from release name if tag is "beta"
    let latestVersion = latestRelease.tag_name;
    if (latestRelease.tag_name === 'beta') {
      // Extract version from release name (e.g., "1.0.1 BETA Release" -> "1.0.1")
      const versionMatch = latestRelease.name.match(/(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        latestVersion = versionMatch[1];
        this.loggingService.info(`Extracted version from beta release name: ${latestVersion}`);
      } else {
        this.loggingService.warn('Could not extract version from beta release name');
        latestVersion = '1.0.1'; // Fallback
      }
    }

    const comparison = this.compareVersions(currentVersion, latestVersion);
    const hasUpdate = comparison < 0;

    this.loggingService.info(`Version comparison: ${currentVersion} vs ${latestVersion} (${comparison < 0 ? 'update available' : 'up to date'})`);

    const updateInfo: UpdateInfo = {
      hasUpdate,
      currentVersion, // Always fresh
      latestVersion: latestVersion,
      release: hasUpdate ? latestRelease : undefined
    };

    // Cache the latest release info (but not current version)
    this.cacheService.saveUpdateInfo(updateInfo, latestRelease);

    return updateInfo;
  }

  /**
   * Format release notes for display
   */
  formatReleaseNotes(release: GitHubRelease): string {
    if (!release.body) {
      return 'No release notes available.';
    }

    // Clean up the release notes
    let notes = release.body
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/#{1,6}\s*/g, '') // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
      .trim();

    // Limit length and add ellipsis if needed
    const maxLength = 500;
    if (notes.length > maxLength) {
      notes = notes.substring(0, maxLength) + '...';
    }

    return notes || 'No release notes available.';
  }
}
