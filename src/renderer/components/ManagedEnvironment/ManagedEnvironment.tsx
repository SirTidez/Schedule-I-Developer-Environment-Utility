import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigService } from '../../hooks/useConfigService';
import { useFileService } from '../../hooks/useFileService';
import { useSteamService } from '../../hooks/useSteamService';
import { useUpdateService } from '../../hooks/useUpdateService';
import DefaultModsDialog from '../DefaultModsDialog/DefaultModsDialog';
import { UpdateDialog } from '../UpdateDialog/UpdateDialog';

interface BranchInfo {
  name: string;
  path: string;
  buildId: number;
  lastUpdated: number;
  isInstalled: boolean;
  size: string;
  needsUpdate: boolean;
  steamBranchKey: string; // The actual Steam branch key (public, beta, alternative, alternative_beta)
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
  const [showDefaultModsDialog, setShowDefaultModsDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [hideUpdateUntilNextRelease, setHideUpdateUntilNextRelease] = useState(false);
  const [hasCheckedForUpdates, setHasCheckedForUpdates] = useState(false);

  useEffect(() => {
    if (config) {
      loadBranches();
    }
  }, [config]);

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

      // Get current Steam build ID and branch key for comparison
      let currentSteamBuildId = '';
      let currentSteamBranchKey = '';
      try {
        currentSteamBuildId = await getCurrentSteamBuildId(config.steamLibraryPath);
        currentSteamBranchKey = await detectCurrentSteamBranchKey(config.steamLibraryPath) || '';
        console.log(`Current Steam build ID: ${currentSteamBuildId}`);
        console.log(`Current Steam branch key: ${currentSteamBranchKey}`);
      } catch (err) {
        console.warn('Could not get current Steam build ID or branch key:', err);
      }

      for (const branch of allBranches) {
        const branchPath = `${config.managedEnvironmentPath}\\branches\\${branch.folderName}`;
        const isInstalled = await checkFileExists(branchPath);
        
        // Check if this branch matches the currently installed Steam branch
        const isCurrentSteamBranch = currentSteamBranchKey === branch.steamBranchKey;
        
        // Get build ID from config if available
        const buildInfo = config.branchBuildIds[branch.folderName];
        const buildId = buildInfo ? parseInt(buildInfo.buildId) : 0;
        const lastUpdated = buildInfo ? new Date(buildInfo.updatedTime).getTime() / 1000 : Date.now() / 1000;

        // Check if branch needs update
        let needsUpdate = false;
        if (currentSteamBuildId && buildId > 0) {
          const currentBuildIdNum = parseInt(currentSteamBuildId);
          needsUpdate = currentBuildIdNum > buildId;
          console.log(`Branch ${branch.name}: stored=${buildId}, current=${currentBuildIdNum}, needsUpdate=${needsUpdate}`);
        }

        branchInfos.push({
          name: branch.name,
          path: branchPath,
          buildId: buildId,
          lastUpdated: lastUpdated,
          isInstalled: isInstalled || isCurrentSteamBranch, // Mark as installed if folder exists OR it's the current Steam branch
          size: (isInstalled || isCurrentSteamBranch) ? '2.5 GB' : 'Not installed',
          needsUpdate: needsUpdate,
          steamBranchKey: branch.steamBranchKey
        });
      }

      setBranches(branchInfos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const handleInstallBranch = async (branchInfo: BranchInfo) => {
    if (!config) return;

    setInstallingBranch(branchInfo.name);
    setError(null);

    try {
      // Navigate to copy progress with the specific branch
      const branchData = {
        branchName: branchInfo.name,
        steamBranchKey: branchInfo.steamBranchKey,
        folderName: branchInfo.path.split('\\').pop() || branchInfo.name.toLowerCase().replace(' ', '-'),
        steamLibraryPath: config.steamLibraryPath,
        managedEnvironmentPath: config.managedEnvironmentPath,
        gameInstallPath: config.gameInstallPath
      };

      // Store the branch data in session storage for the copy process
      sessionStorage.setItem('installBranchData', JSON.stringify(branchData));
      
      // Navigate to copy progress
      navigate('/copy-progress');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start installation');
      setInstallingBranch(null);
    }
  };

  const handlePlayBranch = async (branchInfo: BranchInfo) => {
    try {
      // Find the executable in the branch directory
      const executablePath = `${branchInfo.path}\\Schedule I.exe`;
      
      console.log('Launching game from:', executablePath);
      console.log('Branch info:', branchInfo);
      
      // Check if the executable exists first
      const executableExists = await checkFileExists(executablePath);
      if (!executableExists) {
        throw new Error(`Game executable not found at: ${executablePath}`);
      }
      
      // Launch the game executable
      await window.electronAPI.shell.launchExecutable(executablePath);
      
      console.log('Game launched successfully');
    } catch (error) {
      console.error('Failed to launch game:', error);
      setError(`Failed to launch game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleOpenBranchFolder = async (branchPath: string) => {
    try {
      // Convert forward slashes to backslashes for Windows compatibility
      const normalizedPath = branchPath.replace(/\//g, '\\');
      console.log('Opening folder:', normalizedPath);
      console.log('Original path:', branchPath);
      
      // Check if the folder exists first
      const folderExists = await checkFileExists(normalizedPath);
      if (!folderExists) {
        throw new Error(`Branch folder not found at: ${normalizedPath}`);
      }
      
      await window.electronAPI.shell.openFolder(normalizedPath);
      console.log('Folder opened successfully');
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

  const handleLaunchBranch = (branchName: string) => {
    // This would launch the game from the specific branch
    console.log('Launching branch:', branchName);
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
                        branch.isInstalled ? 'bg-green-500' : 'bg-red-500'
                      }`} title={branch.isInstalled ? 'Installed' : 'Not installed'}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-400">
                      Build ID: <span className="text-gray-300">{branch.buildId || 'Unknown'}</span>
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
                        branch.needsUpdate ? 'text-yellow-400' : 
                        branch.isInstalled ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {branch.needsUpdate ? 'Update Available' : 
                         branch.isInstalled ? 'Installed' : 'Not Installed'}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    {!branch.isInstalled ? (
                      <button
                        onClick={() => handleInstallBranch(branch)}
                        disabled={installingBranch === branch.name}
                        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                          installingBranch === branch.name
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {installingBranch === branch.name ? 'Installing...' : 'Install'}
                      </button>
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
                            {installingBranch === branch.name ? 'Reinstalling...' : 'Reinstall'}
                          </button>
                          <button
                            onClick={() => handleOpenBranchFolder(branch.path)}
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
                        <button
                          onClick={() => handlePlayBranch(branch)}
                          className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center justify-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                          <span>Play</span>
                        </button>
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
    </div>
  );
};

export default ManagedEnvironment;
