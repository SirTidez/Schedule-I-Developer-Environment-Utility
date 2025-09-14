/**
 * Steam Login Step Component for Schedule I Developer Environment Utility
 * 
 * Handles Steam account authentication for SteamCMD integration. Provides
 * secure login interface with Steam Guard support. Credentials are used securely
 * for this session only and are not stored on disk.
 * 
 * Key features:
 * - Steam process detection and warnings
 * - Username/password input with validation
 * - Steam Guard authentication handling
 * - Session‑only credential usage (no local storage)
 * - Real-time login progress feedback
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import React, { useState, useEffect } from 'react';

interface SteamLoginStepProps {
  onLoginSuccess: (credentials: { username: string; password: string; stayLoggedIn: boolean }) => void;
  onSkipLogin: () => void;
  depotDownloaderPath: string | null;
  useDepotDownloader: boolean;
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
  depotDownloaderPath,
  useDepotDownloader
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // Session-only; we do not offer stay-logged-in
  const [steamProcess, setSteamProcess] = useState<SteamProcessStatus | null>(null);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>({
    isLoggingIn: false,
    isSuccess: false,
    error: null,
    steamGuardRequired: false,
    progress: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showStoredPassword, setShowStoredPassword] = useState(false);
  const [configDir, setConfigDir] = useState<string>('');
  const [steamGuardType, setSteamGuardType] = useState<'email'|'mobile'|null>(null);
  const [steamGuardCode, setSteamGuardCode] = useState('');

  // DepotDownloader progress listener for Steam Guard messages
  useEffect(() => {
    const onDepotDownloader = (evt: any) => {
      if (evt?.type === 'steam-guard' && evt.message) {
        setLoginStatus(prev => ({ ...prev, steamGuardRequired: true, progress: evt.message }));
        if (typeof evt.guardType === 'string') {
          setSteamGuardType(evt.guardType === 'email' ? 'email' : 'mobile');
        } else if (/email/i.test(evt.message)) {
          setSteamGuardType('email');
        } else if (/mobile/i.test(evt.message)) {
          setSteamGuardType('mobile');
        }
      }
    };
    window.electronAPI.onDepotDownloaderProgress(onDepotDownloader);
    return () => window.electronAPI.removeDepotDownloaderProgressListener();
  }, []);

  // Check Steam process status on mount
  useEffect(() => {
    checkSteamProcess();
  }, []);

  // Load config dir for informational text (no async calls in JSX)
  useEffect(() => {
    (async () => {
      try {
        const dir = await window.electronAPI?.config?.getConfigDir?.();
        if (dir) setConfigDir(dir);
      } catch {}
    })();
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

  const useStoredCredentials = async () => {};

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setLoginStatus(prev => ({
        ...prev,
        error: 'Please enter both username and password'
      }));
      return;
    }

    // Path is optional; we will attempt PATH/alias if not provided

    setLoginStatus({
      isLoggingIn: true,
      isSuccess: false,
      error: null,
      steamGuardRequired: false,
      progress: 'Initializing DepotDownloader...'
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

      // Attempt DepotDownloader login
      const result = await window.electronAPI?.depotdownloader?.login(depotDownloaderPath || undefined, username, password);
      
      if (result.success) {
        setLoginStatus({
          isLoggingIn: false,
          isSuccess: true,
          error: null,
          steamGuardRequired: false,
          progress: 'Login successful!'
        });
        try { await window.electronAPI?.credCache?.set?.({ username, password }); } catch {}

        // Notify parent component
        onLoginSuccess({ username, password, stayLoggedIn: false });
      } else if ((result as any).requiresSteamGuard || (result as any).steamGuardRequired) {
        setLoginStatus(prev => ({
          ...prev,
          isLoggingIn: false,
          steamGuardRequired: true,
          progress: (result as any).guardType === 'email' ? 'Steam Guard email code required' : 'Steam Guard mobile approval required'
        }));
        try {
          const gt = (result as any).guardType;
          if (gt === 'email' || gt === 'mobile') setSteamGuardType(gt);
        } catch {}
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
      progress: 'Waiting for Steam Guard mobile approval...'
    }));

    // Periodic status updates while waiting
    let seconds = 0;
    const interval = setInterval(() => {
      seconds += 5;
      setLoginStatus(prev => ({ ...prev, progress: `Waiting for mobile approval... (${seconds}s)` }));
    }, 5000);

    // Timeout after 120 seconds
    const timeout = setTimeout(async () => {
      clearInterval(interval);
      try { await window.electronAPI?.depotdownloader?.cancel?.(); } catch {}
      setLoginStatus(prev => ({ ...prev, isLoggingIn: false, error: 'Timed out waiting for mobile approval. Please approve in Steam Mobile and try again.' }));
    }, 120000);

    try {
      const result = await window.electronAPI?.depotdownloader?.login(depotDownloaderPath || undefined, username, password, { confirmSteamGuard: true });
      clearInterval(interval);
      clearTimeout(timeout);
      if (result.success) {
        setLoginStatus({ isLoggingIn: false, isSuccess: true, error: null, steamGuardRequired: false, progress: 'Login successful!' });
        try { await window.electronAPI?.credCache?.set?.({ username, password }); } catch {}
        onLoginSuccess({ username, password, stayLoggedIn: false });
      } else {
        setLoginStatus(prev => ({ ...prev, isLoggingIn: false, error: result.error || 'Steam Guard confirmation failed' }));
      }
    } catch (error) {
      clearInterval(interval);
      clearTimeout(timeout);
      setLoginStatus(prev => ({ ...prev, isLoggingIn: false, error: error instanceof Error ? error.message : 'Steam Guard confirmation failed' }));
    }
  };

  const handleSteamGuardSubmitCode = async () => {
    if (!steamGuardCode.trim()) {
      setLoginStatus(prev => ({ ...prev, error: 'Enter the Steam Guard code from your email' }));
      return;
    }
    setLoginStatus(prev => ({ ...prev, isLoggingIn: true, error: null, progress: 'Submitting Steam Guard code...' }));
    try {
      const result = await window.electronAPI?.depotdownloader?.login(
        depotDownloaderPath || undefined,
        username,
        password,
        { twoFactorCode: steamGuardCode.trim() }
      );
      if (result.success) {
        setLoginStatus({ isLoggingIn: false, isSuccess: true, error: null, steamGuardRequired: false, progress: 'Login successful!' });
        try { await window.electronAPI?.credCache?.set?.({ username, password }); } catch {}
        onLoginSuccess({ username, password, stayLoggedIn: false });
      } else if ((result as any).requiresSteamGuard) {
        setLoginStatus(prev => ({ ...prev, isLoggingIn: false, steamGuardRequired: true, progress: 'Steam Guard code still required' }));
      } else {
        setLoginStatus(prev => ({ ...prev, isLoggingIn: false, error: result.error || 'Login failed' }));
      }
    } catch (error) {
      setLoginStatus(prev => ({ ...prev, isLoggingIn: false, error: error instanceof Error ? error.message : 'Login failed' }));
    }
  };

  const handleSkip = () => {
    onSkipLogin();
  };

  // Show skip option if DepotDownloader is not enabled or if user wants to skip login
  if (!useDepotDownloader) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-gray-300">
            DepotDownloader integration is disabled. You can skip this step and continue with manual file copying.
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
          Log in to your Steam account to enable automated branch downloading with DepotDownloader.
          Your credentials are used securely for this session only and are not stored on disk. Steam Guard is supported.
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

      

      {/* Stored Credentials (if available) */}
      {/* Stored credentials UI removed: session-based only */}

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

          {/* Session-based login only; no stored credentials or stay-logged-in option */}

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
              {steamGuardType === 'mobile' ? (
                <>
                  <p className="text-yellow-200 text-sm mb-4">Your account requires mobile approval. Approve the login in your Steam Mobile app, then click below.</p>
                  <button onClick={handleSteamGuardConfirm} disabled={loginStatus.isLoggingIn} className="btn-primary">
                    {loginStatus.isLoggingIn ? 'Confirming...' : 'I Have Approved in Steam Mobile App'}
                  </button>
                  <button
                    onClick={async () => { try { await window.electronAPI?.depotdownloader?.cancel?.(); } catch {}; setLoginStatus(prev => ({ ...prev, isLoggingIn: false, error: 'Cancelled waiting for mobile approval' })); }}
                    disabled={loginStatus.isLoggingIn}
                    className="btn-secondary ml-2"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <p className="text-yellow-200 text-sm mb-2">Enter the Steam Guard code sent to your email:</p>
                  <div className="flex space-x-2 mb-3">
                    <input type="text" value={steamGuardCode} onChange={(e) => setSteamGuardCode(e.target.value)}
                           className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="Email code" maxLength={10} />
                    <button onClick={handleSteamGuardSubmitCode} disabled={loginStatus.isLoggingIn} className="btn-primary">Submit Code</button>
                  </div>
                </>
              )}
              
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
                You are now logged in as <strong>{username}</strong>. Credentials are held in memory for this session only.
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
