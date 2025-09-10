import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSteamService } from '../../hooks/useSteamService';
import { useFileService } from '../../hooks/useFileService';
import { useConfigService } from '../../hooks/useConfigService';

interface BranchData {
  branchName: string;
  steamBranchKey: string;
  folderName: string;
  steamLibraryPath: string;
  managedEnvironmentPath: string;
  gameInstallPath: string;
}

const CopyProgress: React.FC = () => {
  const navigate = useNavigate();
  const { verifyBranchInstalled, waitForBranchChange, getBranchBuildId, getCurrentSteamBuildId } = useSteamService();
  const { copyGameFiles } = useFileService();
  const { setBuildIdForBranch } = useConfigService();

  const [branchData, setBranchData] = useState<BranchData | null>(null);
  const [currentStep, setCurrentStep] = useState<'verification' | 'copying' | 'completed' | 'error'>('verification');
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showBranchVerification, setShowBranchVerification] = useState(false);

  useEffect(() => {
    // Load branch data from session storage
    const storedData = sessionStorage.getItem('installBranchData');
    if (storedData) {
      setBranchData(JSON.parse(storedData));
    } else {
      navigate('/managed-environment');
    }
  }, [navigate]);

  useEffect(() => {
    // Listen for file copy progress events
    const handleProgress = (progressData: any) => {
      setProgress(progressData.progress);
      setCurrentFile(progressData.currentFile);
      addTerminalLog(`Copying: ${progressData.currentFile} (${progressData.progress.toFixed(1)}%)`);
    };

    // Add event listener using the exposed API
    window.electronAPI.onFileCopyProgress(handleProgress);

    // Cleanup
    return () => {
      window.electronAPI.removeFileCopyProgressListener();
    };
  }, []);

  useEffect(() => {
    if (branchData) {
      startInstallationProcess();
    }
  }, [branchData]);

  const addTerminalLog = (message: string) => {
    setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const startInstallationProcess = async () => {
    if (!branchData) return;

    try {
      addTerminalLog(`Starting installation of ${branchData.branchName} branch...`);
      
      // Check if the correct branch is already installed in Steam
      const isCorrectBranch = await verifyBranchInstalled(branchData.steamLibraryPath, branchData.steamBranchKey);
      
      if (isCorrectBranch) {
        addTerminalLog(`Correct branch (${branchData.steamBranchKey}) is already installed in Steam. Proceeding with copy...`);
        await startCopyProcess();
      } else {
        addTerminalLog(`Incorrect branch detected. Need to switch to ${branchData.steamBranchKey} branch in Steam.`);
        setShowBranchVerification(true);
      }
    } catch (err) {
      addTerminalLog(`Error during branch verification: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err.message : 'Failed to verify branch');
      setCurrentStep('error');
    }
  };

  const handleBranchVerificationConfirm = async () => {
    if (!branchData) return;

    try {
      addTerminalLog('Waiting for branch change in Steam...');
      setShowBranchVerification(false);
      
      // Wait for the branch to change
      const branchChanged = await waitForBranchChange(branchData.steamLibraryPath, branchData.steamBranchKey, 30000);
      
      if (branchChanged) {
        addTerminalLog(`Branch successfully changed to ${branchData.steamBranchKey}. Proceeding with copy...`);
        await startCopyProcess();
      } else {
        addTerminalLog('Timeout waiting for branch change. Please try again.');
        setError('Timeout waiting for branch change. Please ensure you have switched to the correct branch in Steam.');
        setCurrentStep('error');
      }
    } catch (err) {
      addTerminalLog(`Error waiting for branch change: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err.message : 'Failed to wait for branch change');
      setCurrentStep('error');
    }
  };

  const startCopyProcess = async () => {
    if (!branchData) return;

    try {
      setCurrentStep('copying');
      addTerminalLog('Starting file copy process...');

      // Create the target directory
      const targetPath = `${branchData.managedEnvironmentPath}/branches/${branchData.folderName}`;
      addTerminalLog(`Target directory: ${targetPath}`);

      // Start the copy process
      await copyGameFiles(branchData.gameInstallPath, targetPath);

      addTerminalLog('File copy completed successfully!');

      // Get and save the build ID
      try {
        addTerminalLog(`Retrieving build ID from Steam library: ${branchData.steamLibraryPath}`);
        const buildId = await getCurrentSteamBuildId(branchData.steamLibraryPath);
        addTerminalLog(`Retrieved build ID: ${buildId}`);
        
        if (buildId) {
          addTerminalLog(`Saving build ID ${buildId} for branch folder: ${branchData.folderName}`);
          await setBuildIdForBranch(branchData.folderName, buildId);
          addTerminalLog(`Build ID ${buildId} saved for ${branchData.branchName} branch`);
        } else {
          addTerminalLog(`Warning: Could not retrieve build ID for ${branchData.branchName} branch`);
        }
      } catch (err) {
        addTerminalLog(`Error saving build ID: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error('Build ID save error:', err);
      }

      setCurrentStep('completed');
      addTerminalLog('Installation completed successfully!');

      // Clear session storage
      sessionStorage.removeItem('installBranchData');

    } catch (err) {
      addTerminalLog(`Error during copy process: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err.message : 'Failed to copy files');
      setCurrentStep('error');
    }
  };

  const handleReturnToManaged = () => {
    navigate('/managed-environment');
  };

  const handleRetry = () => {
    setError(null);
    setCurrentStep('verification');
    setProgress(0);
    setCurrentFile('');
    setTerminalLogs([]);
    if (branchData) {
      startInstallationProcess();
    }
  };

  if (!branchData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Loading installation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Installing {branchData.branchName} Branch</h1>
          <p className="text-gray-400">Copying files from Steam installation to managed environment</p>
        </div>

        {/* Branch Verification Dialog */}
        {showBranchVerification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-white mb-4">Branch Verification Required</h3>
              <p className="text-gray-300 mb-4">
                Please switch to the <strong>{branchData.steamBranchKey}</strong> branch in Steam before continuing.
              </p>
              <p className="text-gray-400 text-sm mb-6">
                1. Open Steam<br/>
                2. Right-click on Schedule I<br/>
                3. Select Properties<br/>
                4. Go to Betas tab<br/>
                5. Select the {branchData.steamBranchKey} branch<br/>
                6. Wait for the download to complete
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleBranchVerificationConfirm}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  I've Switched the Branch
                </button>
                <button
                  onClick={() => navigate('/managed-environment')}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Progress Section */}
        <div className="card mb-6">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-white">Installation Progress</h2>
              <span className="text-sm text-gray-400">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {currentFile && (
            <div className="mb-4">
              <p className="text-sm text-gray-400">Current File:</p>
              <p className="text-sm text-gray-300 font-mono break-all">{currentFile}</p>
            </div>
          )}

          <div className="flex space-x-3">
            {currentStep === 'completed' && (
              <button
                onClick={handleReturnToManaged}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Return to Managed Environment
              </button>
            )}
            {currentStep === 'error' && (
              <button
                onClick={handleRetry}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Retry Installation
              </button>
            )}
            {currentStep === 'error' && (
              <button
                onClick={handleReturnToManaged}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Return to Managed Environment
              </button>
            )}
          </div>
        </div>

        {/* Terminal Output */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Terminal Output</h2>
          <div className="bg-black rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
            {terminalLogs.length === 0 ? (
              <p className="text-gray-500">Waiting for installation to start...</p>
            ) : (
              terminalLogs.map((log, index) => (
                <div key={index} className="text-green-400 mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopyProgress;
