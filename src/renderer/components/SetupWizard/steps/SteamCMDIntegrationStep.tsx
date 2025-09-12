/**
 * SteamCMD Integration Step Component for Schedule I Developer Environment Utility
 * 
 * Allows users to configure SteamCMD for automated branch downloading and updating.
 * Provides options to install SteamCMD, configure the installation path, or continue
 * with the existing copy-based approach.
 * 
 * Key features:
 * - SteamCMD installation guidance and link
 * - Path selection for SteamCMD installation
 * - Validation of SteamCMD installation
 * - Option to skip SteamCMD and use copy method
 * - Clear explanation of benefits and requirements
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import React, { useState, useEffect } from 'react';

interface SteamCMDIntegrationStepProps {
  onSteamCMDPathSelected: (steamCMDPath: string | null) => void;
  onUseSteamCMD: (useSteamCMD: boolean) => void;
  selectedSteamCMDPath?: string | null;
  useSteamCMD?: boolean;
}

const SteamCMDIntegrationStep: React.FC<SteamCMDIntegrationStepProps> = ({
  onSteamCMDPathSelected,
  onUseSteamCMD,
  selectedSteamCMDPath = null,
  useSteamCMD = false
}) => {
  const [steamCMDPath, setSteamCMDPath] = useState(selectedSteamCMDPath || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState(false);

  useEffect(() => {
    onSteamCMDPathSelected(steamCMDPath);
    onUseSteamCMD(useSteamCMD);
  }, [steamCMDPath, useSteamCMD, onSteamCMDPathSelected, onUseSteamCMD]);

  const handleSteamCMDPathChange = (path: string) => {
    setSteamCMDPath(path);
    setValidationError(null);
    setValidationSuccess(false);
  };

  const handleBrowseForSteamCMD = async () => {
    try {
      // This will be implemented with IPC handlers
      const result = await window.electronAPI?.dialog?.showOpenDialog({
        title: 'Select SteamCMD Installation Directory',
        properties: ['openDirectory'],
        defaultPath: 'C:\\SteamCMD'
      });

      if (result && !result.canceled && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0];
        setSteamCMDPath(selectedPath);
        setValidationError(null);
        setValidationSuccess(false);
      }
    } catch (error) {
      console.error('Error browsing for SteamCMD:', error);
      setValidationError('Failed to browse for SteamCMD directory');
    }
  };

  const handleValidateSteamCMD = async () => {
    if (!steamCMDPath.trim()) {
      setValidationError('Please enter a SteamCMD path');
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setValidationSuccess(false);

    try {
      // This will be implemented with IPC handlers
      const isValid = await window.electronAPI?.steamcmd?.validateInstallation(steamCMDPath);
      
      if (isValid) {
        setValidationSuccess(true);
        setValidationError(null);
      } else {
        setValidationError('SteamCMD installation not found or invalid');
        setValidationSuccess(false);
      }
    } catch (error) {
      console.error('Error validating SteamCMD:', error);
      setValidationError('Failed to validate SteamCMD installation');
      setValidationSuccess(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleUseSteamCMDToggle = (use: boolean) => {
    onUseSteamCMD(use);
  };

  const openSteamCMDDownload = () => {
    window.electronAPI?.shell?.openExternal('https://developer.valvesoftware.com/wiki/SteamCMD');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">SteamCMD Integration (Optional)</h3>
        <p className="text-gray-300 mb-4">
          SteamCMD is a command-line tool from Steam that can automatically download and update 
          game branches. This provides faster and more reliable branch management compared to 
          copying files manually.
        </p>
      </div>

      {/* Benefits and Requirements */}
      <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
        <h4 className="font-semibold text-blue-300 mb-2">Benefits of SteamCMD:</h4>
        <ul className="text-sm text-blue-200 space-y-1 list-disc list-inside">
          <li>Faster branch downloads and updates</li>
          <li>Automatic delta updates (only downloads changed files)</li>
          <li>More reliable than manual file copying</li>
          <li>Built-in Steam authentication and validation</li>
          <li>Supports all Steam branch types and configurations</li>
        </ul>
      </div>

      {/* Installation Options */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <input
            type="radio"
            id="use-steamcmd"
            name="steamcmd-option"
            checked={useSteamCMD}
            onChange={() => handleUseSteamCMDToggle(true)}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
          />
          <label htmlFor="use-steamcmd" className="text-white font-medium">
            Use SteamCMD for automated branch management
          </label>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="radio"
            id="use-copy"
            name="steamcmd-option"
            checked={!useSteamCMD}
            onChange={() => handleUseSteamCMDToggle(false)}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
          />
          <label htmlFor="use-copy" className="text-white font-medium">
            Continue with manual file copying (current method)
          </label>
        </div>
      </div>

      {/* SteamCMD Configuration */}
      {useSteamCMD && (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">SteamCMD Installation</h4>
            <p className="text-gray-300 text-sm mb-4">
              If you don't have SteamCMD installed, you can download it from the official Steam documentation.
            </p>
            
            <div className="flex items-center space-x-3 mb-4">
              <button
                onClick={openSteamCMDDownload}
                className="btn-secondary text-sm"
              >
                Download SteamCMD
              </button>
              <span className="text-xs text-gray-400">
                Opens SteamCMD documentation page
              </span>
            </div>
          </div>

          {/* Path Selection */}
          <div>
            <label htmlFor="steamcmd-path" className="block text-sm font-medium mb-2">
              SteamCMD Installation Path
            </label>
            <div className="flex space-x-2">
              <input
                id="steamcmd-path"
                type="text"
                value={steamCMDPath}
                onChange={(e) => handleSteamCMDPathChange(e.target.value)}
                placeholder="C:\SteamCMD or /path/to/steamcmd"
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleBrowseForSteamCMD}
                className="btn-secondary"
              >
                Browse
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Enter the directory where SteamCMD is installed (should contain steamcmd.exe)
            </p>
          </div>

          {/* Validation */}
          {steamCMDPath && (
            <div className="space-y-2">
              <button
                onClick={handleValidateSteamCMD}
                disabled={isValidating || !steamCMDPath.trim()}
                className="btn-primary text-sm"
              >
                {isValidating ? 'Validating...' : 'Validate Installation'}
              </button>

              {validationSuccess && (
                <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3">
                  <p className="text-green-300 text-sm">
                    ✓ SteamCMD installation validated successfully
                  </p>
                </div>
              )}

              {validationError && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                  <p className="text-red-300 text-sm">
                    {validationError}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Requirements */}
          <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
            <h5 className="font-semibold text-yellow-300 mb-2">Requirements:</h5>
            <ul className="text-sm text-yellow-200 space-y-1 list-disc list-inside">
              <li>SteamCMD must be installed and accessible</li>
              <li>Valid Steam account with access to Schedule I</li>
              <li>Internet connection for downloading branches</li>
              <li>Sufficient disk space for branch downloads</li>
            </ul>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
        <h5 className="font-semibold text-gray-200 mb-2">Current Selection:</h5>
        <p className="text-sm text-gray-300">
          {useSteamCMD ? (
            steamCMDPath ? (
              `Using SteamCMD from: ${steamCMDPath}`
            ) : (
              'SteamCMD selected but path not configured'
            )
          ) : (
            'Using manual file copying method'
          )}
        </p>
      </div>
    </div>
  );
};

export default SteamCMDIntegrationStep;

