import React, { useState, useEffect } from 'react';
import { useFileService } from '../../../hooks/useFileService';
import { useSteamService } from '../../../hooks/useSteamService';
import BranchVerificationDialog from '../../BranchVerificationDialog';
import TerminalOutput from '../../TerminalOutput';

interface CopyProgressStepProps {
  steamLibraryPath: string;
  managedEnvironmentPath: string;
  selectedBranches: string[];
  onComplete: () => void;
  useSteamCMD?: boolean;
  steamCMDPath?: string | null;
  steamCredentials?: { username: string; password: string; stayLoggedIn: boolean } | null;
}

const CopyProgressStep: React.FC<CopyProgressStepProps> = ({
  steamLibraryPath,
  managedEnvironmentPath,
  selectedBranches,
  onComplete,
  useSteamCMD = false,
  steamCMDPath = null,
  steamCredentials = null
}) => {
  const { copyGameFiles, createDirectory, loading, error, progress } = useFileService();
  const { getBranchBuildId } = useSteamService();
  const { verifyBranchInstalled } = useSteamService();
  
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [completedBranches, setCompletedBranches] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [currentBranchIndex, setCurrentBranchIndex] = useState(0);
  const [copyStatus, setCopyStatus] = useState<'waiting' | 'verifying' | 'copying' | 'completed'>('waiting');
  const [verificationResolve, setVerificationResolve] = useState<(() => void) | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [branchProgress, setBranchProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [filesCopied, setFilesCopied] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [downloadMethod, setDownloadMethod] = useState<'copy' | 'steamcmd'>('copy');

  // Branch display names mapping
  const branchDisplayNames: Record<string, string> = {
    'main-branch': 'Main',
    'beta-branch': 'Beta',
    'alternate-branch': 'Alternative',
    'alternate-beta-branch': 'Alternative Beta'
  };

  useEffect(() => {
    if (steamLibraryPath && managedEnvironmentPath && selectedBranches.length > 0) {
      // Determine download method
      if (useSteamCMD && steamCMDPath && steamCredentials) {
        setDownloadMethod('steamcmd');
        addTerminalLog('Using SteamCMD for branch downloads');
      } else {
        setDownloadMethod('copy');
        addTerminalLog('Using manual file copying');
      }
      startCopyProcess();
    }
  }, [steamLibraryPath, managedEnvironmentPath, selectedBranches, useSteamCMD, steamCMDPath, steamCredentials]);

  useEffect(() => {
    // Set up progress event listener
    const handleProgress = (progress: any) => {
      setBranchProgress(progress.progress);
      setCurrentFile(progress.currentFile);
      setFilesCopied(progress.completedFiles);
      setTotalFiles(progress.totalFiles);
      
      // Add to terminal logs
      if (progress.currentFile && progress.currentFile !== 'Complete') {
        addTerminalLog(`Copying: ${progress.currentFile}`);
      } else if (progress.currentFile === 'Complete') {
        addTerminalLog(`✓ Completed copying ${progress.totalFiles} files`);
      }
    };

    window.electronAPI.onFileCopyProgress(handleProgress);

    return () => {
      window.electronAPI.removeFileCopyProgressListener();
    };
  }, []);

  const addTerminalLog = (message: string) => {
    setTerminalLogs(prev => [...prev, message]);
  };

  const createConfigFile = async () => {
    try {
      const config = {
        steamLibraryPath: steamLibraryPath,
        gameInstallPath: `${steamLibraryPath}/common/Schedule I`,
        managedEnvironmentPath: managedEnvironmentPath,
        selectedBranches: selectedBranches,
        installedBranch: selectedBranches[0], // First branch is the currently installed one
        branchBuildIds: {},
        customLaunchCommands: {},
        lastUpdated: new Date().toISOString(),
        configVersion: '2.0'
      };

      // Update config through the service
      await window.electronAPI.config.update(config);
    } catch (error) {
      console.error('Failed to create config file:', error);
      addTerminalLog(`✗ Error creating config file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const startCopyProcess = async () => {
    try {
      console.log('Starting copy process...');
      console.log('Steam Library Path:', steamLibraryPath);
      console.log('Managed Environment Path:', managedEnvironmentPath);
      console.log('Selected Branches:', selectedBranches);

      // Create the main managed environment directory
      await createDirectory(managedEnvironmentPath);
      await createDirectory(`${managedEnvironmentPath}/branches`);
      
      // Create all branch directories upfront
      addTerminalLog('Creating directory structure...');
      for (const branch of selectedBranches) {
        const branchPath = `${managedEnvironmentPath}/branches/${branch}`;
        await createDirectory(branchPath);
        addTerminalLog(`Created directory: ${branchPath}`);
      }
      
      // Create additional required directories
      await createDirectory(`${managedEnvironmentPath}/logs`);
      addTerminalLog(`Created directory: ${managedEnvironmentPath}/logs`);
      
      await createDirectory(`${managedEnvironmentPath}/temp`);
      addTerminalLog(`Created directory: ${managedEnvironmentPath}/temp`);
      
      // Create Default Mods runtime-specific structure
      const defaultModsPath = `${managedEnvironmentPath}/Default Mods`;
      await createDirectory(defaultModsPath);
      addTerminalLog(`Created directory: ${defaultModsPath}`);
      
      // Il2Cpp runtime directories (for main-branch and beta-branch)
      await createDirectory(`${defaultModsPath}/Il2Cpp/Mods`);
      addTerminalLog(`Created directory: ${defaultModsPath}/Il2Cpp/Mods`);
      
      await createDirectory(`${defaultModsPath}/Il2Cpp/Plugins`);
      addTerminalLog(`Created directory: ${defaultModsPath}/Il2Cpp/Plugins`);
      
      // Mono runtime directories (for alternate-branch and alternate-beta-branch)
      await createDirectory(`${defaultModsPath}/Mono/Mods`);
      addTerminalLog(`Created directory: ${defaultModsPath}/Mono/Mods`);
      
      await createDirectory(`${defaultModsPath}/Mono/Plugins`);
      addTerminalLog(`Created directory: ${defaultModsPath}/Mono/Plugins`);
      
      addTerminalLog('✓ Complete directory structure created');

      // Create configuration file
      addTerminalLog('Creating configuration file...');
      await createConfigFile();
      addTerminalLog('✓ Configuration file created');

      // Process each branch with verification
      for (let i = 0; i < selectedBranches.length; i++) {
        const branch = selectedBranches[i];
        setCurrentBranch(branch);
        setCurrentBranchIndex(i);
        
        console.log(`Processing branch: ${branch}`);
        
        // Calculate overall progress
        const branchProgress = ((i + 1) / selectedBranches.length) * 100;
        setOverallProgress(branchProgress);

        // Skip verification for the first branch (currently installed)
        if (i === 0) {
          console.log(`Skipping verification for first branch: ${branch}`);
          setCopyStatus('copying');
          if (downloadMethod === 'steamcmd') {
            await downloadBranchWithSteamCMD(branch);
          } else {
            await copyBranchFiles(branch);
          }
        } else {
          setCopyStatus('verifying');
          // Show verification dialog for this branch
          await showBranchVerification(branch);
        }
      }

      setIsComplete(true);
      setCopyStatus('completed');
      onComplete();
    } catch (err) {
      console.error('Copy process failed:', err);
    }
  };

  const showBranchVerification = (branch: string): Promise<void> => {
    return new Promise((resolve) => {
      setVerificationResolve(() => resolve);
      setShowVerificationDialog(true);
    });
  };

  const copyBranchFiles = async (branch: string) => {
    try {
      const branchPath = `${managedEnvironmentPath}/branches/${branch}`;
      const branchDisplayName = branchDisplayNames[branch] || branch;
      
      addTerminalLog(`Starting copy for ${branchDisplayName} branch...`);
      addTerminalLog(`Source: ${steamLibraryPath}/common/Schedule I`);
      addTerminalLog(`Destination: ${branchPath}`);

      // Get the current build ID for this branch
      addTerminalLog(`Getting build ID for ${branchDisplayName} branch...`);
      const buildId = await getBranchBuildId(steamLibraryPath, branch);
      if (buildId) {
        addTerminalLog(`Build ID for ${branchDisplayName}: ${buildId}`);
        // Save the build ID to the configuration
        await window.electronAPI.config.setBuildIdForBranch(branch, buildId);
        addTerminalLog(`✓ Saved build ID for ${branchDisplayName} branch`);
      } else {
        addTerminalLog(`⚠ Could not get build ID for ${branchDisplayName} branch`);
      }

      // Construct proper game source path - steamLibraryPath is already the steamapps path
      const gameSourcePath = `${steamLibraryPath}/common/Schedule I`;
      
      addTerminalLog(`Discovering files in: ${gameSourcePath}`);
      
      await copyGameFiles(gameSourcePath, branchPath);
      setCompletedBranches(prev => [...prev, branch]);
      addTerminalLog(`✓ Successfully completed ${branchDisplayName} branch`);
      
    } catch (err) {
      const errorMsg = `Failed to copy branch ${branch}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(errorMsg);
      addTerminalLog(`✗ Error: ${errorMsg}`);
      throw err;
    }
  };

  const downloadBranchWithSteamCMD = async (branch: string) => {
    try {
      if (!steamCMDPath || !steamCredentials) {
        throw new Error('SteamCMD path or credentials not available');
      }

      const branchPath = `${managedEnvironmentPath}/branches/${branch}`;
      const branchDisplayName = branchDisplayNames[branch] || branch;
      
      addTerminalLog(`Starting SteamCMD download for ${branchDisplayName} branch...`);
      addTerminalLog(`SteamCMD Path: ${steamCMDPath}`);
      addTerminalLog(`Username: ${steamCredentials.username}`);
      addTerminalLog(`Destination: ${branchPath}`);

      // Get the Schedule I App ID
      const appId = await window.electronAPI.steam.getScheduleIAppId();
      if (!appId) {
        throw new Error('Could not get Schedule I App ID');
      }

      addTerminalLog(`App ID: ${appId}`);

      // Map branch names to Steam branch IDs
      const branchIdMap: Record<string, string> = {
        'main-branch': 'main',
        'beta-branch': 'beta',
        'alternate-branch': 'alternate',
        'alternate-beta-branch': 'alternate-beta'
      };

      const branchId = branchIdMap[branch];
      if (!branchId) {
        throw new Error(`Unknown branch ID for ${branch}`);
      }

      addTerminalLog(`Steam Branch ID: ${branchId}`);

      // Download the branch using SteamCMD
      addTerminalLog(`Executing SteamCMD download command...`);
      const result = await window.electronAPI.steamcmd.downloadBranch(
        steamCMDPath,
        steamCredentials.username,
        steamCredentials.password,
        branchPath,
        branchId,
        appId
      );

      if (result.success) {
        addTerminalLog(`✓ Successfully downloaded ${branchDisplayName} branch with SteamCMD`);
        addTerminalLog(`Output: ${result.output}`);
        
        // Get and save build ID
        addTerminalLog(`Getting build ID for ${branchDisplayName} branch...`);
        const buildId = await getBranchBuildId(steamLibraryPath, branch);
        if (buildId) {
          addTerminalLog(`Build ID for ${branchDisplayName}: ${buildId}`);
          await window.electronAPI.config.setBuildIdForBranch(branch, buildId);
          addTerminalLog(`✓ Saved build ID for ${branchDisplayName} branch`);
        } else {
          addTerminalLog(`⚠ Could not get build ID for ${branchDisplayName} branch`);
        }

        setCompletedBranches(prev => [...prev, branch]);
      } else {
        throw new Error(result.error || 'SteamCMD download failed');
      }
      
    } catch (err) {
      const errorMsg = `Failed to download branch ${branch} with SteamCMD: ${err instanceof Error ? err.message : String(err)}`;
      console.error(errorMsg);
      addTerminalLog(`✗ Error: ${errorMsg}`);
      throw err;
    }
  };

  const handleBranchVerified = async () => {
    setShowVerificationDialog(false);
    setCopyStatus('copying');
    
    try {
      const branch = selectedBranches[currentBranchIndex];
      if (downloadMethod === 'steamcmd') {
        await downloadBranchWithSteamCMD(branch);
      } else {
        await copyBranchFiles(branch);
      }
      
    } catch (err) {
      console.error(`Failed to process branch ${currentBranch}:`, err);
    } finally {
      if (verificationResolve) {
        verificationResolve();
        setVerificationResolve(null);
      }
    }
  };

  const handleBranchSkipped = () => {
    setShowVerificationDialog(false);
    console.log(`Skipped branch: ${currentBranch}`);
    if (verificationResolve) {
      verificationResolve();
      setVerificationResolve(null);
    }
  };

  const handleCancelSetup = () => {
    setShowVerificationDialog(false);
    setIsComplete(true);
    if (verificationResolve) {
      verificationResolve();
      setVerificationResolve(null);
    }
    onComplete();
  };

  const getBranchProgress = (branch: string) => {
    if (completedBranches.includes(branch)) return 100;
    if (currentBranch === branch && copyStatus === 'copying') return branchProgress;
    return 0;
  };

  const getStatusMessage = () => {
    switch (copyStatus) {
      case 'verifying':
        return `Verifying branch: ${branchDisplayNames[currentBranch] || currentBranch}`;
      case 'copying':
        return `Copying branch: ${branchDisplayNames[currentBranch] || currentBranch}`;
      case 'completed':
        return 'Setup complete!';
      default:
        return 'Preparing to copy branches...';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Copying Files</h3>
        <p className="text-gray-300 mb-4">
          Please wait while the selected branches are copied to your managed environment.
        </p>
      </div>

      {/* Overall Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
        <div
          className="bg-blue-600 h-4 rounded-full transition-all duration-300"
          style={{ width: `${overallProgress}%` }}
        ></div>
      </div>
      <p className="text-sm text-gray-300 text-center mb-4">{overallProgress.toFixed(0)}% Complete</p>

      {/* Status Message */}
      <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
        <p className="text-blue-300 text-center">
          {getStatusMessage()}
        </p>
        {copyStatus === 'copying' && (
          <div className="mt-2">
            <p className="text-sm text-blue-400 text-center">
              {currentFile && currentFile !== 'Complete' && `File: ${currentFile}`}
              {filesCopied > 0 && totalFiles > 0 && 
                ` (${filesCopied}/${totalFiles} files)`
              }
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${branchProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 text-center mt-1">
              {branchProgress.toFixed(1)}% complete
            </p>
          </div>
        )}
      </div>

      {/* Terminal Output Toggle */}
      {copyStatus === 'copying' && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className="btn-secondary text-sm"
          >
            {showTerminal ? 'Hide' : 'Show'} Terminal Output
          </button>
        </div>
      )}

      {/* Terminal Output */}
      <TerminalOutput logs={terminalLogs} isVisible={showTerminal} />

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-300">Error: {error}</p>
        </div>
      )}

      {/* Completion Message */}
      {isComplete && (
        <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
          <p className="text-green-300">
            ✓ Setup complete! All selected branches have been copied successfully.
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && !isComplete && (
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-gray-300">Processing files...</span>
        </div>
      )}

      {/* Branch Verification Dialog */}
      <BranchVerificationDialog
        isOpen={showVerificationDialog}
        libraryPath={steamLibraryPath}
        expectedBranch={currentBranch}
        branchDisplayName={branchDisplayNames[currentBranch] || currentBranch}
        onVerified={handleBranchVerified}
        onSkip={handleBranchSkipped}
        onCancel={handleCancelSetup}
      />
    </div>
  );
};

export default CopyProgressStep;