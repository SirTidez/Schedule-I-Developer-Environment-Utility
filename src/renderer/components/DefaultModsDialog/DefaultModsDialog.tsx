import React, { useState, useEffect } from 'react';
import { useFileService } from '../../hooks/useFileService';

interface BranchInfo {
  name: string;
  folderName: string;
  isInstalled: boolean;
  compilationType: 'Il2Cpp' | 'Mono';
}

interface DefaultModsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStartInstallation: (selectedBranches: string[]) => void;
  branches: BranchInfo[];
  managedEnvironmentPath: string;
}

const DefaultModsDialog: React.FC<DefaultModsDialogProps> = ({
  isOpen,
  onClose,
  onStartInstallation,
  branches,
  managedEnvironmentPath
}) => {
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [defaultModsPath, setDefaultModsPath] = useState<string>('');
  const [hasDefaultMods, setHasDefaultMods] = useState<boolean>(false);
  const [checkingFiles, setCheckingFiles] = useState<boolean>(false);
  const { checkFileExists } = useFileService();

  const checkForDefaultMods = async () => {
    setCheckingFiles(true);
    try {
      // Check if any of the default mods directories have files
      const il2cppModsPath = `${managedEnvironmentPath}/Default Mods/Il2Cpp/Mods`;
      const il2cppPluginsPath = `${managedEnvironmentPath}/Default Mods/Il2Cpp/Plugins`;
      const il2cppUserLibsPath = `${managedEnvironmentPath}/Default Mods/Il2Cpp/UserLibs`;
      const monoModsPath = `${managedEnvironmentPath}/Default Mods/Mono/Mods`;
      const monoPluginsPath = `${managedEnvironmentPath}/Default Mods/Mono/Plugins`;
      const monoUserLibsPath = `${managedEnvironmentPath}/Default Mods/Mono/UserLibs`;

      // Check if directories exist and have content
      const paths = [il2cppModsPath, il2cppPluginsPath, il2cppUserLibsPath, monoModsPath, monoPluginsPath, monoUserLibsPath];
      
      let hasFiles = false;
      for (const path of paths) {
        const exists = await checkFileExists(path);
        if (exists) {
          hasFiles = true;
          break;
        }
      }
      
      setHasDefaultMods(hasFiles);
    } catch (error) {
      console.error('Error checking for default mods:', error);
      setHasDefaultMods(false);
    } finally {
      setCheckingFiles(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset selections when dialog opens
      setSelectedBranches([]);
      // Set default mods path based on config
      setDefaultModsPath(`${managedEnvironmentPath}/Default Mods`);
      // Check for default mods files
      checkForDefaultMods();
    }
  }, [isOpen, managedEnvironmentPath]);

  const handleBranchToggle = (branchName: string) => {
    setSelectedBranches(prev => 
      prev.includes(branchName) 
        ? prev.filter(name => name !== branchName)
        : [...prev, branchName]
    );
  };

  const handleSelectAll = () => {
    const installedBranches = branches.filter(branch => branch.isInstalled).map(branch => branch.name);
    setSelectedBranches(installedBranches);
  };

  const handleSelectNone = () => {
    setSelectedBranches([]);
  };

  const handleInstall = () => {
    if (selectedBranches.length === 0) {
      alert('Please select at least one branch to install default mods to.');
      return;
    }
    onStartInstallation(selectedBranches);
  };

  const getCompilationTypeColor = (type: 'Il2Cpp' | 'Mono') => {
    return type === 'Il2Cpp' ? 'text-blue-400' : 'text-green-400';
  };

  const getCompilationTypeIcon = (type: 'Il2Cpp' | 'Mono') => {
    return type === 'Il2Cpp' ? (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Install Default Mods</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            Select which branches to install default mods to. Default mods will be copied from the 
            <span className="font-semibold text-blue-400"> Default Mods</span> folder to each selected branch.
          </p>
          
          <div className="bg-gray-700 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">Compilation Types</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-blue-400">●</span>
                <span className="text-gray-300">Main & Beta branches use <span className="font-semibold text-blue-400">Il2Cpp</span> compilation</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-400">●</span>
                <span className="text-gray-300">Alternate branches use <span className="font-semibold text-green-400">Mono</span> compilation</span>
              </div>
            </div>
          </div>

          {/* Default Mods Status */}
          <div className={`p-4 rounded-lg mb-4 ${
            checkingFiles ? 'bg-yellow-900/20 border border-yellow-500/50' :
            hasDefaultMods ? 'bg-green-900/20 border border-green-500/50' :
            'bg-red-900/20 border border-red-500/50'
          }`}>
            <div className="flex items-center space-x-2">
              {checkingFiles ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                  <span className="text-yellow-400">Checking for default mods files...</span>
                </>
              ) : hasDefaultMods ? (
                <>
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-400">Default mods files found in: {defaultModsPath}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-400">No default mods files found in: {defaultModsPath}</span>
                </>
              )}
            </div>
            {!hasDefaultMods && !checkingFiles && (
              <p className="text-sm text-gray-400 mt-2">
                Place your mod files in the Default Mods/Il2Cpp/ or Default Mods/Mono/ folders to use this feature.
              </p>
            )}
          </div>

          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
            >
              Select All Installed
            </button>
            <button
              onClick={handleSelectNone}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
            >
              Select None
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Available Branches</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {branches.map((branch) => (
              <div
                key={branch.name}
                className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                  branch.isInstalled 
                    ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' 
                    : 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedBranches.includes(branch.name)}
                  onChange={() => handleBranchToggle(branch.name)}
                  disabled={!branch.isInstalled}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-white">{branch.name}</span>
                    <div className={`flex items-center space-x-1 ${getCompilationTypeColor(branch.compilationType)}`}>
                      {getCompilationTypeIcon(branch.compilationType)}
                      <span className="text-xs">{branch.compilationType}</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    Folder: {branch.folderName}
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  branch.isInstalled ? 'bg-green-500' : 'bg-red-500'
                }`} title={branch.isInstalled ? 'Installed' : 'Not installed'}></div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInstall}
            disabled={selectedBranches.length === 0 || !hasDefaultMods || checkingFiles}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedBranches.length === 0 || !hasDefaultMods || checkingFiles
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {checkingFiles ? 'Checking files...' : 
             !hasDefaultMods ? 'No Default Mods Found' :
             `Install to ${selectedBranches.length} Branch${selectedBranches.length !== 1 ? 'es' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DefaultModsDialog;
