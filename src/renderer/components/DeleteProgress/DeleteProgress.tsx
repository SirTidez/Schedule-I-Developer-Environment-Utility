import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFileService } from '../../hooks/useFileService';
import { useConfigService } from '../../hooks/useConfigService';

interface BranchData {
  branchName: string;
  steamBranchKey: string;
  folderName: string;
  steamLibraryPath: string;
  managedEnvironmentPath: string;
  gameInstallPath: string;
  branchPath: string;
}

const DeleteProgress: React.FC = () => {
  const navigate = useNavigate();
  const { deleteDirectory } = useFileService();
  const { updateConfig, config } = useConfigService();

  const [branchData, setBranchData] = useState<BranchData | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'init' | 'deleting' | 'complete' | 'error'>('init');
  const [showConfirmation, setShowConfirmation] = useState(true);

  const terminalRef = useRef<HTMLDivElement>(null);

  const addTerminalLog = (message: string) => {
    setTerminalLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  useEffect(() => {
    // Load branch data from session storage
    const storedData = sessionStorage.getItem('deleteBranchData');
    if (storedData) {
      setBranchData(JSON.parse(storedData));
    } else {
      navigate('/managed-environment');
    }
  }, [navigate]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const startDeleteProcess = async () => {
    if (!branchData) return;

    setShowConfirmation(false);
    setCurrentStep('deleting');
    addTerminalLog(`Starting deletion of branch: ${branchData.branchName}`);
    setError(null);
    setProgress(0);
    setCurrentFile('');
    setTerminalLogs([]);

    try {
      addTerminalLog(`Deleting branch directory: ${branchData.branchPath}`);
      setCurrentFile('Deleting branch directory...');
      
      // Delete the branch directory
      await deleteDirectory(branchData.branchPath);
      
      addTerminalLog('Branch directory deleted successfully!');
      setProgress(100);

      // Update configuration to remove the branch
      if (config) {
        const updatedConfig = { ...config };
        
        // Remove from selectedBranches if present
        updatedConfig.selectedBranches = updatedConfig.selectedBranches.filter(
          branch => branch !== branchData.folderName
        );
        
        // Remove from branchBuildIds if present
        if (updatedConfig.branchBuildIds[branchData.folderName]) {
          delete updatedConfig.branchBuildIds[branchData.folderName];
        }
        
        // Update lastUpdated timestamp
        updatedConfig.lastUpdated = new Date().toISOString();
        
        await updateConfig(updatedConfig);
        addTerminalLog('Configuration updated successfully!');
      }

      setCurrentStep('complete');
      addTerminalLog('Deletion completed successfully!');
      
      // Clear session storage
      sessionStorage.removeItem('deleteBranchData');
    } catch (err) {
      addTerminalLog(`Error during deletion: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err.message : 'Deletion failed');
      setCurrentStep('error');
    }
  };

  const handleReturnToManagedEnvironment = () => {
    navigate('/managed-environment');
  };

  const handleRetry = () => {
    setError(null);
    setProgress(0);
    setCurrentFile('');
    setTerminalLogs([]);
    setCurrentStep('init');
    setShowConfirmation(true);
  };

  if (!branchData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading branch data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6 text-white">Deleting {branchData.branchName}</h1>

      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md text-center">
            <div className="mb-6">
              <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h2 className="text-2xl font-bold text-red-400 mb-4">Confirm Deletion</h2>
              <p className="text-gray-300 mb-4">
                Are you sure you want to delete the <span className="font-semibold text-blue-400">{branchData.branchName}</span> branch?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                This will permanently remove all files in: <br />
                <span className="font-mono text-xs">{branchData.branchPath}</span>
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/managed-environment')}
                className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={startDeleteProcess}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Branch
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Deletion Progress</h2>
        <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
          <div
            className="bg-red-600 h-4 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-gray-300 text-sm mb-2">
          {currentStep === 'deleting' ? `Deleting: ${currentFile}` : `Status: ${currentStep.charAt(0).toUpperCase() + currentStep.slice(1)}`}
        </p>
        <p className="text-gray-400 text-xs">Progress: {progress.toFixed(1)}%</p>
      </div>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Terminal Output</h2>
        <div ref={terminalRef} className="bg-gray-800 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm text-gray-200">
          {terminalLogs.map((log, index) => (
            <p key={index} className="mb-1">{log}</p>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        {currentStep === 'error' && (
          <button onClick={handleRetry} className="btn-secondary">
            Retry
          </button>
        )}
        {(currentStep === 'complete' || currentStep === 'error') && (
          <button onClick={handleReturnToManagedEnvironment} className="btn-primary">
            Return to Managed Environment
          </button>
        )}
      </div>
    </div>
  );
};

export default DeleteProgress;
