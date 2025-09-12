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
  // SteamCMD integration settings
  useSteamCMD: boolean;
  steamCMDPath: string | null;
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
