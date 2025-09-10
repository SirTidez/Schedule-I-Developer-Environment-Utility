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
 * - Update caching with 24-hour validity
 * - Support for pre-release versions
 * - Fallback version detection from package.json
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.0
 */

import { app } from 'electron';
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
 * Update Service class for managing application updates
 * 
 * Provides comprehensive update checking functionality with caching,
 * version comparison, and release information management.
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

  constructor(loggingService: LoggingService, configDir: string) {
    this.loggingService = loggingService;
    this.cacheService = new UpdateCacheService(loggingService, configDir);
  }

  /**
   * Get the current application version from package.json
   */
  getCurrentVersion(): string {
    const version = app.getVersion();
    this.loggingService.info(`App version from app.getVersion(): "${version}"`);
    
    // Fallback to package.json version if app.getVersion() is empty
    if (!version || version.trim() === '') {
      try {
        const packageJson = require('../../package.json');
        const fallbackVersion = packageJson.version || '1.0.0';
        this.loggingService.info(`Using fallback version from package.json: "${fallbackVersion}"`);
        return fallbackVersion;
      } catch (error) {
        this.loggingService.error('Failed to read package.json for version fallback:', error as Error);
        return '1.0.0'; // Ultimate fallback
      }
    }
    
    return version;
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
   * Check if there's an update available (with caching)
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    const currentVersion = this.getCurrentVersion();
    this.loggingService.info(`Checking for updates. Current version: ${currentVersion}`);

    // Check if we have valid cached data
    if (this.cacheService.isCacheValid()) {
      this.loggingService.info('Using cached update info');
      const cachedData = this.cacheService.loadCachedUpdateInfo();
      if (cachedData) {
        return cachedData.updateInfo;
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
      currentVersion,
      latestVersion: latestVersion,
      release: hasUpdate ? latestRelease : undefined
    };

    // Cache the result
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
