/**
 * DepotDownloader IPC Handlers for Schedule I Developer Environment Utility
 *
 * Provides IPC handlers for DepotDownloader integration including installation validation,
 * login functionality, and branch download operations. Handles communication
 * between the main process and renderer process for DepotDownloader operations.
 *
 * Key features:
 * - DepotDownloader installation validation
 * - Steam authentication via DepotDownloader
 * - Branch download and update operations with simplified command structure
 * - Progress tracking and error handling
 * - Steam Guard support with QR codes and 2FA
 *
 * DepotDownloader advantages over SteamCMD:
 * - Simplified command syntax: -app -branch -username -password -dir
 * - Built-in Steam Guard support with -qr and -no-mobile flags
 * - Better error messages and progress reporting
 * - Modern .NET-based tool with active development
 * - Parallel downloads with configurable -max-downloads
 *
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import { ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SteamProcessService } from '../services/SteamProcessService';
import { CredentialService } from '../services/CredentialService';

const steamProcessService = new SteamProcessService();
const credentialService = new CredentialService();

// Track current DepotDownloader processes for cancellation
let currentDownloadProc: ChildProcess | null = null;
let currentLoginProc: ChildProcess | null = null;

// Helper to resolve DepotDownloader command from optional path or PATH/alias
async function resolveDepotDownloaderCommand(depotDownloaderPath?: string): Promise<{ cmd: string, shell: boolean, error?: string }> {
  try {
    if (depotDownloaderPath && depotDownloaderPath.trim()) {
      if (!await fs.pathExists(depotDownloaderPath)) {
        return { cmd: '', shell: false, error: 'DepotDownloader path does not exist' };
      }
      const stat = await fs.stat(depotDownloaderPath);
      const exe = stat.isDirectory() ? path.join(depotDownloaderPath, 'DepotDownloader.exe') : depotDownloaderPath;
      if (!await fs.pathExists(exe)) {
        return { cmd: '', shell: false, error: 'DepotDownloader.exe not found at the specified path' };
      }
      return { cmd: exe, shell: false };
    }

    // Try common command names on PATH via shell
    const candidates = ['DepotDownloader', 'depotdownloader', 'DepotDownloader.exe'];
    // Optimistically return first candidate; spawn will error if not found
    return { cmd: candidates[0], shell: true };
  } catch (e) {
    return { cmd: '', shell: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Validates DepotDownloader installation.
 *
 * If a path is provided, validates and runs that binary. Otherwise, attempts to
 * resolve and run DepotDownloader from PATH or shell alias by invoking the
 * command directly.
 *
 * @param event IPC event object
 * @param depotDownloaderPath Optional path to DepotDownloader installation or exe
 * @returns Promise<{success: boolean, error?: string, version?: string}> Validation result
 */
async function handleValidateInstallation(event: any, depotDownloaderPath?: string): Promise<{success: boolean, error?: string, version?: string}> {
  try {
    console.log('Validating DepotDownloader installation', depotDownloaderPath ? `at: ${depotDownloaderPath}` : '(from PATH/alias)');

    const trySpawnVersion = (cmd: string, args: string[], useShell: boolean) => new Promise<{ok: boolean, version?: string, output?: string}>(resolve => {
      const child = spawn(cmd, args, { shell: useShell, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        const success = code === 0 || /DepotDownloader/i.test(output) || /DepotDownloader/i.test(errorOutput);
        if (success) {
          const versionMatch = (output + errorOutput).match(/DepotDownloader[^\d]*(\d+\.\d+\.\d+)/i);
          const version = versionMatch ? versionMatch[1] : undefined;
          resolve({ ok: true, version, output: output + errorOutput });
        } else {
          resolve({ ok: false, output: output + errorOutput });
        }
      });

      child.on('error', () => resolve({ ok: false }));

      setTimeout(() => { try { child.kill(); } catch {} resolve({ ok: false }); }, 10000);
    });

    // If a path was provided, use it strictly
    if (depotDownloaderPath && depotDownloaderPath.trim()) {
      if (!await fs.pathExists(depotDownloaderPath)) {
        return { success: false, error: 'DepotDownloader path does not exist' };
      }
      const stat = await fs.stat(depotDownloaderPath);
      const depotDownloaderExe = stat.isDirectory() ? path.join(depotDownloaderPath, 'DepotDownloader.exe') : depotDownloaderPath;
      if (!await fs.pathExists(depotDownloaderExe)) {
        return { success: false, error: 'DepotDownloader.exe not found at the specified path' };
      }
      const res = await trySpawnVersion(depotDownloaderExe, ['--version'], false);
      if (res.ok) return { success: true, version: res.version };
      return { success: false, error: `DepotDownloader validation failed. ${res.output || ''}`.trim() };
    }

    // No path provided: try resolving via PATH/alias with a few common spellings
    const candidates = [
      { cmd: 'DepotDownloader', shell: true },
      { cmd: 'depotdownloader', shell: true },
      { cmd: 'DepotDownloader.exe', shell: true }
    ];
    for (const c of candidates) {
      const res = await trySpawnVersion(c.cmd, ['--version'], c.shell);
      if (res.ok) return { success: true, version: res.version };
    }

    return { success: false, error: 'DepotDownloader not found in PATH or alias. Please install it (e.g. winget install --exact --id SteamRE.DepotDownloader) or ensure the command is available.' };

  } catch (error) {
    console.error('Error validating DepotDownloader installation:', error);
    return {
      success: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Handles Steam login using DepotDownloader (simplified - login happens during download)
 * DepotDownloader combines authentication with download, so this is mainly for testing credentials
 *
 * @param event IPC event object
 * @param depotDownloaderPath Path to DepotDownloader installation
 * @param username Steam username
 * @param password Steam password
 * @param options Additional options like useQR, twoFactorCode
 * @returns Promise<{success: boolean, error?: string, requiresSteamGuard?: boolean}> Login result
 */
async function handleLogin(event: any, depotDownloaderPath: string | undefined, username: string, password: string, options: any = {}): Promise<{success: boolean, error?: string, requiresSteamGuard?: boolean}> {
  try {
    console.log('Testing Steam login with DepotDownloader for user:', username);

    // Check if Steam is running
    const steamProcess = await steamProcessService.detectSteamProcess();
    if (steamProcess.isRunning) {
      return {
        success: false,
        error: 'Steam is currently running. Please close Steam before attempting login.'
      };
    }

    if (!username || !password) {
      return { success: false, error: 'Username and password are required' };
    }

    // Resolve DepotDownloader command from provided path or PATH/alias
    const resolved = await resolveDepotDownloaderCommand(depotDownloaderPath);
    if (resolved.error) return { success: false, error: resolved.error };

    // Test login by attempting to get app info (simpler than SteamCMD's complex login sequence)
    return new Promise((resolve) => {
      const args = [
        '-app', '3164500', // Schedule I App ID
        '-username', username,
        '-password', password,
        '-manifest-only' // Only download manifest, not full game
      ];

      const depotDownloader = spawn(resolved.cmd, args, {
        shell: resolved.shell,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      currentLoginProc = depotDownloader;

      let output = '';
      let errorOutput = '';
      let steamGuardRequired = false;
      let steamGuardType: 'email' | 'mobile' | undefined;
      let loginCompleted = false;
      let codeSent = false;
      let earlyResolved = false as boolean;

      // Monitor output for Steam Guard and completion (DepotDownloader has clearer messages)
      const checkOutput = (data: string) => {
        const fullOutput = output + errorOutput + data;

        // Check if Steam Guard is required (DepotDownloader provides clearer prompts)
        if (/STEAM GUARD!/i.test(fullOutput) || /Steam Guard/i.test(fullOutput) || /two[- ]?factor/i.test(fullOutput) || /mobile authenticator/i.test(fullOutput)) {
          if (!steamGuardRequired) {
            steamGuardRequired = true;
            // Determine guard type
            if (/sent to the email/i.test(fullOutput) || /email code/i.test(fullOutput)) {
              steamGuardType = 'email';
            } else if (/mobile/i.test(fullOutput) || /authenticator/i.test(fullOutput)) {
              steamGuardType = 'mobile';
            }

            console.log('Steam Guard authentication required', steamGuardType ? `(${steamGuardType})` : '');
            try {
              event.sender.send('depotdownloader-progress', {
                type: 'steam-guard',
                message: steamGuardType === 'email'
                  ? 'Steam Guard email code required. Check your email and enter the code.'
                  : 'Steam Guard mobile approval required. Approve the login in your Steam Mobile app.',
                guardType: steamGuardType
              });
            } catch {}

            // If email and code provided, send it
            if (steamGuardType === 'email' && options?.twoFactorCode && !codeSent) {
              try {
                depotDownloader.stdin?.write(String(options.twoFactorCode).trim() + '\n');
                codeSent = true;
              } catch {}
            } else if (steamGuardType === 'email' && !options?.twoFactorCode && !earlyResolved) {
              // No code provided; resolve early and kill process
              earlyResolved = true;
              try { depotDownloader.kill(); } catch {}
              return resolve({ success: false, error: 'Steam Guard email code required', requiresSteamGuard: true });
            }

            if (steamGuardType === 'mobile' && !options?.confirmSteamGuard && !earlyResolved) {
              earlyResolved = true;
              try { depotDownloader.kill(); } catch {}
              return resolve({ success: false, error: 'Steam Guard mobile approval required', requiresSteamGuard: true });
            }
          }
        }

        // Check for successful authentication (DepotDownloader shows clearer success messages)
        if (fullOutput.includes('Successfully logged in') || fullOutput.includes('Login successful') ||
            fullOutput.includes('Logged in as')) {
          if (!loginCompleted) {
            loginCompleted = true;
            console.log('DepotDownloader login successful');
            resolve({ success: true });
          }
        }

        // Check for login failure (DepotDownloader provides better error messages)
        if (fullOutput.includes('Login failed') || fullOutput.includes('Invalid password') ||
            fullOutput.includes('Invalid username') || fullOutput.includes('Access denied')) {
          console.log('DepotDownloader login failed');
          resolve({
            success: false,
            error: 'Login failed: Invalid credentials or account access denied'
          });
        }
      };

      depotDownloader.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.log('DepotDownloader output:', dataStr);
        checkOutput(dataStr);
      });

      depotDownloader.stderr.on('data', (data) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        console.log('DepotDownloader error output:', dataStr);
        checkOutput(dataStr);
      });

      depotDownloader.on('close', (code) => {
        const fullOutput = output + errorOutput;
        console.log('DepotDownloader login test completed with code:', code);
        currentLoginProc = null;

        if (!loginCompleted) {
          if (steamGuardRequired) {
            resolve({
              success: false,
              error: 'Steam Guard authentication required. Please try again with 2FA.',
              requiresSteamGuard: true
            });
          } else if (code === 0) {
            // Success based on exit code
            console.log('DepotDownloader login successful (detected on close)');
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              error: `Login test failed with exit code: ${code}. ${fullOutput}`
            });
          }
        }
      });

      depotDownloader.on('error', (error) => {
        console.error('DepotDownloader login error:', error);
        resolve({
          success: false,
          error: `Failed to execute DepotDownloader: ${error.message}`
        });
      });

      // Set a timeout for the login test
      setTimeout(() => {
        depotDownloader.kill();
        resolve({
          success: false,
          error: 'Steam login test timed out'
        });
      }, 30000); // 30 second timeout
    });

  } catch (error) {
    console.error('Error during Steam login test:', error);
    return {
      success: false,
      error: `Login error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Downloads a branch using DepotDownloader (much simpler than SteamCMD!)
 *
 * @param event IPC event object
 * @param depotDownloaderPath Path to DepotDownloader installation
 * @param username Steam username
 * @param password Steam password
 * @param branchPath Path where to install the branch
 * @param appId Steam App ID
 * @param branchId Steam branch ID
 * @returns Promise<{success: boolean, error?: string}> Download result
 */
async function handleDownloadBranch(event: any, depotDownloaderPath: string | undefined, username: string, password: string, branchPath: string, appId: string, branchId: string): Promise<{success: boolean, error?: string}> {
  try {
    console.log('Downloading branch with DepotDownloader:', branchId, 'to:', branchPath);

    if (!username || !password || !branchPath || !appId || !branchId) {
      return { success: false, error: 'All parameters are required for branch download' };
    }

    // Ensure branch directory exists and normalize path for Windows
    await fs.ensureDir(branchPath);
    const installDir = path.resolve(branchPath);

    // Resolve DepotDownloader command
    const resolved = await resolveDepotDownloaderCommand(depotDownloaderPath);
    if (resolved.error) return { success: false, error: resolved.error };

    // Build DepotDownloader arguments (much simpler than SteamCMD!)
    const buildArgs = (): string[] => {
      const args: string[] = [
        '-app', appId,
        '-username', username,
        '-password', password,
        // Quote -dir when using shell so spaces survive the shell parsing
        '-dir', (resolved.shell && installDir.includes(' ')) ? `"${installDir}"` : installDir,
        // No remember-password; always pass creds each time
        '-max-downloads', '8' // Parallel downloads for better performance
      ];

      // Handle branch mapping: main-branch → public (no -branch flag needed)
      // beta-branch → beta, alternate-branch → alternate, etc.
      const steamBranchKey = branchId === 'main-branch' ? 'public' : branchId.replace('-branch', '');
      if (steamBranchKey !== 'public') {
        args.push('-branch', steamBranchKey);
      }

      return args;
    };

    // Retry policy: up to 2 retries for Steam-running conflicts and auth failures
    const maxAttempts = 3; // 1 initial + 2 retries
    const backoffs = [0, 5000, 15000];

    const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Preflight: if Steam is running, attempt backoff-based retries
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const steamProcess = await steamProcessService.detectSteamProcess();
      if (!steamProcess.isRunning) break;
      const waitMs = backoffs[Math.min(attempt, backoffs.length - 1)];
      const msg = `Steam is running; retrying in ${Math.round(waitMs/1000)}s...`;
      console.log(msg);
      event?.sender?.send('depotdownloader-progress', { type: 'info', message: msg });
      await wait(waitMs);
      if (attempt === maxAttempts - 1) {
        return { success: false, error: 'Steam is currently running. Please close Steam before downloading.' };
      }
    }

    const attemptOnce = () => new Promise<{success: boolean, error?: string, output?: string}>((resolve) => {
      const args = buildArgs();
      const printable = [resolved.cmd, ...args.map(a => (a.includes(' ') ? `"${a}"` : a))].join(' ');
      console.log('Launching DepotDownloader:', printable);
      const depotDownloader = spawn(resolved.cmd, args, { shell: resolved.shell, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      try { event?.sender?.send('depotdownloader-progress', { type: 'info', message: `Launching DepotDownloader: ${printable}` }); } catch {}
      currentDownloadProc = depotDownloader;

      let output = '';
      let errorOutput = '';

      // Progress parsing for DepotDownloader (different format than SteamCMD)
      const parseProgress = (text: string): number | null => {
        try {
          const cleaned = text.replace(/\x1b\[[0-9;]*m/g, '').replace(/\r/g, '\n');
          const firstLine = cleaned.split('\n')[0] || '';
          const startMatch = firstLine.match(/^\s*(\d{1,3}(?:\.\d{1,2})?)%(?:\s|$)/);
          if (startMatch) return Math.max(0, Math.min(100, parseFloat(startMatch[1])));

          // DepotDownloader progress patterns:
          // "Downloaded X MB / Y MB (Z%)" or similar
          const progressMatch = cleaned.match(/\((\d+(?:\.\d+)?)%\)/);
          if (progressMatch) return Math.max(0, Math.min(100, parseFloat(progressMatch[1])));

          // Generic 'progress: 12.34%'
          const progressLabelMatch = cleaned.match(/progress\s*:?\s*(\d+(?:\.\d+)?)%/i);
          if (progressLabelMatch) return Math.max(0, Math.min(100, parseFloat(progressLabelMatch[1])));

          // Any standalone percentage in line (fallback)
          const anyPercent = cleaned.match(/(\d+(?:\.\d+)?)%/);
          if (anyPercent) return Math.max(0, Math.min(100, parseFloat(anyPercent[1])));

          // "Downloading depot X of Y"
          const depotMatch = cleaned.match(/Downloading depot (\d+) of (\d+)/);
          if (depotMatch) {
            const current = parseInt(depotMatch[1]);
            const total = parseInt(depotMatch[2]);
            if (total > 0) return Math.max(0, Math.min(100, (current / total) * 100));
          }

          // Completion markers
          if (/download.*complete|all.*depot.*downloaded/i.test(cleaned)) return 100;
          if (/total downloaded:/i.test(cleaned)) return 100;
          return null;
        } catch {
          return null;
        }
      };

      let outBuf = '';
      let errBuf = '';
      let latestPercent: number | null = null;
      let flushTimer: NodeJS.Timeout | null = null;
      const scheduleFlush = () => {
        if (flushTimer) return;
        flushTimer = setTimeout(() => {
          flushTimer = null;
          try {
            if (outBuf) {
              event.sender.send('depotdownloader-progress', { type: 'output', data: outBuf });
              outBuf = '';
            }
            if (errBuf) {
              event.sender.send('depotdownloader-progress', { type: 'error', data: errBuf });
              errBuf = '';
            }
            if (latestPercent != null) {
              event.sender.send('depotdownloader-progress', { type: 'percent', value: latestPercent });
            }
          } catch {}
        }, 50); // flush every 50ms max
      };

      const handleChunk = (chunk: string, isError = false) => {
        if (!chunk) return;
        const p = parseProgress(chunk);
        if (p != null) {
          latestPercent = p;
        }
        if (isError) errBuf += chunk; else outBuf += chunk;
        scheduleFlush();
      };

      depotDownloader.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.log('DepotDownloader output:', dataStr);
        handleChunk(dataStr, false);
      });

      depotDownloader.stderr.on('data', (data) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        console.log('DepotDownloader error output:', dataStr);
        handleChunk(dataStr, true);
      });

      depotDownloader.on('close', (code) => {
        const fullOutput = output + errorOutput;
        console.log('DepotDownloader download completed with code:', code);
        currentDownloadProc = null;

        // Final flush to ensure last chunks are delivered
        try {
          if (outBuf) event?.sender?.send('depotdownloader-progress', { type: 'output', data: outBuf });
          if (errBuf) event?.sender?.send('depotdownloader-progress', { type: 'error', data: errBuf });
          if (latestPercent != null) event?.sender?.send('depotdownloader-progress', { type: 'percent', value: latestPercent });
        } catch {}

        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: `Download failed: ${fullOutput || 'Unknown error'}`, output: fullOutput });
        }
      });

      depotDownloader.on('error', (error) => {
        console.error('DepotDownloader download error:', error);
        resolve({ success: false, error: `Failed to execute DepotDownloader: ${error.message}` });
      });
    });

    let lastError: string | undefined;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const waitMs = backoffs[Math.min(attempt, backoffs.length - 1)];
      if (waitMs > 0) {
        const msg = `Retrying download (attempt ${attempt+1}/${maxAttempts}) in ${Math.round(waitMs/1000)}s...`;
        console.log(msg);
        event?.sender?.send('depotdownloader-progress', { type: 'info', message: msg });
        await wait(waitMs);
      }

      const res = await attemptOnce();
      if (res.success) return { success: true };

      lastError = res.error;
      const out = (res.output || '').toLowerCase();
      const loginFailure = out.includes('login failed') || out.includes('invalid password') || out.includes('access denied');
      const steamRunning = out.includes('steam is running') || out.includes('steam client');

      if (!loginFailure && !steamRunning && attempt === 0) {
        // Non-retryable immediate error; break and report
        break;
      }
      if (attempt === maxAttempts - 1) {
        break;
      }
    }

    return { success: false, error: lastError || 'Download failed' };

  } catch (error) {
    console.error('Error during branch download with DepotDownloader:', error);
    return { success: false, error: `Download error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Gets branch build ID from DepotDownloader manifest files (replaces SteamCMD's app_info_print)
 *
 * @param event IPC event object
 * @param branchPath Path to the downloaded branch
 * @param appId Steam App ID
 * @returns Promise<{success: boolean, buildId?: string, error?: string}> Build ID result
 */
async function handleGetBranchBuildId(event: any, branchPath: string, appId: string): Promise<{success: boolean, buildId?: string, error?: string}> {
  try {
    console.log('Getting build ID from DepotDownloader manifest at:', branchPath);

    if (!branchPath || !appId) {
      return { success: false, error: 'Branch path and App ID are required' };
    }

    // DepotDownloader creates .DepotDownloader directory with metadata
    const manifestPath = path.join(branchPath, '.DepotDownloader');

    if (!await fs.pathExists(manifestPath)) {
      return { success: false, error: 'DepotDownloader manifest directory not found. Download may have failed or used different tool.' };
    }

    const files = await fs.readdir(manifestPath);

    // Look for depot manifest files that contain build information
    for (const file of files) {
      if (file.includes(`depot_`) && (file.endsWith('.manifest') || file.endsWith('.json'))) {
        const filePath = path.join(manifestPath, file);
        const manifestData = await fs.readFile(filePath, 'utf8');

        // Parse manifest for build ID - format may vary depending on DepotDownloader version
        const buildIdMatch = manifestData.match(/BuildID[^\d]*(\d+)/i) ||
                            manifestData.match(/"buildid":\s*"?(\d+)"?/i) ||
                            manifestData.match(/build[_\s]*id[^\d]*(\d+)/i);

        if (buildIdMatch) {
          console.log('Found build ID in manifest:', buildIdMatch[1]);
          return { success: true, buildId: buildIdMatch[1] };
        }
      }
    }

    // If no build ID found in manifests, try to extract from depot files
    for (const file of files) {
      if (file.includes('depot_') && file.includes('.txt')) {
        const filePath = path.join(manifestPath, file);
        const data = await fs.readFile(filePath, 'utf8');
        const buildIdMatch = data.match(/build[_\s]*id[^\d]*(\d+)/i);
        if (buildIdMatch) {
          console.log('Found build ID in depot file:', buildIdMatch[1]);
          return { success: true, buildId: buildIdMatch[1] };
        }
      }
    }

    return { success: false, error: 'Build ID not found in DepotDownloader manifest files' };

  } catch (error) {
    console.error('Error reading DepotDownloader manifest:', error);
    return { success: false, error: `Failed to read manifest: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Sets up all DepotDownloader IPC handlers
 *
 * Registers all DepotDownloader-related IPC handlers with the main process.
 * This function should be called during application initialization.
 */
export function setupDepotDownloaderHandlers(): void {
  console.log('Setting up DepotDownloader IPC handlers');

  // Validate DepotDownloader installation
  ipcMain.handle('depotdownloader:validate-installation', handleValidateInstallation);

  // Steam login test (DepotDownloader combines login with download, so this is mainly for credential validation)
  ipcMain.handle('depotdownloader:login', handleLogin);

  // Download branch (main functionality - much simpler than SteamCMD!)
  ipcMain.handle('depotdownloader:download-branch', handleDownloadBranch);

  // Cancel current DepotDownloader download (if any)
  ipcMain.handle('depotdownloader:cancel', async () => {
    try {
      if (currentDownloadProc) {
        console.log('Cancelling DepotDownloader download process...');
        currentDownloadProc.kill();
        return { success: true };
      }
      if (currentLoginProc) {
        console.log('Cancelling DepotDownloader login process...');
        currentLoginProc.kill();
        return { success: true };
      }
      return { success: false, error: 'No active DepotDownloader process' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // Get branch build ID from DepotDownloader manifest files (replaces SteamCMD's app_info_print)
  ipcMain.handle('depotdownloader:get-branch-buildid', async (event, branchPath: string, appId: string) => {
    return await handleGetBranchBuildId(event, branchPath, appId);
  });

  console.log('DepotDownloader IPC handlers registered successfully');
}
