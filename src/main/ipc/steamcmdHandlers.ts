/**
 * SteamCMD IPC Handlers for Schedule I Developer Environment Utility
 * 
 * Provides IPC handlers for SteamCMD integration including installation validation,
 * login functionality, and branch download operations. Handles communication
 * between the main process and renderer process for SteamCMD operations.
 * 
 * Key features:
 * - SteamCMD installation validation
 * - Steam login and authentication
 * - Branch download and update operations
 * - Progress tracking and error handling
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

// Track current SteamCMD download process for cancellation
let currentDownloadProc: ChildProcess | null = null;

/**
 * Validates SteamCMD installation at the specified path
 * 
 * @param event IPC event object
 * @param steamCMDPath Path to SteamCMD installation
 * @returns Promise<{success: boolean, error?: string}> Validation result
 */
async function handleValidateInstallation(event: any, steamCMDPath: string): Promise<{success: boolean, error?: string}> {
  try {
    console.log('Validating SteamCMD installation at:', steamCMDPath);
    
    if (!steamCMDPath || !steamCMDPath.trim()) {
      return { success: false, error: 'SteamCMD path is required' };
    }

    // Check if the path exists
    if (!await fs.pathExists(steamCMDPath)) {
      return { success: false, error: 'SteamCMD path does not exist' };
    }

    // Check if it's a file (steamcmd.exe) or directory
    const stat = await fs.stat(steamCMDPath);
    let steamcmdExe: string;
    
    if (stat.isDirectory()) {
      // If it's a directory, look for steamcmd.exe inside
      steamcmdExe = path.join(steamCMDPath, 'steamcmd.exe');
    } else {
      // If it's a file, use it directly
      steamcmdExe = steamCMDPath;
    }

    // Check if steamcmd.exe exists
    if (!await fs.pathExists(steamcmdExe)) {
      return { success: false, error: 'steamcmd.exe not found at the specified path' };
    }

    // Test SteamCMD by running it with +quit
    return new Promise((resolve) => {
      // Spawn directly without shell so stdout/stderr stream reliably
      const steamcmd = spawn(steamcmdExe, ['+quit'], {
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      steamcmd.stdout.on('data', (data) => {
        output += data.toString();
      });

      steamcmd.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      steamcmd.on('close', (code) => {
        if (code === 0) {
          console.log('SteamCMD validation successful');
          resolve({ success: true });
        } else {
          console.log('SteamCMD validation failed with code:', code);
          resolve({ 
            success: false, 
            error: `SteamCMD validation failed (exit code: ${code}). ${errorOutput || output}` 
          });
        }
      });

      steamcmd.on('error', (error) => {
        console.error('SteamCMD validation error:', error);
        resolve({ 
          success: false, 
          error: `Failed to execute SteamCMD: ${error.message}` 
        });
      });

      // Set a timeout for the validation
      setTimeout(() => {
        steamcmd.kill();
        resolve({ 
          success: false, 
          error: 'SteamCMD validation timed out' 
        });
      }, 10000); // 10 second timeout
    });

  } catch (error) {
    console.error('Error validating SteamCMD installation:', error);
    return { 
      success: false, 
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Handles Steam login using SteamCMD
 * 
 * @param event IPC event object
 * @param steamCMDPath Path to SteamCMD installation
 * @param username Steam username
 * @param password Steam password
 * @returns Promise<{success: boolean, error?: string, requiresSteamGuard?: boolean}> Login result
 */
async function handleLogin(event: any, steamCMDPath: string, username: string, password: string): Promise<{success: boolean, error?: string, requiresSteamGuard?: boolean}> {
  try {
    console.log('Attempting Steam login for user:', username);
    
    // Check if Steam is running
    const steamProcess = await steamProcessService.detectSteamProcess();
    if (steamProcess.isRunning) {
      return { 
        success: false, 
        error: 'Steam is currently running. Please close Steam before attempting login.' 
      };
    }

    if (!steamCMDPath || !username || !password) {
      return { success: false, error: 'SteamCMD path, username, and password are required' };
    }

    // Determine steamcmd.exe path
    const stat = await fs.stat(steamCMDPath);
    let steamcmdExe: string;
    
    if (stat.isDirectory()) {
      steamcmdExe = path.join(steamCMDPath, 'steamcmd.exe');
    } else {
      steamcmdExe = steamCMDPath;
    }

    if (!await fs.pathExists(steamcmdExe)) {
      return { success: false, error: 'steamcmd.exe not found' };
    }

    // Attempt login
    return new Promise((resolve) => {
      // Spawn directly without shell so stdout/stderr stream reliably
      const steamcmd = spawn(steamcmdExe, [
        '+@ShutdownOnFailedCommand', '1',
        '+@NoPromptForPassword', '1',
        '+login', username, password, '+quit'
      ], {
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';
      let steamGuardRequired = false;
      let loginCompleted = false;

      // Monitor output in real-time for Steam Guard and completion
      const checkOutput = (data: string) => {
        const fullOutput = output + errorOutput + data;
        
        // Check if Steam Guard is required
        if (fullOutput.includes('Steam Guard') || fullOutput.includes('mobile authenticator')) {
          if (!steamGuardRequired) {
            steamGuardRequired = true;
            console.log('Steam Guard authentication required - waiting for user confirmation');
            // Send progress update to renderer
            event.sender.send('steamcmd-progress', {
              type: 'steam-guard',
              message: 'Steam Guard authentication required. Please confirm the login in your Steam Mobile app.'
            });
          }
        }

        // Check for successful login completion
        if (fullOutput.includes('Logging in user') && fullOutput.includes('OK') && 
            fullOutput.includes('Waiting for client config') && fullOutput.includes('OK') &&
            fullOutput.includes('Waiting for user info') && fullOutput.includes('OK')) {
          if (!loginCompleted) {
            loginCompleted = true;
            console.log('Steam login successful');
            resolve({ success: true });
          }
        }

        // Check for login failure
        if (fullOutput.includes('Login failure') || fullOutput.includes('Invalid password') || 
            fullOutput.includes('Account logon denied')) {
          console.log('Steam login failed');
          resolve({ 
            success: false, 
            error: 'Login failed: Invalid credentials or account access denied' 
          });
        }
      };

      steamcmd.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.log('SteamCMD output:', dataStr);
        checkOutput(dataStr);
      });

      steamcmd.stderr.on('data', (data) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        console.log('SteamCMD error output:', dataStr);
        checkOutput(dataStr);
      });

      steamcmd.on('close', (code) => {
        const fullOutput = output + errorOutput;
        console.log('SteamCMD login process closed with code:', code);

        // If we haven't resolved yet, check the final state
        if (!loginCompleted) {
          if (steamGuardRequired) {
            resolve({ 
              success: false, 
              error: 'Steam Guard authentication timed out. Please try again.',
              requiresSteamGuard: true
            });
          } else if (code === 0) {
            // Check if login was successful based on final output
            if (fullOutput.includes('Logging in user') && fullOutput.includes('OK')) {
              console.log('Steam login successful (detected on close)');
              resolve({ success: true });
            } else {
              resolve({ 
                success: false, 
                error: 'Login process completed but success could not be confirmed' 
              });
            }
          } else {
            resolve({ 
              success: false, 
              error: `Login process failed with exit code: ${code}` 
            });
          }
        }
      });

      steamcmd.on('error', (error) => {
        console.error('SteamCMD login error:', error);
        resolve({ 
          success: false, 
          error: `Failed to execute SteamCMD: ${error.message}` 
        });
      });

      // Set a timeout for the login
      setTimeout(() => {
        steamcmd.kill();
        resolve({ 
          success: false, 
          error: 'Steam login timed out' 
        });
      }, 30000); // 30 second timeout
    });

  } catch (error) {
    console.error('Error during Steam login:', error);
    return { 
      success: false, 
      error: `Login error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Downloads a branch using SteamCMD
 * 
 * @param event IPC event object
 * @param steamCMDPath Path to SteamCMD installation
 * @param username Steam username
 * @param password Steam password
 * @param branchPath Path where to install the branch
 * @param appId Steam App ID
 * @param branchId Steam branch ID
 * @returns Promise<{success: boolean, error?: string}> Download result
 */
async function handleDownloadBranch(event: any, steamCMDPath: string, username: string, password: string, branchPath: string, appId: string, branchId: string): Promise<{success: boolean, error?: string}> {
  try {
    console.log('Downloading branch:', branchId, 'to:', branchPath);

    if (!steamCMDPath || !username || !password || !branchPath || !appId || !branchId) {
      return { success: false, error: 'All parameters are required for branch download' };
    }

    // Ensure branch directory exists and normalize path for Windows
    await fs.ensureDir(branchPath);
    const installDir = path.resolve(branchPath);

    // Determine steamcmd.exe path
    const stat = await fs.stat(steamCMDPath);
    const steamcmdExe = stat.isDirectory() ? path.join(steamCMDPath, 'steamcmd.exe') : steamCMDPath;
    if (!await fs.pathExists(steamcmdExe)) {
      return { success: false, error: 'steamcmd.exe not found' };
    }

    // Build SteamCMD arguments factory
    const isPublic = (branchId?.toLowerCase() === 'public' || branchId?.toLowerCase() === 'main');
    const buildArgs = (): string[] => {
      const args: string[] = [
        '+@ShutdownOnFailedCommand', '1',
        '+@NoPromptForPassword', '1',
        // Login first to establish session
        '+login', username, password,
        // Then set install dir
        '+force_install_dir', installDir,
      ];

      // Build +app_update argument. For beta branches, SteamCMD expects the
      // appid and -beta switch in the same token after +app_update.
      if (isPublic) {
        args.push('+app_update', `${appId} validate`);
      } else {
        args.push('+app_update', `${appId} -beta ${branchId} validate`);
      }

      // Finally quit
      args.push('+quit');
      return args;
    };

    // Retry policy: up to 2 retries for Steam-running conflicts and login-type failures
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
      event?.sender?.send('steamcmd-progress', { type: 'info', message: msg });
      await wait(waitMs);
      if (attempt === maxAttempts - 1) {
        return { success: false, error: 'Steam is currently running. Please close Steam before downloading.' };
      }
    }

    // We'll spawn without shell and pass the path directly

    const attemptOnce = () => new Promise<{success: boolean, error?: string, output?: string}>((resolve) => {
      const args = buildArgs();
      const printable = [steamcmdExe, ...args.map(a => (a.includes(' ') ? `"${a}"` : a))].join(' ');
      console.log('Launching SteamCMD:', printable);
      const steamcmd = spawn(steamcmdExe, args, { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      try { event?.sender?.send('steamcmd-progress', { type: 'info', message: `Launching: ${printable}` }); } catch {}
      currentDownloadProc = steamcmd;

      let output = '';
      let errorOutput = '';

      // Progress parsing and buffered emission to avoid IPC overload
      const parsePercent = (text: string): number | null => {
        try {
          const line = text;
          // 1) explicit percent, e.g., "36.30%"
          const pm = line.match(/\b([0-9]{1,3}(?:\.[0-9]+)?)%\b/);
          if (pm) return Math.max(0, Math.min(100, parseFloat(pm[1])));
          // 2) progress: N or progress: 0.N
          const m1 = line.match(/progress:\s*([0-9]+(?:\.[0-9]+)?)/i);
          if (m1) {
            const v = parseFloat(m1[1]);
            if (!Number.isNaN(v)) return v <= 1 ? v * 100 : v;
          }
          // 3) bytes count pattern "(cur / total)"
          const m3 = line.match(/\((\d+)\s*\/\s*(\d+)\)/);
          if (m3) {
            const cur = parseFloat(m3[1]);
            const total = parseFloat(m3[2]);
            if (total > 0) return Math.max(0, Math.min(100, (cur / total) * 100));
          }
          // 4) Success marker
          if (/Success!\s*App\s*'\d+'\s*fully installed\./i.test(line)) return 100;
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
              event.sender.send('steamcmd-progress', { type: 'output', data: outBuf });
              outBuf = '';
            }
            if (errBuf) {
              event.sender.send('steamcmd-progress', { type: 'error', data: errBuf });
              errBuf = '';
            }
            if (latestPercent != null) {
              event.sender.send('steamcmd-progress', { type: 'percent', value: latestPercent });
            }
          } catch {}
        }, 50); // flush every 50ms max
      };

      const handleChunk = (chunk: string, isError = false) => {
        if (!chunk) return;
        const p = parsePercent(chunk);
        if (p != null) latestPercent = p;
        if (isError) errBuf += chunk; else outBuf += chunk;
        scheduleFlush();
      };

      steamcmd.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.log('SteamCMD output:', dataStr);
        handleChunk(dataStr, false);
      });

      steamcmd.stderr.on('data', (data) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        console.log('SteamCMD error output:', dataStr);
        handleChunk(dataStr, true);
      });

      steamcmd.on('close', (code) => {
        const fullOutput = output + errorOutput;
        console.log('SteamCMD download completed with code:', code);
        currentDownloadProc = null;
        // Final flush to ensure last chunks are delivered
        try {
          if (outBuf) event?.sender?.send('steamcmd-progress', { type: 'output', data: outBuf });
          if (errBuf) event?.sender?.send('steamcmd-progress', { type: 'error', data: errBuf });
          if (latestPercent != null) event?.sender?.send('steamcmd-progress', { type: 'percent', value: latestPercent });
        } catch {}
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: `Download failed: ${fullOutput || 'Unknown error'}`, output: fullOutput });
        }
      });

      steamcmd.on('error', (error) => {
        console.error('SteamCMD download error:', error);
        resolve({ success: false, error: `Failed to execute SteamCMD: ${error.message}` });
      });
    });

    let lastError: string | undefined;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const waitMs = backoffs[Math.min(attempt, backoffs.length - 1)];
      if (waitMs > 0) {
        const msg = `Retrying download (attempt ${attempt+1}/${maxAttempts}) in ${Math.round(waitMs/1000)}s...`;
        console.log(msg);
        event?.sender?.send('steamcmd-progress', { type: 'info', message: msg });
        await wait(waitMs);
      }

      const res = await attemptOnce();
      if (res.success) return { success: true };

      lastError = res.error;
      const out = (res.output || '').toLowerCase();
      const loginFailure = out.includes('login failure') || out.includes('invalid password') || out.includes('account logon denied');
      const steamRunning = out.includes('steam is running');

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
    console.error('Error during branch download:', error);
    return { success: false, error: `Download error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Sets up all SteamCMD IPC handlers
 * 
 * Registers all SteamCMD-related IPC handlers with the main process.
 * This function should be called during application initialization.
 */
export function setupSteamCMDHandlers(): void {
  console.log('Setting up SteamCMD IPC handlers');

  // Validate SteamCMD installation
  ipcMain.handle('steamcmd:validate-installation', handleValidateInstallation);

  // Steam login
  ipcMain.handle('steamcmd:login', handleLogin);

  // Download branch
  ipcMain.handle('steamcmd:download-branch', handleDownloadBranch);

  // Cancel current SteamCMD download (if any)
  ipcMain.handle('steamcmd:cancel', async () => {
    try {
      if (currentDownloadProc) {
        console.log('Cancelling SteamCMD download process...');
        currentDownloadProc.kill();
        return { success: true };
      }
      return { success: false, error: 'No active SteamCMD download' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // Get branch build ID via SteamCMD app_info_print
  ipcMain.handle('steamcmd:get-branch-buildid', async (event, steamCMDPath: string, username: string, password: string, appId: string, branchId: string) => {
    try {
      // Resolve steamcmd.exe
      const stat = await fs.stat(steamCMDPath);
      const steamcmdExe = stat.isDirectory() ? path.join(steamCMDPath, 'steamcmd.exe') : steamCMDPath;
      if (!await fs.pathExists(steamcmdExe)) {
        return { success: false, error: 'steamcmd.exe not found' };
      }

      return await new Promise<{success: boolean, buildId?: string, error?: string}>((resolve) => {
        const args = [
          '+@ShutdownOnFailedCommand', '1',
          '+@NoPromptForPassword', '1',
          '+login', username, password,
          '+app_info_print', appId,
          '+quit'
        ];

        const child = spawn(steamcmdExe, args, { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let output = '';
        let errorOut = '';

        const tryResolve = (merged: string) => {
          try {
            const branchKey = branchId?.toLowerCase() === 'main' ? 'public' : branchId;
            const regex = new RegExp(`"${branchKey}"[\n\r\t\s\S]*?"buildid"\s*"(\\d+)"`, 'i');
            const match = merged.match(regex);
            if (match && match[1]) {
              resolve({ success: true, buildId: match[1] });
              return true;
            }
          } catch {}
          return false;
        };

        child.stdout.on('data', (d) => {
          const s = d.toString();
          output += s;
        });
        child.stderr.on('data', (d) => {
          const s = d.toString();
          errorOut += s;
        });
        child.on('close', () => {
          const merged = output + '\n' + errorOut;
          if (!tryResolve(merged)) {
            resolve({ success: false, error: 'Failed to parse build ID from SteamCMD output' });
          }
        });
        child.on('error', (err) => {
          resolve({ success: false, error: `Failed to execute SteamCMD: ${err.message}` });
        });
      });
    } catch (err) {
      return { success: false, error: `Error getting build ID: ${err instanceof Error ? err.message : String(err)}` };
    }
  });

  console.log('SteamCMD IPC handlers registered successfully');
}
