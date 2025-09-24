import React, { useState, useEffect, useRef } from 'react';

interface SteamLoginGateProps {
  onSuccess: () => void;
  depotDownloaderPath?: string | null;
}

interface SteamProcessStatus {
  isRunning: boolean;
  processName: string;
  pid?: number;
  error?: string;
}

interface LoginStatus {
  isLoggingIn: boolean;
  message: string;
  error: string | null;
  guard: 'email' | 'mobile' | null;
}

const SteamLoginGate: React.FC<SteamLoginGateProps> = ({ onSuccess, depotDownloaderPath }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [steamProcess, setSteamProcess] = useState<SteamProcessStatus | null>(null);
  const [steamGuardType, setSteamGuardType] = useState<'email' | 'mobile' | null>(null);
  const [steamGuardCode, setSteamGuardCode] = useState('');
  const [loginStatus, setLoginStatus] = useState<LoginStatus>({
    isLoggingIn: false,
    message: '',
    error: null,
    guard: null
  });
  const mobileApprovalAbortRef = useRef(false);

  useEffect(() => {
    checkSteamProcess();
  }, []);

  useEffect(() => {
    const progressListener = (evt: any) => {
      if (evt?.type === 'steam-guard') {
        const guardType = evt.guardType === 'mobile' ? 'mobile' : 'email';
        setSteamGuardType(guardType);
        setLoginStatus(prev => ({
          ...prev,
          guard: guardType,
          message: evt.message || (guardType === 'mobile'
            ? 'Steam Guard mobile approval required. Approve the login in Steam Mobile.'
            : 'Steam Guard email code required. Check your inbox.')
        }));
      }
    };

    window.electronAPI.onDepotDownloaderProgress(progressListener);
    return () => {
      window.electronAPI.removeDepotDownloaderProgressListener();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.electronAPI?.credCache?.get?.();
        if (res?.success && res.credentials?.username) {
          setUsername(res.credentials.username);
        }
      } catch (error) {
        console.error('Failed to read cached credentials:', error);
      }
    })();
  }, []);

  const checkSteamProcess = async () => {
    try {
      const result = await window.electronAPI?.steam?.detectSteamProcess();
      setSteamProcess(result);
    } catch (error) {
      console.error('Failed to check Steam process:', error);
      setSteamProcess({
        isRunning: false,
        processName: 'unknown',
        error: 'Unable to determine Steam process state'
      });
    }
  };

  const waitForMobileApproval = async () => {
    mobileApprovalAbortRef.current = false;
    setSteamGuardType('mobile');
    setLoginStatus({
      isLoggingIn: true,
      message: 'Waiting for Steam Mobile approval...',
      error: null,
      guard: 'mobile'
    });

    try {
      const confirmResponse = await window.electronAPI.depotdownloader.login(
        depotDownloaderPath || undefined,
        username,
        password,
        { confirmSteamGuard: true }
      );

      if (mobileApprovalAbortRef.current) {
        return;
      }

      if (confirmResponse.success) {
        try {
          await window.electronAPI.credCache.set({ username, password });
        } catch (cacheError) {
          console.warn('Unable to cache Steam credentials:', cacheError);
        }

        setSteamGuardCode('');
        setSteamGuardType(null);
        setLoginStatus({
          isLoggingIn: false,
          message: 'Login successful!',
          error: null,
          guard: null
        });
        onSuccess();
        return;
      }

      if ((confirmResponse as any).requiresSteamGuard && (confirmResponse as any).guardType === 'mobile') {
        setLoginStatus({
          isLoggingIn: false,
          message: '',
          error: (confirmResponse as any).message || 'Steam Guard mobile approval timed out. Approve the login in Steam Mobile and try again.',
          guard: null
        });
        return;
      }

      setLoginStatus({
        isLoggingIn: false,
        message: '',
        error: confirmResponse.error || 'Steam Guard mobile approval failed. Please try again.',
        guard: null
      });
    } catch (error) {
      if (mobileApprovalAbortRef.current) {
        return;
      }
      setLoginStatus({
        isLoggingIn: false,
        message: '',
        error: error instanceof Error ? error.message : 'Steam Guard mobile approval failed. Please try again.',
        guard: null
      });
    }
    finally {
      mobileApprovalAbortRef.current = false;
    }
  };

  const runDepotDownloaderLogin = async (options?: { twoFactorCode?: string }) => {
    if (!username.trim() || !password.trim()) {
      setLoginStatus(prev => ({
        ...prev,
        error: 'Enter both username and password before continuing.'
      }));
      return;
    }

    if (steamProcess?.isRunning) {
      setLoginStatus(prev => ({
        ...prev,
        error: 'Steam is currently running. Close Steam before logging in.'
      }));
      return;
    }

    setLoginStatus({
      isLoggingIn: true,
      message: options?.twoFactorCode ? 'Submitting Steam Guard code...' : 'Logging in...',
      error: null,
      guard: options?.twoFactorCode ? loginStatus.guard : null
    });

    const loginOptions = options?.twoFactorCode
      ? { twoFactorCode: options.twoFactorCode }
      : undefined;

    try {
      const response = await window.electronAPI.depotdownloader.login(
        depotDownloaderPath || undefined,
        username,
        password,
        loginOptions
      );

      if (response.success) {
        try {
          await window.electronAPI.credCache.set({ username, password });
        } catch (cacheError) {
          console.warn('Unable to cache Steam credentials:', cacheError);
        }

        setSteamGuardCode('');
        setSteamGuardType(null);
        setLoginStatus({
          isLoggingIn: false,
          message: 'Login successful!',
          error: null,
          guard: null
        });
        onSuccess();
        return;
      }

      if ((response as any).requiresSteamGuard) {
        const guardType = (response as any).guardType === 'mobile' ? 'mobile' : 'email';
        const message = (response as any).message as string | undefined;
        if (guardType === 'mobile') {
          setSteamGuardCode('');
          await waitForMobileApproval();
        } else {
          setSteamGuardType('email');
          setSteamGuardCode('');
          setLoginStatus({
            isLoggingIn: false,
            message: message || 'Steam Guard email code required. Check your inbox.',
            error: null,
            guard: 'email'
          });
        }
        return;
      }

      setLoginStatus({
        isLoggingIn: false,
        message: '',
        error: response.error || 'Steam login failed. Check your credentials and try again.',
        guard: null
      });
    } catch (error) {
      setLoginStatus({
        isLoggingIn: false,
        message: '',
        error: error instanceof Error ? error.message : 'Steam login failed.',
        guard: null
      });
    }
  };

  const handleSubmitGuardCode = () => {
    if (!steamGuardCode.trim()) {
      setLoginStatus(prev => ({
        ...prev,
        error: 'Enter the Steam Guard code from your email.'
      }));
      return;
    }
    runDepotDownloaderLogin({ twoFactorCode: steamGuardCode.trim() });
  };

  const handleCancelMobileWait = async () => {
    mobileApprovalAbortRef.current = true;
    try {
      await window.electronAPI.depotdownloader.cancel();
    } catch (error) {
      console.warn('Failed to cancel DepotDownloader login:', error);
    }
    setSteamGuardType(null);
    setSteamGuardCode('');
    setLoginStatus({ isLoggingIn: false, message: '', error: 'Cancelled mobile confirmation.', guard: null });
  };

  return (
    <div className="min-h-full bg-gray-900 text-white flex flex-col">
      <div className="max-w-3xl mx-auto w-full py-12 px-6">
        <h1 className="text-2xl font-semibold mb-6">Steam Authentication Required</h1>
        <p className="text-gray-300 mb-6">
          DepotDownloader is enabled for this managed environment. Sign in to Steam so the
          application can check for updates and manage downloads on your behalf.
        </p>

        {steamProcess?.isRunning && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-red-300 mb-2">Steam is Currently Running</h2>
            <p className="text-red-200 text-sm mb-3">
              Close Steam before continuing. Steam only allows one active login at a time.
            </p>
            <div className="text-sm text-red-200 space-y-1">
              <p>Process: {steamProcess.processName}</p>
              {steamProcess.pid && <p>PID: {steamProcess.pid}</p>}
            </div>
            <button onClick={checkSteamProcess} className="btn-secondary mt-4 text-sm">Check Again</button>
          </div>
        )}

        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Steam Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loginStatus.isLoggingIn}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Steam Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loginStatus.isLoggingIn}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                disabled={loginStatus.isLoggingIn}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={() => runDepotDownloaderLogin()}
            disabled={loginStatus.isLoggingIn || !username.trim() || !password.trim() || steamProcess?.isRunning}
          >
            {loginStatus.isLoggingIn ? 'Logging In...' : 'Sign In to Steam'}
          </button>

          {loginStatus.guard === 'email' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-300">Enter the Steam Guard code sent to your email.</p>
              <div className="flex items-center space-x-2">
                <input
                  value={steamGuardCode}
                  onChange={e => setSteamGuardCode(e.target.value)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Email code"
                  maxLength={10}
                />
                <button
                  className="btn-primary"
                  onClick={handleSubmitGuardCode}
                  disabled={loginStatus.isLoggingIn || !steamGuardCode.trim()}
                >
                  Submit Code
                </button>
              </div>
            </div>
          )}

          {loginStatus.guard === 'mobile' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-300">Approve the login request in the Steam Mobile app. The sign-in will finish automatically once Steam confirms.</p>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className={`h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full ${loginStatus.isLoggingIn ? 'animate-spin' : ''}`} />
                  <span className="text-xs text-blue-200">
                    {loginStatus.isLoggingIn ? 'Waiting for Steam Mobile approval…' : 'Awaiting Steam Mobile approval.'}
                  </span>
                </div>
                <button
                  className="btn-secondary"
                  onClick={handleCancelMobileWait}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loginStatus.message && (
            <p className="text-sm text-blue-300">{loginStatus.message}</p>
          )}
          {loginStatus.error && (
            <p className="text-sm text-red-300">{loginStatus.error}</p>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-6">
          DepotDownloader path: {depotDownloaderPath || 'Using default command'}
        </p>
      </div>
    </div>
  );
};

export default SteamLoginGate;
