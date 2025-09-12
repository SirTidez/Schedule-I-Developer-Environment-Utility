/**
 * Steam Login Step Component for Schedule I Developer Environment Utility
 * 
 * Handles Steam account authentication for SteamCMD integration. Provides
 * secure login interface with Steam Guard support and credential management.
 * 
 * Key features:
 * - Steam process detection and warnings
 * - Username/password input with validation
 * - Steam Guard authentication handling
 * - Secure credential storage options
 * - Real-time login progress feedback
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import React, { useState, useEffect } from 'react';

interface SteamLoginStepProps {
  onLoginSuccess: (credentials: { username: string; password: string; stayLoggedIn: boolean }) => void;
  onSkipLogin: () => void;
  steamCMDPath: string | null;
  useSteamCMD: boolean;
}

interface SteamProcessStatus {
  isRunning: boolean;
  processName: string;
  pid?: number;
  error?: string;
}

interface LoginStatus {
  isLoggingIn: boolean;
  isSuccess: boolean;
  error: string | null;
  steamGuardRequired: boolean;
  progress: string;
}

const SteamLoginStep: React.FC<SteamLoginStepProps> = ({
  onLoginSuccess,
  onSkipLogin,
  steamCMDPath,
  useSteamCMD
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [steamProcess, setSteamProcess] = useState<SteamProcessStatus | null>(null);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>({
    isLoggingIn: false,
    isSuccess: false,
    error: null,
    steamGuardRequired: false,
    progress: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  // Check Steam process status on mount
  useEffect(() => {
    checkSteamProcess();
  }, []);

  const checkSteamProcess = async () => {
    try {
      const result = await window.electronAPI?.steam?.detectSteamProcess();
      setSteamProcess(result);
    } catch (error) {
      console.error('Error checking Steam process:', error);
      setSteamProcess({
        isRunning: false,
        processName: 'unknown',
        error: 'Failed to check Steam process'
      });
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setLoginStatus(prev => ({
        ...prev,
        error: 'Please enter both username and password'
      }));
      return;
    }

    if (!steamCMDPath) {
      setLoginStatus(prev => ({
        ...prev,
        error: 'SteamCMD path not configured'
      }));
      return;
    }

    setLoginStatus({
      isLoggingIn: true,
      isSuccess: false,
      error: null,
      steamGuardRequired: false,
      progress: 'Initializing SteamCMD...'
    });

    try {
      // Check Steam process again before login
      await checkSteamProcess();
      if (steamProcess?.isRunning) {
        setLoginStatus(prev => ({
          ...prev,
          isLoggingIn: false,
          error: 'Steam is still running. Please close Steam and try again.'
        }));
        return;
      }

      setLoginStatus(prev => ({
        ...prev,
        progress: 'Attempting login...'
      }));

      // Attempt SteamCMD login
      const result = await window.electronAPI?.steamcmd?.login(steamCMDPath, username, password);
      
      if (result.success) {
        setLoginStatus({
          isLoggingIn: false,
          isSuccess: true,
          error: null,
          steamGuardRequired: false,
          progress: 'Login successful!'
        });

        // Store credentials if requested
        if (stayLoggedIn) {
          await window.electronAPI?.steamcmd?.storeCredentials({
            username,
            password,
            stayLoggedIn: true
          });
        }

        // Notify parent component
        onLoginSuccess({ username, password, stayLoggedIn });
      } else if (result.steamGuardRequired) {
        setLoginStatus(prev => ({
          ...prev,
          isLoggingIn: false,
          steamGuardRequired: true,
          progress: 'Steam Guard confirmation required'
        }));
      } else {
        setLoginStatus(prev => ({
          ...prev,
          isLoggingIn: false,
          error: result.error || 'Login failed'
        }));
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginStatus(prev => ({
        ...prev,
        isLoggingIn: false,
        error: error instanceof Error ? error.message : 'Login failed'
      }));
    }
  };

  const handleSteamGuardConfirm = async () => {
    setLoginStatus(prev => ({
      ...prev,
      isLoggingIn: true,
      progress: 'Waiting for Steam Guard confirmation...'
    }));

    try {
      const result = await window.electronAPI?.steamcmd?.confirmSteamGuard(steamCMDPath!, username, password);
      
      if (result.success) {
        setLoginStatus({
          isLoggingIn: false,
          isSuccess: true,
          error: null,
          steamGuardRequired: false,
          progress: 'Login successful!'
        });

        // Store credentials if requested
        if (stayLoggedIn) {
          await window.electronAPI?.steamcmd?.storeCredentials({
            username,
            password,
            stayLoggedIn: true
          });
        }

        // Notify parent component
        onLoginSuccess({ username, password, stayLoggedIn });
      } else {
        setLoginStatus(prev => ({
          ...prev,
          isLoggingIn: false,
          error: result.error || 'Steam Guard confirmation failed'
        }));
      }
    } catch (error) {
      console.error('Steam Guard confirmation error:', error);
      setLoginStatus(prev => ({
        ...prev,
        isLoggingIn: false,
        error: error instanceof Error ? error.message : 'Steam Guard confirmation failed'
      }));
    }
  };

  const handleSkip = () => {
    onSkipLogin();
  };

  // Show skip option if SteamCMD is not enabled or if user wants to skip login
  if (!useSteamCMD) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-gray-300">
            SteamCMD integration is disabled. You can skip this step and continue with manual file copying.
          </p>
          <button
            onClick={handleSkip}
            className="mt-4 btn-primary"
          >
            Continue with Manual Copying
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Steam Account Login</h3>
        <p className="text-gray-300 mb-4">
          Log in to your Steam account to enable automated branch downloading with SteamCMD.
          Your credentials will be used securely and can be stored locally if you choose.
        </p>
      </div>

      {/* Steam Process Warning */}
      {steamProcess?.isRunning && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-red-400 text-xl">⚠️</div>
            <div>
              <h4 className="font-semibold text-red-300 mb-2">Steam is Currently Running</h4>
              <p className="text-red-200 text-sm mb-3">
                Steam is currently running on your system. Steam accounts can only be logged in 
                to one place at a time. Please close Steam before continuing with the login process.
              </p>
              <div className="text-sm text-red-200">
                <p>Process: {steamProcess.processName}</p>
                {steamProcess.pid && <p>PID: {steamProcess.pid}</p>}
              </div>
              <button
                onClick={checkSteamProcess}
                className="mt-3 btn-secondary text-sm"
              >
                Check Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Form */}
      {!loginStatus.isSuccess && !steamProcess?.isRunning && (
        <div className="space-y-4">
          <div>
            <label htmlFor="steam-username" className="block text-sm font-medium mb-2">
              Steam Username
            </label>
            <input
              id="steam-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your Steam username"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loginStatus.isLoggingIn}
            />
          </div>

          <div>
            <label htmlFor="steam-password" className="block text-sm font-medium mb-2">
              Steam Password
            </label>
            <div className="relative">
              <input
                id="steam-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your Steam password"
                className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loginStatus.isLoggingIn}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                disabled={loginStatus.isLoggingIn}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <input
              id="stay-logged-in"
              type="checkbox"
              checked={stayLoggedIn}
              onChange={(e) => setStayLoggedIn(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              disabled={loginStatus.isLoggingIn}
            />
            <label htmlFor="stay-logged-in" className="text-sm text-gray-300">
              Stay logged in (store credentials securely)
            </label>
          </div>

          {/* Data Handling Explanation */}
          {stayLoggedIn && (
            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
              <h5 className="font-semibold text-blue-300 mb-2">Data Handling Information:</h5>
              <ul className="text-sm text-blue-200 space-y-1 list-disc list-inside">
                <li>Your credentials will be encrypted using SHA512 encryption</li>
                <li>Credentials are stored locally on your computer only</li>
                <li>We never transmit your credentials over the internet</li>
                <li>You can clear stored credentials at any time</li>
                <li>Credentials are stored in: {window.electronAPI?.config?.getConfigDir?.() || 'config directory'}</li>
              </ul>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleLogin}
              disabled={loginStatus.isLoggingIn || !username.trim() || !password.trim()}
              className="btn-primary flex-1"
            >
              {loginStatus.isLoggingIn ? 'Logging In...' : 'Login to Steam'}
            </button>
            <button
              onClick={handleSkip}
              disabled={loginStatus.isLoggingIn}
              className="btn-secondary"
            >
              Skip Login
            </button>
          </div>
        </div>
      )}

      {/* Steam Guard Confirmation */}
      {loginStatus.steamGuardRequired && (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-yellow-400 text-xl">🔐</div>
            <div>
              <h4 className="font-semibold text-yellow-300 mb-2">Steam Guard Authentication Required</h4>
              <p className="text-yellow-200 text-sm mb-4">
                Your Steam account is protected by Steam Guard. Please check your Steam Mobile app 
                and confirm the login request.
              </p>
              <button
                onClick={handleSteamGuardConfirm}
                disabled={loginStatus.isLoggingIn}
                className="btn-primary"
              >
                {loginStatus.isLoggingIn ? 'Confirming...' : 'I Have Confirmed in Steam Mobile App'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Progress */}
      {loginStatus.isLoggingIn && (
        <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-blue-300">{loginStatus.progress}</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {loginStatus.isSuccess && (
        <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="text-green-400 text-xl">✅</div>
            <div>
              <h4 className="font-semibold text-green-300">Login Successful!</h4>
              <p className="text-green-200 text-sm">
                You are now logged in as <strong>{username}</strong>. 
                {stayLoggedIn ? ' Your credentials have been stored securely.' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {loginStatus.error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-red-400 text-xl">❌</div>
            <div>
              <h4 className="font-semibold text-red-300">Login Failed</h4>
              <p className="text-red-200 text-sm">{loginStatus.error}</p>
              <button
                onClick={() => setLoginStatus(prev => ({ ...prev, error: null }))}
                className="mt-2 btn-secondary text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SteamLoginStep;
