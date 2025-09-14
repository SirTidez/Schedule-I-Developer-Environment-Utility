export interface BranchBuildInfo {
  buildId: string;
  updatedTime: string; // ISO string format
}

export interface DevEnvironmentConfig {
  steamLibraryPath: string;
  gameInstallPath: string;
  managedEnvironmentPath: string;
  selectedBranches: string[];
  installedBranch: string | null;
  branchBuildIds: Record<string, BranchBuildInfo>;
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
