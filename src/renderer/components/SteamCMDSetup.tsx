/**
 * SteamCMD Setup Component for Schedule I Developer Environment Utility
 * 
 * This component is shown first when the application starts, allowing users to
 * configure SteamCMD before proceeding to the main application interface.
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

interface SteamCMDSetupProps {
  onSetupComplete: (useSteamCMD: boolean, steamCMDPath: string | null) => void;
}

const SteamCMDSetup: React.FC<SteamCMDSetupProps> = ({ onSetupComplete }) => {
  const [steamCMDPath, setSteamCMDPath] = useState('');
  const [useSteamCMD, setUseSteamCMD] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [showSteamLogin, setShowSteamLogin] = useState(false);
  const [steamUsername, setSteamUsername] = useState('');
  const [steamPassword, setSteamPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [steamGuardRequired, setSteamGuardRequired] = useState(false);
  const [steamGuardMessage, setSteamGuardMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load existing configuration if available
    const loadConfig = async () => {
      try {
        const config = await window.electronAPI?.config?.getConfig();
        if (config) {
          setSteamCMDPath(config.steamCMDPath || '');
          setUseSteamCMD(config.useSteamCMD || false);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };
    loadConfig();

    // Set up SteamCMD progress listener
    const handleSteamCMDProgress = (progress: any) => {
      console.log('SteamCMD progress:', progress);
      if (progress.type === 'steam-guard') {
        setSteamGuardRequired(true);
        setSteamGuardMessage(progress.message);
      }
    };

    window.electronAPI?.onSteamCMDProgress?.(handleSteamCMDProgress);

    // Cleanup listener on unmount
    return () => {
      window.electronAPI?.removeSteamCMDProgressListener?.();
    };
  }, []);

  const handleSteamCMDPathChange = (path: string) => {
    console.log('SteamCMD path changed to:', path);
    setSteamCMDPath(path);
    setValidationError(null);
    setValidationSuccess(false);
  };

  const handleBrowseForSteamCMD = async () => {
    console.log('Opening file dialog...');
    try {
      const result = await window.electronAPI?.dialog?.openFile({
        title: 'Select SteamCMD Executable',
        filters: [
          { name: 'Executable Files', extensions: ['exe'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      console.log('File dialog result:', result);

      if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0];
        console.log('Selected path:', selectedPath);
        setSteamCMDPath(selectedPath);
        setValidationError(null);
        setValidationSuccess(false);
      } else {
        console.log('No file selected or dialog canceled');
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error);
    }
  };

  const handleValidateSteamCMD = async () => {
    console.log('Validating SteamCMD path:', steamCMDPath);
    
    if (!steamCMDPath.trim()) {
      setValidationError('Please enter a SteamCMD path');
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setValidationSuccess(false);

    try {
      console.log('Calling steamcmd:validate-installation with path:', steamCMDPath);
      const result = await window.electronAPI?.steamcmd?.validateInstallation(steamCMDPath);
      console.log('Validation result:', result);
      
      if (result?.success) {
        setValidationSuccess(true);
        setValidationError(null);
        setShowSteamLogin(true);
        console.log('Validation successful - showing Steam login');
      } else {
        setValidationError(result?.error || 'Validation failed');
        setValidationSuccess(false);
        console.log('Validation failed:', result?.error);
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidationError(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setValidationSuccess(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSteamLogin = async () => {
    if (!steamUsername.trim() || !steamPassword.trim()) {
      setLoginError('Please enter both username and password');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);
    setLoginSuccess(false);
    setSteamGuardRequired(false);
    setSteamGuardMessage(null);

    try {
      console.log('Attempting Steam login...');
      const result = await window.electronAPI?.steamcmd?.login(steamCMDPath, steamUsername, steamPassword);
      console.log('Login result:', result);
      
      if (result?.success) {
        setLoginSuccess(true);
        setLoginError(null);
        setSteamGuardRequired(false);
        console.log('Steam login successful');
        // Auto-continue after successful login
        setTimeout(() => {
          onSetupComplete(useSteamCMD, steamCMDPath);
        }, 1500);
      } else {
        if (result?.requiresSteamGuard) {
          setSteamGuardRequired(true);
          setSteamGuardMessage(result?.error || 'Steam Guard authentication required');
          setLoginError(null);
        } else {
          setLoginError(result?.error || 'Login failed');
          setSteamGuardRequired(false);
        }
        setLoginSuccess(false);
        console.log('Steam login failed:', result?.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(`Login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoginSuccess(false);
      setSteamGuardRequired(false);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSkipSteamLogin = () => {
    onSetupComplete(useSteamCMD, steamCMDPath);
  };

  const handleContinue = () => {
    onSetupComplete(useSteamCMD, useSteamCMD ? steamCMDPath : null);
  };

  const handleSkip = () => {
    onSetupComplete(false, null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Schedule I Developer Environment</h1>
          <p className="text-xl text-gray-300 mb-8">
            Configure SteamCMD for automated branch management
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <div className="flex items-start space-x-4 mb-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚙️</span>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-3">SteamCMD Integration</h2>
              <p className="text-gray-300 mb-4">
                SteamCMD allows you to automatically download and update game branches directly from Steam,
                eliminating the need for manual file copying and ensuring you always have the latest versions.
              </p>
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-300 mb-2">Benefits of using SteamCMD:</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Automatic branch downloading and updating</li>
                  <li>• Always get the latest game files</li>
                  <li>• Faster setup and updates</li>
                  <li>• No manual file copying required</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Enable/Disable SteamCMD */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="useSteamCMD"
                checked={useSteamCMD}
                onChange={(e) => setUseSteamCMD(e.target.checked)}
                className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="useSteamCMD" className="text-lg font-medium">
                Enable SteamCMD for automated branch management
              </label>
            </div>

            {/* SteamCMD Path Input */}
            {useSteamCMD && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    SteamCMD Installation Path
                  </label>
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={steamCMDPath}
                      onChange={(e) => handleSteamCMDPathChange(e.target.value)}
                      placeholder="C:\SteamCMD\steamcmd.exe"
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleBrowseForSteamCMD}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                    >
                      Browse
                    </button>
                    <button
                      onClick={handleValidateSteamCMD}
                      disabled={!steamCMDPath.trim() || isValidating}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      {isValidating ? 'Validating...' : 'Validate'}
                    </button>
                  </div>
                </div>

                {/* Validation Results */}
                {validationError && (
                  <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-300 text-sm">{validationError}</p>
                  </div>
                )}

                {validationSuccess && (
                  <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3">
                    <p className="text-green-300 text-sm">✓ SteamCMD installation is valid</p>
                  </div>
                )}

                {/* Steam Login Section */}
                {showSteamLogin && (
                  <div className="bg-gray-700/50 rounded-lg p-6 mt-6">
                    <h3 className="text-lg font-semibold mb-4">Steam Login Required</h3>
                    <p className="text-sm text-gray-300 mb-4">
                      To use SteamCMD for automated branch management, you need to log in to your Steam account.
                      Your credentials will be stored securely and encrypted.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Steam Username
                        </label>
                        <input
                          type="text"
                          value={steamUsername}
                          onChange={(e) => setSteamUsername(e.target.value)}
                          placeholder="Enter your Steam username"
                          className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Steam Password
                        </label>
                        <input
                          type="password"
                          value={steamPassword}
                          onChange={(e) => setSteamPassword(e.target.value)}
                          placeholder="Enter your Steam password"
                          className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Login Results */}
                      {loginError && (
                        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3">
                          <p className="text-red-300 text-sm">{loginError}</p>
                        </div>
                      )}

                      {loginSuccess && (
                        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3">
                          <p className="text-green-300 text-sm">✓ Steam login successful! Continuing...</p>
                        </div>
                      )}

                      {steamGuardRequired && (
                        <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm">!</span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-yellow-300 font-semibold mb-2">Steam Guard Authentication Required</h4>
                              <p className="text-yellow-200 text-sm mb-3">
                                {steamGuardMessage || 'Please confirm the login in your Steam Mobile app.'}
                              </p>
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-300"></div>
                                <span className="text-yellow-200 text-sm">Waiting for confirmation...</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-3">
                        <button
                          onClick={handleSteamLogin}
                          disabled={!steamUsername.trim() || !steamPassword.trim() || isLoggingIn || steamGuardRequired}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                        >
                          {steamGuardRequired ? 'Waiting for Steam Guard...' : isLoggingIn ? 'Logging in...' : 'Login to Steam'}
                        </button>
                        <button
                          onClick={handleSkipSteamLogin}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                        >
                          Skip Login
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SteamCMD Download Link */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Don't have SteamCMD?</h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Download SteamCMD from the official Steam developer website:
                  </p>
                  <a
                    href="https://developer.valvesoftware.com/wiki/SteamCMD"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-sm"
                  >
                    Download SteamCMD
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            )}

            {/* Alternative Option */}
            {!useSteamCMD && (
              <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-300 mb-2">Using Manual Copy Method</h3>
                <p className="text-sm text-gray-300">
                  You can still use the application with manual file copying. You'll need to manually
                  copy game files from your Steam installation to the managed environment.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handleSkip}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
          >
            Skip SteamCMD
          </button>
          <button
            onClick={handleContinue}
            disabled={useSteamCMD && (!steamCMDPath.trim() || !validationSuccess)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default SteamCMDSetup;
