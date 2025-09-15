import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigService } from '../../hooks/useConfigService';
import { useFileService } from '../../hooks/useFileService';
import { useSteamService } from '../../hooks/useSteamService';
import { useUpdateService } from '../../hooks/useUpdateService';
import DefaultModsDialog from '../DefaultModsDialog/DefaultModsDialog';
import SettingsDialog from '../Settings/SettingsDialog';
import { UpdateDialog } from '../UpdateDialog/UpdateDialog';
import { VersionManagerDialog } from '../VersionManager/VersionManagerDialog';

interface BranchInfo {
  name: string;
  folderName: string; // The folder name used in the filesystem (e.g., 'main-branch', 'alternate-beta-branch')
  path: string;
  buildId: number | string; // Can be numeric (Steam copy) or timestamp string (DepotDownloader)
  lastUpdated: number;
  isInstalled: boolean;
  needsRepair?: boolean;
  size: string;
  needsUpdate: boolean;
  steamBranchKey: string; // The actual Steam branch key (public, beta, alternative, alternative_beta)
  remoteBuildId?: number;
  // Multi-version support
  availableVersions: Array<{buildId: string, date: string, sizeBytes?: number}>;
  activeVersion: string;
  installedVersions: number;
  // Steam version info
  steamManifestId?: string; // Latest manifest ID from Steam API
}

const ManagedEnvironment: React.FC = () => {
  const navigate = useNavigate();
  const { config, loading: configLoading, loadConfig } = useConfigService();
  const { checkFileExists } = useFileService();
  const { getCurrentSteamBuildId, detectCurrentSteamBranchKey } = useSteamService();
  const { currentVersion, updateInfo, checkForUpdates, isChecking } = useUpdateService();
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installingBranch, setInstallingBranch] = useState<string | null>(null);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDefaultModsDialog, setShowDefaultModsDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [hideUpdateUntilNextRelease, setHideUpdateUntilNextRelease] = useState(false);
  const [hasCheckedForUpdates, setHasCheckedForUpdates] = useState(false);
  const [showVersionManager, setShowVersionManager] = useState(false);
  const [selectedBranchForVersionManager, setSelectedBranchForVersionManager] = useState<BranchInfo | null>(null);
  // Inline Steam login in the Steam Session card (no separate section)
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginStatus, setLoginStatus] = useState<{ loggingIn: boolean; msg: string; err?: string; guard?: 'email'|'mobile'|null }>({ loggingIn: false, msg: '', guard: null });
  const [loginGuardCode, setLoginGuardCode] = useState('');
  const [cachedUser, setCachedUser] = useState<string | null>(null);
  const [ddPercent, setDdPercent] = useState<number>(0);
  const [ddActive, setDdActive] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  const handleCancelDepotDownload = async (branch: BranchInfo) => {
    try {
      const res = await window.electronAPI.depotdownloader.cancel();
      // Best-effort cleanup of partially downloaded directory
      try { await window.electronAPI.file.deleteDirectory(branch.path); } catch {}
      if (!res?.success) {
        console.warn('DepotDownloader cancel reported failure', res?.error);
      }
    } catch (e) {
      console.warn('DepotDownloader cancel threw error', e);
    } finally {
      try { window.electronAPI.removeDepotDownloaderProgressListener(); } catch {}
      setDdActive(false);
      setDdPercent(0);
      setInstallingBranch(null);
      // Refresh branches to reflect state
      try { await loadBranches(); } catch {}
    }
  };

  useEffect(() => {
    if (config) {
      loadBranches();
    }
  }, [config]);

  // Load cached Steam credentials for display
  useEffect(() => {
    (async () => {
      try {
        const res = await window.electronAPI?.credCache?.get?.();
        setCachedUser(res?.success && res.credentials ? res.credentials.username : null);
      } catch {}
    })();
  }, []);

  // Reload configuration when component mounts (e.g., returning from copy process)
  useEffect(() => {
    const reloadConfig = async () => {
      try {
        await loadConfig();
      } catch (err) {
        console.error('Failed to reload config:', err);
      }
    };
    
    reloadConfig();
  }, [loadConfig]);

  // Check for updates on component mount (only once per session)
  useEffect(() => {
    if (hasCheckedForUpdates) return; // Only check once per session
    
    const checkUpdates = async () => {
      try {
        setHasCheckedForUpdates(true);
        const updateResult = await checkForUpdates();
        if (updateResult.hasUpdate && !hideUpdateUntilNextRelease) {
          setShowUpdateDialog(true);
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    checkUpdates();
  }, [checkForUpdates, hideUpdateUntilNextRelease, hasCheckedForUpdates]);

  const loadBranches = async () => {
    if (!config) return;

    setLoading(true);
    setError(null);

    try {
      // Define all possible branches
      const allBranches = [
        { name: 'Main', steamBranchKey: 'public', folderName: 'main-branch' },
        { name: 'Beta', steamBranchKey: 'beta', folderName: 'beta-branch' },
        { name: 'Alternate', steamBranchKey: 'alternate', folderName: 'alternate-branch' },
        { name: 'Alternate Beta', steamBranchKey: 'alternate-beta', folderName: 'alternate-beta-branch' }
      ];

      const branchInfos: BranchInfo[] = [];

      // Fetch latest branch build IDs via Steam (node-steam-user)
      // Note: This now uses cached data to reduce resource usage - Steam API calls
      // are cached for 5 minutes to avoid repeated expensive API requests
      let latestBranchBuilds: Record<string, string> = {};
      let currentSteamBranchKey = '';
      try {
        const latest = await window.electronAPI.steamUpdate.getAllBranchBuildIds();
        if (latest?.success && latest.map) {
          latestBranchBuilds = latest.map;
        }
        currentSteamBranchKey = await detectCurrentSteamBranchKey(config.steamLibraryPath) || '';
      } catch (err) {
        console.warn('Could not fetch latest branch build IDs or current branch:', err);
      }

      for (const branch of allBranches) {
        const branchPath = await window.electronAPI.pathUtils.getBranchBasePath(config.managedEnvironmentPath, branch.folderName);
        const dirExists = await checkFileExists(branchPath);
        
        // Get active version from config (prioritize manifest over build)
        const activeManifestId = config.activeManifestPerBranch?.[branch.folderName];
        const activeBuildId = config.activeBuildPerBranch?.[branch.folderName];
        const buildId = activeManifestId || activeBuildId || '';
        const lastUpdated = config.branchBuildIds[branch.folderName] ? new Date(config.branchBuildIds[branch.folderName].updatedTime).getTime() / 1000 : Date.now() / 1000;
        
        // Check for active version and executable in version-specific structure
        let exeExists = false;
        let needsRepair = false;
        
        if (activeManifestId) {
          // Check if executable exists in the active manifest version's subdirectory
          const activeVersionPath = await window.electronAPI.pathUtils.getBranchVersionPath(config.managedEnvironmentPath, branch.folderName, activeManifestId, 'manifest');
          const activeExePath = `${activeVersionPath}\\Schedule I.exe`;
          exeExists = await checkFileExists(activeExePath);
          needsRepair = dirExists && !exeExists; // Folder exists but active version's exe missing
        } else if (activeBuildId) {
          // Check if executable exists in the active build version's subdirectory
          const activeVersionPath = await window.electronAPI.pathUtils.getBranchVersionPath(config.managedEnvironmentPath, branch.folderName, activeBuildId, 'build');
          const activeExePath = `${activeVersionPath}\\Schedule I.exe`;
          exeExists = await checkFileExists(activeExePath);
          needsRepair = dirExists && !exeExists; // Folder exists but active version's exe missing
        } else {
          // Legacy check: look for exe directly in branch folder
          const legacyExePath = `${branchPath}\\Schedule I.exe`;
          exeExists = await checkFileExists(legacyExePath);
          needsRepair = dirExists && !exeExists; // Folder exists but exe missing
        }
        
        const isInstalled = !!exeExists; // Only installed if executable exists

        // Determine update status vs Steam (node-steam-user) for this branch key
        let needsUpdate = false;
        let remoteBuildIdNum: number | undefined = undefined;
        const remoteBuildStr = latestBranchBuilds[branch.steamBranchKey] || '';
        if (remoteBuildStr) {
          remoteBuildIdNum = parseInt(remoteBuildStr);
          
          // For manifest-based installations (DepotDownloader), we don't compare build IDs for updates
          // For build-based installations (copy), we compare build IDs
          if (activeManifestId) {
            // DepotDownloader installation - skip build ID comparison for now
            // TODO: Implement manifest-based update detection if needed
            needsUpdate = false;
          } else if (buildId && typeof buildId === 'string' && buildId.includes('/')) {
            // DepotDownloader timestamp format (MM/DD/YYYY HH:MM:SS) - skip comparison
            needsUpdate = false;
          } else if (buildId && typeof buildId === 'number' && buildId > 0) {
            // Copy installation - use numeric build ID comparison
            needsUpdate = remoteBuildIdNum > buildId;
          } else if (buildId && typeof buildId === 'string' && !isNaN(Number(buildId))) {
            // String buildId that can be parsed as number
            const numericBuildId = Number(buildId);
            needsUpdate = remoteBuildIdNum > numericBuildId;
          }
        }

        // Load version information for multi-version support
        let availableVersions: Array<{buildId: string, date: string, sizeBytes?: number}> = [];
        let activeVersion = '';
        let installedVersions = 0;
        let steamManifestId = '';

        try {
          // Get available versions from Steam
          const available = await window.electronAPI.steam.listBranchBuilds(branch.steamBranchKey, 10);
          availableVersions = available.map((v: any) => ({
            buildId: v.buildId,
            date: v.date,
            sizeBytes: v.sizeBytes
          }));

          // Get installed versions (both build and manifest based)
          const installed = await window.electronAPI.steam.getInstalledVersions(branch.folderName);
          installedVersions = installed.length;

          // Find active version from config (prioritize manifest over build)
          const activeManifestId = config.activeManifestPerBranch?.[branch.folderName];
          const activeBuildId = config.activeBuildPerBranch?.[branch.folderName];
          
          if (activeManifestId) {
            activeVersion = `manifest_${activeManifestId}`;
          } else if (activeBuildId) {
            activeVersion = `build_${activeBuildId}`;
          } else {
            activeVersion = '';
          }

          // Get latest manifest ID from Steam API for this branch
          try {
            const depotManifests = await window.electronAPI.steamBranch.getDepotManifestsForBranch(branch.steamBranchKey);
            if (depotManifests?.success && depotManifests.depots && depotManifests.depots.length > 0) {
              // Find the primary depot manifest (assuming depot 3164501 is the main one)
              const primaryDepot = depotManifests.depots.find((d: any) => d.depotId === '3164501');
              if (primaryDepot) {
                steamManifestId = primaryDepot.manifestId;
              } else if (depotManifests.depots.length > 0) {
                // Fallback to first depot if primary not found
                steamManifestId = depotManifests.depots[0].manifestId;
              }
            } else {
              // If no depot manifests available, try to get build ID as fallback
              console.warn(`No depot manifests found for ${branch.name} (${branch.steamBranchKey}), trying build ID fallback`);
              try {
                const buildIdResult = await window.electronAPI.steamBranch.getBranchBuildId(branch.steamBranchKey);
                if (buildIdResult?.success && buildIdResult.buildId) {
                  steamManifestId = `Build ${buildIdResult.buildId}`;
                }
              } catch (buildIdErr) {
                console.warn(`Failed to get build ID for ${branch.name}:`, buildIdErr);
              }
            }
          } catch (manifestErr) {
            console.warn(`Failed to get manifest ID for ${branch.name}:`, manifestErr);
            // Try build ID as fallback
            try {
              const buildIdResult = await window.electronAPI.steamBranch.getBranchBuildId(branch.steamBranchKey);
              if (buildIdResult?.success && buildIdResult.buildId) {
                steamManifestId = `Build ${buildIdResult.buildId}`;
              }
            } catch (buildIdErr) {
              console.warn(`Failed to get build ID fallback for ${branch.name}:`, buildIdErr);
            }
          }
        } catch (err) {
          console.warn(`Failed to load version info for ${branch.name}:`, err);
        }

        branchInfos.push({
          name: branch.name,
          folderName: branch.folderName,
          path: branchPath,
          buildId: buildId,
          lastUpdated: lastUpdated,
          isInstalled: isInstalled,
          needsRepair: needsRepair,
          size: isInstalled ? '2.5 GB' : (needsRepair ? 'Unknown' : 'Not installed'),
          needsUpdate: needsUpdate,
          steamBranchKey: branch.steamBranchKey,
          remoteBuildId: remoteBuildIdNum,
          availableVersions,
          activeVersion,
          installedVersions,
          steamManifestId
        });
      }

      setBranches(branchInfos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const downloadBranchManifest = async (branchFolderName: string, appId: string, ddPath: string | undefined): Promise<Record<string, { manifestId: string; buildId: string }>> => {
    if (!config) throw new Error("Config not available");
    try {
      const credRes = await window.electronAPI?.credCache?.get?.();
      const creds = credRes?.success ? credRes.credentials : null;
      if (!creds) throw new Error("Credentials not available");
      if (!config.managedEnvironmentPath) throw new Error('Managed Environment path not available');
      
      const branches = [branchFolderName];
      
      const res = await window.electronAPI.depotdownloader.downloadManifests(
        ddPath || undefined,
        creds.username,
        creds.password,
        branches,
        appId,
        config.managedEnvironmentPath
      );


      if (!res.success || !res.manifests) {
        throw new Error(res?.error || 'Failed to download manifests');
      }

      return res.manifests;
    } catch (err) {
      console.error('Failed to download manifests:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to download manifests');
    }
  };

  const handleInstallBranch = async (branchInfo: BranchInfo) => {
    if (!config) return;

    setInstallingBranch(branchInfo.name);
    setError(null);

    try {
      // If configured to use DepotDownloader and we have creds, use it directly
      if (config.useDepotDownloader) {
        const credRes = await window.electronAPI?.credCache?.get?.();
        const creds = credRes?.success ? credRes.credentials : null;
        if (creds && creds.username && creds.password) {
          setDdActive(true);
          setDdPercent(0);

          // Ensure target directory exists
          try { await window.electronAPI.file.createDirectory(branchInfo.path); } catch {}

          // Wire up progress listener
          const progressHandler = (p: any) => {
            if (p?.type === 'percent' && typeof p.value === 'number') {
              setDdPercent(Math.max(0, Math.min(100, p.value)));
            }
          };
          window.electronAPI.onDepotDownloaderProgress(progressHandler);

          try {
            const appId = await window.electronAPI.steam.getScheduleIAppId();
            if (!appId) throw new Error('Could not determine Schedule I App ID');

            if (!creds) throw new Error("Credentials not available");

            if (!config.managedEnvironmentPath) throw new Error('Managed Environment path not available');
            
            const ddPath = config.depotDownloaderPath || undefined;
            const branchId = branchInfo.steamBranchKey; // already mapped (public/beta/alternate/alternate-beta)
            
            // Download manifests first to get the latest manifest ID
            const manifests = await downloadBranchManifest(branchInfo.folderName, appId, ddPath);
            
            // Get the manifest info for this branch
            const branchFolderName = branchInfo.folderName;
            
            const manifestInfo = manifests[branchFolderName];
            if (!manifestInfo) {
              throw new Error(`No manifest information found for ${branchInfo.name} branch (folder: ${branchFolderName}). Available keys: ${Object.keys(manifests).join(', ')}`);
            }
            
            const { manifestId, buildId } = manifestInfo;

            // Download the branch using the manifest ID
            const res = await window.electronAPI.depotdownloader.downloadBranchVersionByManifest(
              ddPath,
              creds.username,
              creds.password,
              branchFolderName,
              manifestId,
              appId,
              config.managedEnvironmentPath             
            );

            if (!res?.success) {
              throw new Error(res?.error || 'DepotDownloader failed');
            }

            // Set the active manifest for this branch after successful download
            try {
              await window.electronAPI.config.setActiveManifest(branchInfo.folderName, manifestId);
            } catch (configErr) {
              console.warn(`Failed to set active manifest for ${branchInfo.name}:`, configErr);
            }

            // Install MelonLoader into the version-specific directory if enabled
            try {
              const cfg = await window.electronAPI.config.get();
              if (cfg?.autoInstallMelonLoader) {
                // Get the version-specific path for MelonLoader installation
                const versionPath = await window.electronAPI.pathUtils.getBranchVersionPath(
                  config.managedEnvironmentPath, 
                  branchInfo.folderName, 
                  manifestId, 
                  'manifest'
                );
                
                const mlRes = await window.electronAPI.melonloader.install(versionPath);
                if (mlRes?.success) {
                  setToastMsg('MelonLoader installed');
                  setTimeout(() => setToastMsg(null), 4000);
                } else if (mlRes?.error) {
                  setToastMsg('MelonLoader install failed');
                  setTimeout(() => setToastMsg(null), 4000);
                }
              }
            } catch (e) {
              console.warn('MelonLoader installation failed:', e);
              setToastMsg('MelonLoader install failed');
              setTimeout(() => setToastMsg(null), 4000);
            }

            // Refresh UI
            await loadConfig();
            await loadBranches();
          } finally {
            try { window.electronAPI.removeDepotDownloaderProgressListener(); } catch {}
            setDdActive(false);
            setDdPercent(0);
          }

          setInstallingBranch(null);
          setToastMsg('Download cancelled');
          setTimeout(() => setToastMsg(null), 4000);
          return;
        }
      }

      // Fallback: navigate to copy-based flow
      const branchData = {
        branchName: branchInfo.name,
        steamBranchKey: branchInfo.steamBranchKey,
        folderName: branchInfo.path.split('\\').pop() || branchInfo.name.toLowerCase().replace(' ', '-'),
        steamLibraryPath: config.steamLibraryPath,
        managedEnvironmentPath: config.managedEnvironmentPath,
        gameInstallPath: config.gameInstallPath
      };
      sessionStorage.setItem('installBranchData', JSON.stringify(branchData));
      navigate('/copy-progress');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start installation');
    } finally {
      setInstallingBranch(null);
    }
  };

  // Minimal DepotDownloader login for Managed Environment
  const doDepotLogin = async (options?: { twoFactorCode?: string; confirmMobile?: boolean }) => {
    try {
      setLoginStatus({ loggingIn: true, msg: options?.twoFactorCode ? 'Submitting Steam Guard code...' : (options?.confirmMobile ? 'Waiting for mobile approval...' : 'Logging in...'), guard: null });
      const res = await window.electronAPI.depotdownloader.login(undefined, loginUser, loginPass, options?.confirmMobile ? { confirmSteamGuard: true } : (options?.twoFactorCode ? { twoFactorCode: options.twoFactorCode } : undefined));
      if (res.success) {
        await window.electronAPI.credCache.set({ username: loginUser, password: loginPass });
        setCachedUser(loginUser);
        setLoginStatus({ loggingIn: false, msg: 'Login successful!' , guard: null});
        return;
      }
      if ((res as any).requiresSteamGuard) {
        const gt = (res as any).guardType as ('email'|'mobile'|undefined);
        setLoginStatus({ loggingIn: false, msg: gt === 'email' ? 'Steam Guard email code required' : 'Steam Guard mobile approval required', guard: gt || null });
        return;
      }
      setLoginStatus({ loggingIn: false, msg: '', err: res.error || 'Login failed', guard: null });
    } catch (e) {
      setLoginStatus({ loggingIn: false, msg: '', err: e instanceof Error ? e.message : 'Login failed', guard: null });
    }
  };

  const handleLogout = async () => {
    try { await window.electronAPI?.credCache?.clear?.(); } catch {}
    setCachedUser(null);
  };

  const handlePlayBranch = async (branchInfo: BranchInfo) => {
    try {
      // Find the executable in the active version directory
      let executablePath: string;
      
      if (branchInfo.activeVersion) {
        // Use active version's executable (handles both manifest_ and build_ prefixed versions)
        executablePath = `${branchInfo.path}\\${branchInfo.activeVersion}\\Schedule I.exe`;
      } else {
        // Legacy: look for exe directly in branch folder
        executablePath = `${branchInfo.path}\\Schedule I.exe`;
      }
      
      
      // Check if the executable exists first
      const executableExists = await checkFileExists(executablePath);
      if (!executableExists) {
        throw new Error(`Game executable not found at: ${executablePath}`);
      }
      
      // Launch the game executable
      await window.electronAPI.shell.launchExecutable(executablePath);
      
    } catch (error) {
      console.error('Failed to launch game:', error);
      setError(`Failed to launch game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleOpenBranchFolder = async (branchInfo: BranchInfo) => {
    try {
      // Determine which folder to open
      let targetPath: string;
      
      if (branchInfo.activeVersion) {
        // Open the active version folder (handles both manifest_ and build_ prefixed versions)
        targetPath = `${branchInfo.path}\\${branchInfo.activeVersion}`;
      } else {
        // Legacy: open the branch root folder
        targetPath = branchInfo.path;
      }
      
      // Convert forward slashes to backslashes for Windows compatibility
      const normalizedPath = targetPath.replace(/\//g, '\\');
      
      // Check if the folder exists first
      const folderExists = await checkFileExists(normalizedPath);
      if (!folderExists) {
        throw new Error(`Branch folder not found at: ${normalizedPath}`);
      }
      
      await window.electronAPI.shell.openFolder(normalizedPath);
    } catch (error) {
      console.error('Failed to open folder:', error);
      setError(`Failed to open folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteBranch = async (branchInfo: BranchInfo) => {
    if (!config) return;

    // Store the branch data in session storage for the delete process
    const branchData = {
      branchName: branchInfo.name,
      steamBranchKey: branchInfo.steamBranchKey,
      folderName: branchInfo.path.split('\\').pop() || branchInfo.name.toLowerCase().replace(' ', '-'),
      steamLibraryPath: config.steamLibraryPath,
      managedEnvironmentPath: config.managedEnvironmentPath,
      gameInstallPath: config.gameInstallPath,
      branchPath: branchInfo.path
    };

    // Store the branch data in session storage for the delete process
    sessionStorage.setItem('deleteBranchData', JSON.stringify(branchData));
    
    // Navigate to delete progress
    navigate('/delete-progress');
  };

  const handleSetupWizard = () => {
    navigate('/?setup=true');
  };

  const handleInstallDefaultMods = () => {
    setShowToolsDropdown(false);
    setShowDefaultModsDialog(true);
  };

  const handleStartDefaultModsInstallation = (selectedBranches: string[]) => {
    setShowDefaultModsDialog(false);
    
    // Store the selected branches and navigate to default mods progress
    sessionStorage.setItem('defaultModsData', JSON.stringify({
      selectedBranches,
      managedEnvironmentPath: config?.managedEnvironmentPath
    }));
    
    navigate('/default-mods-progress');
  };

  const handleRefresh = async () => {
    // Reload config first to get latest data
    await loadConfig();
    // Then reload branches with the updated config
    loadBranches();
    
    // Also check for updates when refreshing
    try {
      const updateResult = await checkForUpdates();
      if (updateResult.hasUpdate && !hideUpdateUntilNextRelease) {
        setShowUpdateDialog(true);
      }
    } catch (error) {
      console.error('Failed to check for updates during refresh:', error);
    }
  };

  const handleUpdateDialogClose = () => {
    setShowUpdateDialog(false);
  };

  const handleHideUpdateUntilNextRelease = () => {
    setHideUpdateUntilNextRelease(true);
    setShowUpdateDialog(false);
  };

  const handleOpenVersionManager = (branch: BranchInfo) => {
    setSelectedBranchForVersionManager(branch);
    setShowVersionManager(true);
  };

  const handleVersionManagerClose = () => {
    setShowVersionManager(false);
    setSelectedBranchForVersionManager(null);
  };

  const handleVersionChange = async (version: { buildId?: string; manifestId?: string }) => {
    if (!selectedBranchForVersionManager) return;
    
    try {
      // The VersionManagerDialog already handles setting the active version
      // Refresh config first to get latest active version data
      await loadConfig();
      // Then refresh branches to show updated active version
      await loadBranches();
    } catch (err) {
      console.error('Failed to refresh after version change:', err);
    }
  };

  const handleLaunchBranch = (branchName: string) => {
    // This would launch the game from the specific branch
    // In a real implementation, this would launch the game executable
  };

  if (configLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (!config || !config.managedEnvironmentPath) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-8">No Environment Configured</h1>
            <p className="text-gray-300 mb-8">
              You need to set up your development environment first.
            </p>
            <button
              onClick={handleSetupWizard}
              className="btn-primary"
            >
              Run Setup Wizard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {toastMsg && (
        <div className="bg-blue-900/30 border border-blue-500/50 text-blue-200 px-4 py-2 text-sm text-center">
          {toastMsg}
        </div>
      )}
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Managed Development Environment</h1>
              <p className="text-gray-400">Manage your Schedule I development branches and configurations</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">v{currentVersion}</span>
              {updateInfo?.hasUpdate && (
                <button
                  onClick={() => setShowUpdateDialog(true)}
                  className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
                  title="Update available"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-white">Development Branches</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefresh}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  title="Refresh branch status"
                  disabled={loading}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                </button>
                
                {/* Tools Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    title="Development tools"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Tools</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showToolsDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
                      <div className="py-2">
                        <button
                          onClick={() => { setShowSettings(true); setShowToolsDropdown(false); }}
                          className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center space-x-3"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 4a7.94 7.94 0 00-.15-1.5l2.11-1.65a.5.5 0 00.12-.64l-2-3.46a.5.5 0 00-.6-.22l-2.49 1a7.97 7.97 0 00-1.3-.76l-.38-2.65a.5.5 0 00-.5-.43h-4a.5.5 0 00-.5.43l-.38 2.65c-.45.2-.88.45-1.3.76l-2.49-1a.5.5 0 00-.6.22l-2 3.46a.5.5 0 00.12.64l2.11 1.65c-.06.49-.06 1.01 0 1.5l-2.11 1.65a.5.5 0 00-.12.64l2 3.46a.5.5 0 00.6.22l2.49-1c.42.31.85.56 1.3.76l.38 2.65a.5.5 0 00.5.43h4a.5.5 0 00.5-.43l.38-2.65c.45-.2.88-.45 1.3-.76l2.49 1a.5.5 0 00.6-.22l2-3.46a.5.5 0 00-.12-.64l-2.11-1.65c.06-.49.06-1.01 0-1.5z" />
                          </svg>
                          <div>
                            <div className="font-medium">Settings</div>
                            <div className="text-sm text-gray-400">Preferences and thresholds</div>
                          </div>
                        </button>
                        <button
                          onClick={handleInstallDefaultMods}
                          className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center space-x-3"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <div>
                            <div className="font-medium">Install Default Mods</div>
                            <div className="text-sm text-gray-400">Copy default mods to selected branches</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={handleSetupWizard}
              className="btn-secondary"
            >
              Setup Wizard
            </button>
          </div>
        </div>

        {/* Development Branches - Main Focus */}
        <div className="mb-8">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading branches...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && branches.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No development branches configured</p>
              <button 
                onClick={handleSetupWizard}
                className="btn-primary"
              >
                Configure Branches
              </button>
            </div>
          )}

          {!loading && !error && branches.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {branches.map((branch) => (
                <div key={branch.name} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold capitalize">{branch.name}</h3>
                    <div className="flex items-center space-x-2">
                      {branch.needsUpdate && (
                        <div className="w-3 h-3 rounded-full bg-yellow-500" title="Update available"></div>
                      )}
                      <div className={`w-3 h-3 rounded-full ${
                        branch.needsRepair ? 'bg-orange-500' : (branch.isInstalled ? 'bg-green-500' : 'bg-red-500')
                      }`} title={branch.needsRepair ? 'Needs Repair' : (branch.isInstalled ? 'Installed' : 'Not installed')}></div>
                      {/* Version Manager Button */}
                      <button
                        onClick={() => handleOpenVersionManager(branch)}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="Manage versions"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-400">
                      Steam Version: <span className="text-gray-300">{branch.steamManifestId || 'Not Available'}</span>
                    </p>
                    {branch.buildId && (
                      <p className="text-sm text-gray-400">
                        Build ID: <span className="text-gray-300">{branch.buildId}</span>
                      </p>
                    )}
                    <p className="text-sm text-gray-400">
                      Installed Versions: <span className="text-gray-300">{branch.installedVersions}</span>
                    </p>
                    <p className="text-sm text-gray-400">
                      Available Versions: <span className="text-gray-300">{branch.availableVersions.length}</span>
                    </p>
                    <p className="text-sm text-gray-400">
                      Last Updated: <span className="text-gray-300">
                        {new Date(branch.lastUpdated * 1000).toLocaleString()}
                      </span>
                    </p>
                    <p className="text-sm text-gray-400">
                      Size: <span className="text-gray-300">{branch.size}</span>
                    </p>
                    <p className="text-sm text-gray-400">
                      Status: <span className={`${
                        branch.needsRepair ? 'text-orange-400' : (branch.needsUpdate ? 'text-yellow-400' : 
                        branch.isInstalled ? 'text-green-400' : 'text-red-400')
                      }`}>
                        {branch.needsRepair ? 'Needs Repair' : (branch.needsUpdate ? 'Update Available' : 
                         branch.isInstalled ? 'Installed' : 'Not Installed')}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    {!branch.isInstalled ? (
                      <>
                        <button
                          onClick={() => handleInstallBranch(branch)}
                          disabled={installingBranch === branch.name}
                          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                            installingBranch === branch.name
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {installingBranch === branch.name ? 'Installing...' : (branch.needsRepair ? 'Repair' : 'Install')}
                        </button>
                        {installingBranch === branch.name && ddActive && (
                          <div>
                            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-1.5 bg-blue-600" style={{ width: `${ddPercent}%` }} />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <div className="text-xs text-gray-400">{ddPercent.toFixed(0)}% downloading</div>
                              <button
                                className="text-xs text-red-300 hover:text-red-200"
                                onClick={async () => {
                                  const ok = confirm('Cancel the current download?');
                                  if (!ok) return;
                                  await handleCancelDepotDownload(branch);
                                  setToastMsg('Download cancelled');
                                  setTimeout(() => setToastMsg(null), 4000);
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleInstallBranch(branch)}
                            disabled={installingBranch === branch.name}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                              installingBranch === branch.name
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {installingBranch === branch.name ? (branch.needsRepair ? 'Repairing...' : 'Reinstalling...') : (branch.needsRepair ? 'Repair' : 'Reinstall')}
                          </button>
                          <button
                            onClick={() => handleOpenBranchFolder(branch)}
                            className="flex-1 py-2 px-4 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white transition-colors flex items-center justify-center space-x-1"
                            title="Open branch folder in file explorer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <span>Open</span>
                          </button>
                          <button
                            onClick={() => handleDeleteBranch(branch)}
                            className="py-2 px-3 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center"
                            title="Delete this branch instance"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        {installingBranch === branch.name && ddActive && (
                          <div>
                            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-1.5 bg-blue-600" style={{ width: `${ddPercent}%` }} />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <div className="text-xs text-gray-400">{ddPercent.toFixed(0)}% downloading</div>
                              <button
                                className="text-xs text-red-300 hover:text-red-200"
                                onClick={async () => {
                                  const ok = confirm('Cancel the current download?');
                                  if (!ok) return;
                                  await handleCancelDepotDownload(branch);
                                  setToastMsg('Download cancelled');
                                  setTimeout(() => setToastMsg(null), 4000);
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                        {branch.isInstalled && !branch.needsRepair && (
                          <button
                            onClick={() => handlePlayBranch(branch)}
                            className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center justify-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                            <span>Play</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configuration Overview - Secondary */}
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-4">Configuration Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Steam Library Path</p>
              <p className="text-gray-300 font-mono text-sm">{config.steamLibraryPath}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Game Install Path</p>
              <p className="text-gray-300 font-mono text-sm">{config.gameInstallPath}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Managed Environment Path</p>
              <p className="text-gray-300 font-mono text-sm">{config.managedEnvironmentPath}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Installed Branch</p>
              <p className="text-gray-300">{config.installedBranch || 'None'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Config Version</p>
              <p className="text-gray-300">{config.configVersion}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Last Updated</p>
              <p className="text-gray-300">{new Date(config.lastUpdated).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Steam Session (with inline login when needed) */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-white">Steam Session</h2>
          {cachedUser && (
            <button className="btn-secondary" onClick={handleLogout}>Log out</button>
          )}
        </div>
        {cachedUser ? (
          <p className="text-sm text-gray-300">Logged in as <span className="font-mono">{cachedUser}</span></p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Steam Username</label>
                <input value={loginUser} onChange={e => setLoginUser(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm mb-1">Steam Password</label>
                <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" />
              </div>
            </div>
            {!loginStatus.guard && (
              <button className="btn-primary" disabled={loginStatus.loggingIn || !loginUser || !loginPass} onClick={() => doDepotLogin()}>
                {loginStatus.loggingIn ? 'Logging in...' : 'Login'}
              </button>
            )}
            {loginStatus.guard === 'email' && (
              <div className="flex items-center space-x-2">
                <input placeholder="Email code" value={loginGuardCode} onChange={e => setLoginGuardCode(e.target.value)} className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" />
                <button className="btn-primary" disabled={loginStatus.loggingIn || !loginGuardCode.trim()} onClick={() => doDepotLogin({ twoFactorCode: loginGuardCode.trim() })}>Submit Code</button>
              </div>
            )}
            {loginStatus.guard === 'mobile' && (
              <div className="flex items-center space-x-2">
                <button className="btn-primary" disabled={loginStatus.loggingIn} onClick={() => doDepotLogin({ confirmMobile: true })}>{loginStatus.loggingIn ? 'Confirming...' : 'I Have Approved in Steam Mobile'}</button>
                <button className="btn-secondary" disabled={loginStatus.loggingIn} onClick={async () => { try { await window.electronAPI.depotdownloader.cancel(); } catch {}; setLoginStatus({ loggingIn: false, msg: '', err: 'Cancelled', guard: null }); }}>Cancel</button>
              </div>
            )}
            {loginStatus.msg && <p className="text-sm text-blue-300">{loginStatus.msg}</p>}
            {loginStatus.err && <p className="text-sm text-red-300">{loginStatus.err}</p>}
          </div>
        )}
      </div>

      {/* Default Mods Dialog */}
      <DefaultModsDialog
        isOpen={showDefaultModsDialog}
        onClose={() => setShowDefaultModsDialog(false)}
        onStartInstallation={handleStartDefaultModsInstallation}
        branches={branches.map(branch => ({
          name: branch.name,
          folderName: branch.path.split('\\').pop() || branch.name.toLowerCase().replace(' ', '-'),
          isInstalled: branch.isInstalled,
          compilationType: branch.name === 'Main' || branch.name === 'Beta' ? 'Il2Cpp' : 'Mono'
        }))}
        managedEnvironmentPath={config?.managedEnvironmentPath || ''}
      />

      {/* Update Dialog */}
      {updateInfo && (
        <UpdateDialog
          isOpen={showUpdateDialog}
          updateInfo={updateInfo}
          onClose={handleUpdateDialogClose}
          onHideUntilNextRelease={handleHideUpdateUntilNextRelease}
        />
      )}
      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* Version Manager Dialog */}
      {selectedBranchForVersionManager && (
        <VersionManagerDialog
          isOpen={showVersionManager}
          onClose={handleVersionManagerClose}
          branchName={selectedBranchForVersionManager.folderName}
          branchKey={selectedBranchForVersionManager.steamBranchKey}
          onVersionChange={handleVersionChange}
        />
      )}
    </div>
  );
};

export default ManagedEnvironment;
