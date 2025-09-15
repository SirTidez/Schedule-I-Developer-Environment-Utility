export interface BranchBuildInfo {
  buildId: string;
  updatedTime: string; // ISO string format
  sizeBytes?: number; // Optional size in bytes
  downloadDate?: string; // ISO string format when downloaded
  isActive?: boolean; // Whether this is the currently active build
}

export interface InstalledDepotInfo {
  depotId: string;
  manifestId: string;
  size?: number; // Size in bytes
  lastUpdated?: number; // Unix timestamp
}

export interface BranchVersionInfo {
  buildId?: string; // Build ID for Steam copy installations
  manifestId?: string; // Manifest ID for DepotDownloader installations
  downloadDate: string; // ISO string format
  sizeBytes?: number; // Size in bytes
  isActive: boolean; // Whether this is the currently active build
  path: string; // Full path to the version directory
}

export type VersionIdentifier = string; // Can be either buildId or manifestId

export interface DevEnvironmentConfig {
  steamLibraryPath: string;
  gameInstallPath: string;
  managedEnvironmentPath: string;
  selectedBranches: string[];
  installedBranch: string | null;
  branchBuildIds: Record<string, BranchBuildInfo>; // Legacy - kept for migration
  branchVersions: Record<string, Record<string, BranchVersionInfo>>; // New multi-version structure
  branchManifestVersions?: Record<string, Record<string, BranchVersionInfo>>; // Manifest ID based versions
  userAddedVersions: Record<string, any[]>; // User-added versions by branch key
  activeBuildPerBranch: Record<string, string>; // Maps branch name to active build ID
  activeManifestPerBranch?: Record<string, string>; // Maps branch name to active manifest ID
  maxRecentBuilds: number; // Number of recent builds to show (default: 10)
  customLaunchCommands: Record<string, string>;
  lastUpdated: string; // ISO string format
  configVersion: string;
  // DepotDownloader integration settings (migrated from SteamCMD)
  useDepotDownloader: boolean; // renamed from useSteamCMD
  depotDownloaderPath: string | null; // renamed from steamCMDPath
  // Enhanced settings for DepotDownloader
  depotDownloaderMaxDownloads?: number; // parallel download threads (default: 8)
  depotDownloaderRememberPassword?: boolean; // use -remember-password flag (default: true)
  // Post-download actions
  autoInstallMelonLoader?: boolean; // Auto-install MelonLoader after downloads (default: true)
  autoInstallPromptShown?: boolean; // Whether user has been prompted in setup (default: false)
  // Steam Update Service settings
  steamUpdateSettings?: SteamUpdateSettings;
  lastKnownChangenumbers?: Record<string, number>; // branch name -> changenumber
  steamConnectionSettings?: SteamConnectionSettings;
  // Logging and system preferences
  logRetentionCount?: number; // max number of .log files to keep in managed logs
  diskSpaceThresholdGB?: number; // warn/prevent if below this free space
}

export interface AppManifest {
  buildId: number;
  name: string;
  state: number;
  lastUpdated: number;
  installedDepots?: Record<string, InstalledDepotInfo>; // Maps depot ID to depot info
}

export interface BranchInfo {
  name: string;
  path: string;
  buildId: number;
  lastUpdated: number;
  isInstalled: boolean;
  isAvailable: boolean;
  size?: string;
  needsUpdate?: boolean;
  steamBranchKey?: string;
  // Multi-version support
  availableVersions: Array<{buildId: string, date: string, sizeBytes?: number}>; // Available from Steam
  activeVersion: string; // Currently active build ID
  installedVersions: number; // Count of installed versions
}

export interface SteamGameInfo {
  appId: string;
  name: string;
  installDir: string;
  libraryPath: string;
  manifest: AppManifest;
}

export interface FileOperationProgress {
  currentFile: string;
  completedFiles: number;
  totalFiles: number;
  progress: number;
}

export interface SteamUpdateSettings {
  enableRealTimeUpdates: boolean; // Enable background Steam monitoring
  updateCheckInterval: number; // Minutes between manual checks (fallback)
  showUpdateNotifications: boolean; // Show UI notifications for updates
  autoCheckOnStartup: boolean; // Check for updates when app starts
  monitorAllBranches: boolean; // Monitor all branches vs just current
}

export interface SteamConnectionSettings {
  useAnonymousLogin: boolean; // Use anonymous Steam login (default: true)
  enablePicsCache: boolean; // Enable PICS cache for efficiency (default: true)
  changelistUpdateInterval: number; // Milliseconds between Steam API polls (default: 60000)
  dataDirectory?: string; // Custom data directory for Steam cache
  autoReconnect: boolean; // Automatically reconnect on disconnection (default: true)
  maxReconnectAttempts: number; // Maximum reconnection attempts (default: 10)
}

export interface SteamUpdateInfo {
  appId: number; // Steam AppID (3164500 for Schedule I)
  changenumber: number; // Steam changenumber for this update
  branchName?: string; // Branch name if available
  buildId?: string; // Build ID if available
  updateAvailable: boolean; // Whether update is newer than stored
  lastChecked: Date; // When this check occurred
  previousChangenumber?: number; // Previous changenumber for comparison
}

export interface SteamUpdateNotification {
  id: string; // Unique notification ID
  type: 'update-available' | 'update-checked' | 'connection-error';
  title: string; // Notification title
  message: string; // Notification message
  updateInfo?: SteamUpdateInfo; // Associated update information
  timestamp: Date; // When notification was created
  dismissed?: boolean; // Whether user has dismissed notification
}

export interface DepotInfo {
  depotId: string; // Steam depot ID
  manifestId: string; // Manifest ID for this depot
  name?: string; // Human-readable depot name
  size?: number; // Depot size in bytes
}

export interface RecentBuildInfo {
  buildId: string; // Steam build ID
  manifestId?: string; // Primary manifest ID for the build
  changenumber: number; // Steam changenumber
  timeUpdated: number; // Unix timestamp when build was updated
  description?: string; // Build description if available
  isCurrent: boolean; // Whether this is the current build for the branch
  depots?: DepotInfo[]; // Depot and manifest info for the build
}

export interface RecentBuildsResult {
  success: boolean; // Whether the operation was successful
  builds?: RecentBuildInfo[]; // Array of recent builds
  error?: string; // Error message if operation failed
  historyAvailable: boolean; // Whether build history is available from Steam
  maxCount: number; // Maximum number of builds requested
  actualCount: number; // Actual number of builds returned
}

export interface ManifestInfo {
  manifestId: string;
  buildId: string;
}

export interface DownloadManifestsResult {
  success: boolean; // Whether the operation was successful
  manifests?: Record<string, ManifestInfo>; // Manifest info by branch name
  error?: string; // Error message if operation failed
}