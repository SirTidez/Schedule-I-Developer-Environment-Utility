import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFileService } from '../../hooks/useFileService';

interface DefaultModsData {
  selectedBranches: string[];
  managedEnvironmentPath: string;
}

interface BranchInfo {
  name: string;
  folderName: string;
  compilationType: 'Il2Cpp' | 'Mono';
}

const DefaultModsProgress: React.FC = () => {
  const navigate = useNavigate();
  const { copyDirectory } = useFileService();

  const [defaultModsData, setDefaultModsData] = useState<DefaultModsData | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'init' | 'copying' | 'complete' | 'error'>('init');

  const terminalRef = useRef<HTMLDivElement>(null);

  const addTerminalLog = (message: string) => {
    setTerminalLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  useEffect(() => {
    // Load default mods data from session storage
    const storedData = sessionStorage.getItem('defaultModsData');
    if (storedData) {
      setDefaultModsData(JSON.parse(storedData));
    } else {
      navigate('/managed-environment');
    }
  }, [navigate]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  useEffect(() => {
    if (defaultModsData && currentStep === 'init') {
      startDefaultModsInstallation();
    }
  }, [defaultModsData, currentStep]);

  const getBranchInfo = (branchName: string): BranchInfo => {
    const folderName = branchName.toLowerCase().replace(' ', '-') + '-branch';
    const compilationType = branchName === 'Main' || branchName === 'Beta' ? 'Il2Cpp' : 'Mono';
    return { name: branchName, folderName, compilationType };
  };

  const startDefaultModsInstallation = async () => {
    if (!defaultModsData) return;

    setCurrentStep('copying');
    addTerminalLog(`Starting default mods installation to ${defaultModsData.selectedBranches.length} branch(es)`);
    setError(null);
    setProgress(0);
    setCurrentOperation('');
    setTerminalLogs([]);

    try {
      const totalBranches = defaultModsData.selectedBranches.length;
      let completedBranches = 0;

      for (const branchName of defaultModsData.selectedBranches) {
        const branchInfo = getBranchInfo(branchName);
        const branchPath = `${defaultModsData.managedEnvironmentPath}/branches/${branchInfo.folderName}`;
        
        addTerminalLog(`Processing ${branchInfo.name} branch (${branchInfo.compilationType})...`);
        setCurrentOperation(`Installing to ${branchInfo.name} (${branchInfo.compilationType})`);

        // Copy from Default Mods/{CompilationType} to branch root
        const sourcePath = `${defaultModsData.managedEnvironmentPath}/Default Mods/${branchInfo.compilationType}`;
        const targetPath = branchPath;

        addTerminalLog(`Copying from: ${sourcePath}`);
        addTerminalLog(`Copying to: ${targetPath}`);

        try {
          // Copy Mods folder
          await copyDirectory(`${sourcePath}/Mods`, `${targetPath}/Mods`);
          addTerminalLog(`✓ Copied Mods folder to ${branchInfo.name}`);

          // Copy Plugins folder
          await copyDirectory(`${sourcePath}/Plugins`, `${targetPath}/Plugins`);
          addTerminalLog(`✓ Copied Plugins folder to ${branchInfo.name}`);

          // Copy UserLibs folder
          await copyDirectory(`${sourcePath}/UserLibs`, `${targetPath}/UserLibs`);
          addTerminalLog(`✓ Copied UserLibs folder to ${branchInfo.name}`);

        } catch (copyError) {
          addTerminalLog(`⚠ Warning: Some folders may not exist for ${branchInfo.name}: ${copyError instanceof Error ? copyError.message : 'Unknown error'}`);
        }

        completedBranches++;
        const newProgress = (completedBranches / totalBranches) * 100;
        setProgress(newProgress);
        addTerminalLog(`Completed ${branchInfo.name} (${completedBranches}/${totalBranches})`);
      }

      setCurrentStep('complete');
      addTerminalLog('Default mods installation completed successfully!');
      sessionStorage.removeItem('defaultModsData'); // Clean up session storage

    } catch (err) {
      addTerminalLog(`Error during default mods installation: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err.message : 'Default mods installation failed');
      setCurrentStep('error');
    }
  };

  const handleReturnToManagedEnvironment = () => {
    navigate('/managed-environment');
  };

  const handleRetry = () => {
    setError(null);
    setProgress(0);
    setCurrentOperation('');
    setTerminalLogs([]);
    setCurrentStep('init');
    startDefaultModsInstallation();
  };

  if (!defaultModsData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading default mods data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6 text-white">Installing Default Mods</h1>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Installation Progress</h2>
        <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-gray-300 text-sm mb-2">
          {currentStep === 'copying' ? `Current: ${currentOperation}` : `Status: ${currentStep.charAt(0).toUpperCase() + currentStep.slice(1)}`}
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

export default DefaultModsProgress;
