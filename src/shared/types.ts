/**
 * Shared Type Definitions for Schedule I Developer Environment Utility
 * 
 * Contains all TypeScript interfaces and types used across the main process,
 * renderer process, and shared utilities. These types ensure type safety
 * and consistency throughout the application.
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.2.0
 */

/**
 * Information about a specific build of a branch
 * 
 * Contains metadata about a particular build including its ID, update time,
 * size, and download information. Used for tracking multiple builds per branch.
 * 
 * @interface BranchBuildInfo
 */
export interface BranchBuildInfo {
  /** Unique build identifier from Steam */
  buildId: string;
  /** ISO string format timestamp of when the build was last updated */
  updatedTime: string;
  /** Optional size of the build in bytes */
  sizeBytes?: number;
  /** Optional ISO string format timestamp of when the build was downloaded */
  downloadDate?: string;
  /** Whether this is the currently active build for the branch */
  isActive?: boolean;
}

/**
 * Information about an installed depot
 * 
 * Contains metadata about a specific depot installation including its ID,
 * manifest ID, size, and last update timestamp. Used for DepotDownloader operations.
 * 
 * @interface InstalledDepotInfo
 */
export interface InstalledDepotInfo {
  /** Unique depot identifier */
  depotId: string;
  /** Manifest ID for the depot */
  manifestId: string;
  /** Optional size of the depot in bytes */
  size?: number;
  /** Optional Unix timestamp of when the depot was last updated */
  lastUpdated?: number;
}

/**
 * Information about a specific version of a branch
 * 
 * Contains metadata about a particular version including build ID or manifest ID,
 * download information, and path. Supports both Steam copy and DepotDownloader installations.
 * 
 * @interface BranchVersionInfo
 */
export interface BranchVersionInfo {
  /** Build ID for Steam copy installations */
  buildId?: string;
  /** Manifest ID for DepotDownloader installations */
  manifestId?: string;
  /** ISO string format timestamp of when the version was downloaded */
  downloadDate: string;
  /** Optional size of the version in bytes */
  sizeBytes?: number;
  /** Whether this is the currently active version for the branch */
  isActive: boolean;
  /** Full path to the version directory */
  path: string;
}

/**
 * Type alias for version identifiers
 * 
 * Can be either a build ID (for Steam copy installations) or a manifest ID
 * (for DepotDownloader installations). Used for flexible version identification.
 * 
 * @typedef {string} VersionIdentifier
 */
export type VersionIdentifier = string;

/**
 * Main configuration interface for the development environment
 * 
 * Contains all configuration settings for the Schedule I Developer Environment Utility.
 * Includes Steam library paths, branch management, DepotDownloader settings, and
 * various application preferences. This is the primary configuration object
 * that persists across application sessions.
 * 
 * @interface DevEnvironmentConfig
 */
export interface DevEnvironmentConfig {
  /** Path to the Steam library containing Schedule I */
  steamLibraryPath: string;
  /** Path to the game installation directory */
  gameInstallPath: string;
  /** Path to the managed environment directory for branch installations */
  managedEnvironmentPath: string;
  /** Array of selected branch names for management */
  selectedBranches: string[];
  /** Currently installed branch name (null if none) */
  installedBranch: string | null;
  /** Legacy build ID tracking - kept for migration compatibility */
  branchBuildIds: Record<string, BranchBuildInfo>;
  /** New multi-version structure for branch versions */
  branchVersions: Record<string, Record<string, BranchVersionInfo>>;
  /** Manifest ID based versions for DepotDownloader installations */
  branchManifestVersions?: Record<string, Record<string, BranchVersionInfo>>;
  /** User-added versions by branch key */
  userAddedVersions: Record<string, any[]>;
  /** Maps branch name to active build ID */
  activeBuildPerBranch: Record<string, string>;
  /** Maps branch name to active manifest ID */
  activeManifestPerBranch?: Record<string, string>;
  /** Number of recent builds to show (default: 10) */
  maxRecentBuilds: number;
  /** Custom launch commands for each branch */
  customLaunchCommands: Record<string, string>;
  /** ISO string format timestamp of last configuration update */
  lastUpdated: string;
  /** Configuration version for migration compatibility */
  configVersion: string;
  /** Whether to use DepotDownloader instead of SteamCMD (renamed from useSteamCMD) */
  useDepotDownloader: boolean;
  /** Path to DepotDownloader executable (renamed from steamCMDPath) */
  depotDownloaderPath: string | null;
  /** Parallel download threads for DepotDownloader (default: 8) */
  depotDownloaderMaxDownloads?: number;
  /** Use -remember-password flag for DepotDownloader (default: true) */
  depotDownloaderRememberPassword?: boolean;
  /** Auto-install MelonLoader after downloads (default: true) */
  autoInstallMelonLoader?: boolean;
  autoInstallPromptShown?: boolean; // Whether user has been prompted in setup (default: false)
  // Steam Update Service settings
  steamUpdateSettings?: SteamUpdateSettings;
  lastKnownChangenumbers?: Record<string, number>; // branch name -> changenumber
  steamConnectionSettings?: SteamConnectionSettings;
  // Logging and system preferences
  logRetentionCount?: number; // max number of .log files to keep in managed logs
  diskSpaceThresholdGB?: number; // warn/prevent if below this free space
}

/**
 * Steam app manifest information
 * 
 * Contains information about a Steam application manifest including build ID,
 * name, state, and depot information. Used for parsing Steam app manifests.
 * 
 * @interface AppManifest
 */
export interface AppManifest {
  /** Build ID of the application */
  buildId: number;
  /** Display name of the application */
  name: string;
  /** Current state of the application */
  state: number;
  /** Unix timestamp of last update */
  lastUpdated: number;
  /** Optional mapping of depot ID to depot information */
  installedDepots?: Record<string, InstalledDepotInfo>;
}

/**
 * Information about a game branch
 * 
 * Contains comprehensive information about a specific branch including
 * installation status, available versions, and metadata. Used for
 * branch management and display in the UI.
 * 
 * @interface BranchInfo
 */
export interface BranchInfo {
  /** Name of the branch */
  name: string;
  /** Path to the branch installation */
  path: string;
  /** Build ID of the branch */
  buildId: number;
  /** Unix timestamp of last update */
  lastUpdated: number;
  /** Whether the branch is currently installed */
  isInstalled: boolean;
  /** Whether the branch is available for installation */
  isAvailable: boolean;
  /** Optional human-readable size string */
  size?: string;
  /** Whether the branch needs an update */
  needsUpdate?: boolean;
  /** Optional Steam branch key for API operations */
  steamBranchKey?: string;
  /** Available versions from Steam with metadata */
  availableVersions: Array<{buildId: string, date: string, sizeBytes?: number}>;
  /** Currently active build ID */
  activeVersion: string;
  /** Count of installed versions */
  installedVersions: number;
}

/**
 * Steam game information
 * 
 * Contains information about a Steam game including app ID, name,
 * installation directory, library path, and manifest data.
 * 
 * @interface SteamGameInfo
 */
export interface SteamGameInfo {
  /** Steam app ID */
  appId: string;
  /** Display name of the game */
  name: string;
  /** Installation directory name */
  installDir: string;
  /** Path to the Steam library */
  libraryPath: string;
  /** App manifest information */
  manifest: AppManifest;
}

/**
 * File operation progress information
 * 
 * Contains progress information for file operations including current file,
 * completion status, and progress percentage. Used for progress tracking
 * during file copying and other operations.
 * 
 * @interface FileOperationProgress
 */
export interface FileOperationProgress {
  /** Name of the current file being processed */
  currentFile: string;
  /** Number of files completed */
  completedFiles: number;
  /** Total number of files to process */
  totalFiles: number;
  /** Progress percentage (0-100) */
  progress: number;
}

/**
 * Steam update service settings
 * 
 * Contains configuration settings for the Steam update monitoring service
 * including update intervals, notification preferences, and monitoring scope.
 * 
 * @interface SteamUpdateSettings
 */
export interface SteamUpdateSettings {
  /** Enable background Steam monitoring for real-time updates */
  enableRealTimeUpdates: boolean;
  /** Minutes between manual update checks (fallback) */
  updateCheckInterval: number;
  /** Show UI notifications for available updates */
  showUpdateNotifications: boolean;
  /** Check for updates when application starts */
  autoCheckOnStartup: boolean;
  /** Monitor all branches vs just the current one */
  monitorAllBranches: boolean;
}

/**
 * Steam connection settings
 * 
 * Contains configuration settings for Steam API connections including
 * authentication, caching, and reconnection behavior.
 * 
 * @interface SteamConnectionSettings
 */
export interface SteamConnectionSettings {
  /** Use anonymous Steam login (default: true) */
  useAnonymousLogin: boolean;
  /** Enable PICS cache for efficiency (default: true) */
  enablePicsCache: boolean;
  /** Milliseconds between Steam API polls (default: 60000) */
  changelistUpdateInterval: number;
  /** Optional custom data directory for Steam cache */
  dataDirectory?: string;
  /** Automatically reconnect on disconnection (default: true) */
  autoReconnect: boolean;
  /** Maximum reconnection attempts (default: 10) */
  maxReconnectAttempts: number;
}

/**
 * Steam update information
 * 
 * Contains information about a Steam update including app ID, changenumber,
 * branch details, and update availability status. Used for tracking
 * and displaying update information.
 * 
 * @interface SteamUpdateInfo
 */
export interface SteamUpdateInfo {
  /** Steam AppID (3164500 for Schedule I) */
  appId: number;
  /** Steam changenumber for this update */
  changenumber: number;
  /** Branch name if available */
  branchName?: string;
  /** Build ID if available */
  buildId?: string;
  /** Whether update is newer than stored */
  updateAvailable: boolean;
  /** When this check occurred */
  lastChecked: Date;
  /** Previous changenumber for comparison */
  previousChangenumber?: number;
}

/**
 * Steam update notification
 * 
 * Contains information about a Steam update notification including type,
 * message, and associated update information. Used for displaying
 * notifications to the user.
 * 
 * @interface SteamUpdateNotification
 */
export interface SteamUpdateNotification {
  /** Unique notification ID */
  id: string;
  /** Type of notification */
  type: 'update-available' | 'update-checked' | 'connection-error';
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Associated update information */
  updateInfo?: SteamUpdateInfo;
  /** When notification was created */
  timestamp: Date;
  /** Whether user has dismissed notification */
  dismissed?: boolean;
}

/**
 * Depot information
 * 
 * Contains information about a Steam depot including its ID, manifest ID,
 * name, and size. Used for DepotDownloader operations and depot management.
 * 
 * @interface DepotInfo
 */
export interface DepotInfo {
  /** Steam depot ID */
  depotId: string;
  /** Manifest ID for this depot */
  manifestId: string;
  /** Optional human-readable depot name */
  name?: string;
  /** Optional depot size in bytes */
  size?: number;
}

/**
 * Recent build information
 * 
 * Contains information about a recent build including build ID, manifest ID,
 * changenumber, update time, and depot information. Used for displaying
 * recent builds and build history.
 * 
 * @interface RecentBuildInfo
 */
export interface RecentBuildInfo {
  /** Steam build ID */
  buildId: string;
  /** Optional primary manifest ID for the build */
  manifestId?: string;
  /** Steam changenumber */
  changenumber: number;
  /** Unix timestamp when build was updated */
  timeUpdated: number;
  /** Optional build description if available */
  description?: string;
  /** Whether this is the current build for the branch */
  isCurrent: boolean;
  /** Optional depot and manifest info for the build */
  depots?: DepotInfo[];
}

/**
 * Recent builds query result
 * 
 * Contains the result of a recent builds query including success status,
 * build array, error information, and metadata about the query.
 * 
 * @interface RecentBuildsResult
 */
export interface RecentBuildsResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Optional array of recent builds */
  builds?: RecentBuildInfo[];
  /** Optional error message if operation failed */
  error?: string;
  /** Whether build history is available from Steam */
  historyAvailable: boolean;
  /** Maximum number of builds requested */
  maxCount: number;
  /** Actual number of builds returned */
  actualCount: number;
}

/**
 * Manifest information
 * 
 * Simple interface containing manifest ID and build ID mapping.
 * Used for manifest-based operations and version tracking.
 * 
 * @interface ManifestInfo
 */
export interface ManifestInfo {
  /** Manifest ID */
  manifestId: string;
  /** Associated build ID */
  buildId: string;
}

/**
 * Download manifests result
 * 
 * Contains the result of a download manifests operation including success status,
 * manifest information by branch name, and error information if the operation failed.
 * 
 * @interface DownloadManifestsResult
 */
export interface DownloadManifestsResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Optional manifest info by branch name */
  manifests?: Record<string, ManifestInfo>;
  /** Optional error message if operation failed */
  error?: string;
}