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
import * as os from 'os';
import { SteamProcessService } from '../services/SteamProcessService';
import { CredentialService } from '../services/CredentialService';
import { ConfigService } from '../services/ConfigService';
import { getBranchVersionPath, getBranchVersionPathByManifest, ensureBranchVersionDirectory, detectLegacyBranchStructure, migrateLegacyBranch } from '../utils/pathUtils';

/**
 * Copies contents from manifest_<manifest_id> folder to build_<manifest_id> folder
 * This ensures that the actual build files are in the build directory for MelonLoader installation
 * 
 * @param manifestDirectory The manifest directory where DepotDownloader downloaded files
 * @param buildDirectory The build directory where files should be moved to
 */
async function copyManifestContentsToBuildDirectory(manifestDirectory: string, buildDirectory: string): Promise<void> {
  try {
    if (!await fs.pathExists(manifestDirectory)) {
      console.log('No manifest directory found, skipping copy');
      return;
    }

    console.log(`Copying contents from manifest directory to build directory`);
    console.log(`From: ${manifestDirectory}`);
    console.log(`To: ${buildDirectory}`);

    // Ensure the build directory exists
    await fs.ensureDir(buildDirectory);

    // Read all files and directories in the manifest directory
    const manifestContents = await fs.readdir(manifestDirectory);
    
    for (const item of manifestContents) {
      const sourcePath = path.join(manifestDirectory, item);
      const targetPath = path.join(buildDirectory, item);
      
      const stat = await fs.stat(sourcePath);
      
      if (stat.isDirectory()) {
        // Copy directory recursively
        await fs.copy(sourcePath, targetPath);
        console.log(`Copied directory: ${item}`);
      } else {
        // Copy file
        await fs.copyFile(sourcePath, targetPath);
        console.log(`Copied file: ${item}`);
      }
    }
    
    console.log('Manifest contents copy completed');
  } catch (error) {
    console.error('Error copying manifest contents:', error);
    throw error;
  }
}

/**
 * Cleans up manifest directory after copying contents to build directory
 * 
 * @param manifestDirectory The manifest directory to clean up
 */
async function cleanupManifestDirectory(manifestDirectory: string): Promise<void> {
  try {
    if (!await fs.pathExists(manifestDirectory)) {
      return;
    }

    // Always remove the manifest directory after copying contents to build directory
    await fs.remove(manifestDirectory);
    console.log(`Cleaned up manifest directory: ${manifestDirectory}`);
  } catch (error) {
    console.warn('Failed to clean up manifest directory:', error);
  }
}

/**
 * Copies manifest files from .DepotDownloader directory to the main build directory
 * This ensures that manifest files are available in the build folder for later reference
 * 
 * @param buildDirectory The build directory where files were downloaded
 */
async function copyManifestFilesToBuildDirectory(buildDirectory: string): Promise<void> {
  try {
    const depotDownloaderDir = path.join(buildDirectory, '.DepotDownloader');
    
    if (!await fs.pathExists(depotDownloaderDir)) {
      console.log('No .DepotDownloader directory found, skipping manifest copy');
      return;
    }

    console.log('Copying manifest files from .DepotDownloader to build directory');
    
    // Read all files in the .DepotDownloader directory
    const manifestFiles = await fs.readdir(depotDownloaderDir);
    
    for (const file of manifestFiles) {
      const sourcePath = path.join(depotDownloaderDir, file);
      const targetPath = path.join(buildDirectory, file);
      
      // Copy manifest files (but avoid overwriting existing game files)
      if (file.endsWith('.manifest') || file.endsWith('.json') || file.endsWith('.txt')) {
        try {
          await fs.copyFile(sourcePath, targetPath);
          console.log(`Copied manifest file: ${file}`);
        } catch (error) {
          console.warn(`Failed to copy manifest file ${file}:`, error);
        }
      }
    }
    
    console.log('Manifest files copy completed');
  } catch (error) {
    console.error('Error copying manifest files:', error);
    throw error;
  }
}

const steamProcessService = new SteamProcessService();
const credentialService = new CredentialService();
const configService = new ConfigService();

// Track current DepotDownloader processes for cancellation
let currentDownloadProc: ChildProcess | null = null;

/**
 * Finds the DepotDownloader executable path
 * @param depotDownloaderPath Optional path to DepotDownloader installation or exe
 * @returns Promise<string | null> Path to executable or null if not found
 */
async function findDepotDownloaderExecutable(depotDownloaderPath?: string): Promise<string | null> {
  try {
    if (depotDownloaderPath && depotDownloaderPath.trim()) {
      if (!await fs.pathExists(depotDownloaderPath)) {
        return null;
      }
      const stat = await fs.stat(depotDownloaderPath);
      const exe = stat.isDirectory() ? path.join(depotDownloaderPath, 'DepotDownloader.exe') : depotDownloaderPath;
      if (!await fs.pathExists(exe)) {
        return null;
      }
      return exe;
    }

    // Try common command names on PATH
    const candidates = ['DepotDownloader', 'depotdownloader', 'DepotDownloader.exe'];
    // For now, return the first candidate and let spawn handle PATH resolution
    return candidates[0];
  } catch (e) {
    return null;
  }
}
let currentLoginProc: ChildProcess | null = null;

// Basic input validation helpers (defense-in-depth)
function containsControlChars(value: string): boolean {
  return /[\x00-\x1F\x7F]/.test(value);
}

function isSafeUsername(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (value.length > 256) return false;
  if (containsControlChars(value)) return false;
  return true;
}

function isSafePassword(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (value.length > 512) return false;
  if (containsControlChars(value)) return false;
  return true;
}

function isSafePath(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (value.length > 1024) return false;
  if (containsControlChars(value)) return false;
  return true;
}

function isSafeAppId(value: string): boolean {
  return typeof value === 'string' && /^\d{1,10}$/.test(value);
}

function isSafeBranchId(value: string): boolean {
  // Allow alphanumerics and dashes/underscores (e.g., public, beta, alternate-beta)
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value) && !containsControlChars(value);
}

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

    // Try common command names on PATH without shell (safer)
    const candidates = ['DepotDownloader', 'depotdownloader', 'DepotDownloader.exe'];
    // Optimistically return first candidate; spawn will search PATH
    return { cmd: candidates[0], shell: false };
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
      const child = spawn(cmd, args, { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

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
      { cmd: 'DepotDownloader', shell: false },
      { cmd: 'depotdownloader', shell: false },
      { cmd: 'DepotDownloader.exe', shell: false }
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

    if (!isSafeUsername(username)) {
      return { success: false, error: 'Invalid username' };
    }
    if (!isSafePassword(password)) {
      return { success: false, error: 'Invalid password' };
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
        shell: false,
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
 * @param buildId Optional build ID for version-specific downloads
 * @param depots Optional array of depot information for manifest-specific downloads
 * @returns Promise<{success: boolean, error?: string}> Download result
 */
async function handleDownloadBranch(event: any, depotDownloaderPath: string | undefined, username: string, password: string, branchPath: string, appId: string, branchId: string, buildId?: string, depots?: Array<{depotId: string, manifestId: string}>): Promise<{success: boolean, error?: string}> {
  try {
    console.log('Downloading branch with DepotDownloader:', branchId, 'to:', branchPath, buildId ? `(build: ${buildId})` : '');

    if (!username || !password || !branchPath || !appId || !branchId) {
      return { success: false, error: 'All parameters are required for branch download' };
    }

    // For version-specific downloads, use the provided branchPath directly
    let installDir: string;
    if (buildId) {
      // Use branchPath directly when buildId is provided
      await ensureBranchVersionDirectory(branchPath);
      installDir = path.resolve(branchPath);
    } else {
      // Legacy behavior - check for legacy structure and migrate if needed
      const branchBasePath = path.dirname(branchPath);
      const isLegacy = await detectLegacyBranchStructure(branchBasePath);
      
      if (isLegacy) {
        console.log('Detected legacy branch structure, migrating...');
        // For now, use the existing path but log the migration need
        console.log('Legacy structure detected - migration needed for multi-version support');
      }
      
      await fs.ensureDir(branchPath);
      installDir = path.resolve(branchPath);
    }

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

      // If specific depots are provided, use depot and manifest arguments
      if (depots && depots.length > 0) {
        console.log(`Using depot-specific download for ${depots.length} depots`);
        for (const depot of depots) {
          args.push('-depot', depot.depotId);
          args.push('-manifest', depot.manifestId);
        }
      } else {
        // Handle branch mapping: main-branch → public (no -beta flag needed)
        // beta-branch → beta, alternate-branch → alternate, etc.
        const steamBranchKey = branchId === 'main-branch' ? 'public' : branchId.replace('-branch', '');
        if (steamBranchKey !== 'public') {
          args.push('-beta', steamBranchKey);
        }
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
      // Prepare a safe printable command string while masking sensitive args
      const maskedArgs: string[] = [];
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '-password' && i + 1 < args.length) { maskedArgs.push('-password', '***'); i++; continue; }
        maskedArgs.push(a);
      }
      const printable = [resolved.cmd, ...maskedArgs.map(a => (a.includes(' ') ? `"${a}"` : a))].join(' ');
      console.log('Launching DepotDownloader:', printable);
      const depotDownloader = spawn(resolved.cmd, args, { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      try { event?.sender?.send('depotdownloader-progress', { type: 'info', message: 'Launching DepotDownloader...' }); } catch {}
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

      depotDownloader.on('close', async (code) => {
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
          // Post-download: Check if we downloaded to a manifest directory and need to copy to build directory
          try {
            // Check if the install directory is a manifest directory (contains manifest_ in the path)
            if (installDir.includes('manifest_') && !installDir.includes('build_')) {
              // Create the build directory path (replace manifest_ with build_)
              const buildPath = installDir.replace(/manifest_(\d+)$/, 'build_$1');
              
              // Copy contents from manifest directory to build directory
              await copyManifestContentsToBuildDirectory(installDir, buildPath);
              
              // Clean up manifest directory
              await cleanupManifestDirectory(installDir);
              
              console.log(`Successfully moved contents from manifest directory to build directory`);
            } else {
              // For regular downloads, copy manifest files from .DepotDownloader to main directory
              await copyManifestFilesToBuildDirectory(installDir);
            }
          } catch (manifestError) {
            console.warn('Failed to copy manifest files:', manifestError);
            // Don't fail the download for manifest copy issues
          }
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
 * Downloads a specific branch version using DepotDownloader with manifest-accurate downloads
 *
 * @param event IPC event object
 * @param depotDownloaderPath Path to DepotDownloader installation
 * @param username Steam username
 * @param password Steam password
 * @param branchName Branch name (not Steam key)
 * @param buildId Build ID to download
 * @param appId Steam App ID
 * @param branchId Steam branch ID
 * @param managedEnvironmentPath Managed environment root path
 * @returns Promise<{success: boolean, error?: string}> Download result
 */
async function handleDownloadBranchVersion(event: any, depotDownloaderPath: string | undefined, username: string, password: string, branchName: string, buildId: string, appId: string, branchId: string, managedEnvironmentPath: string): Promise<{success: boolean, error?: string}> {
  try {
    console.log('Downloading branch version with DepotDownloader:', branchName, 'build:', buildId);

    if (!username || !password || !branchName || !buildId || !appId || !branchId || !managedEnvironmentPath) {
      return { success: false, error: 'All parameters are required for version download' };
    }

    // Use the new path structure for version-specific downloads
    const versionPath = getBranchVersionPath(managedEnvironmentPath, branchName, buildId);
    await ensureBranchVersionDirectory(versionPath);

    // Check if this version already exists
    if (await fs.pathExists(versionPath) && (await fs.readdir(versionPath)).length > 0) {
      return { success: false, error: `Version ${buildId} already exists for branch ${branchName}` };
    }

    // Try to get depot manifests for manifest-accurate download
    try {
      const { SteamUpdateService } = await import('../services/SteamUpdateService');
      const { LoggingService } = await import('../services/LoggingService');
      const { ConfigService } = await import('../services/ConfigService');
      
      const configService = new ConfigService();
      const loggingService = new LoggingService(configService);
      const steamService = new SteamUpdateService(loggingService);
      
      // Ensure Steam connection
      if (!steamService.isConnectedToSteam()) {
        await steamService.connect();
      }

      const depots = await steamService.getDepotManifestsForBuild(buildId);
      
      if (depots && depots.length > 0) {
        console.log(`Using manifest-accurate download for build ${buildId} with ${depots.length} depots`);
        
        // Convert to the format expected by sequential depot download
        const depotList = depots.map(depot => ({
          depotId: depot.depotId,
          manifestId: depot.manifestId
        }));

        // Use sequential depot download with manifests
        const result = await handleDownloadBranchSequentialDepots(
          event,
          depotDownloaderPath,
          username,
          password,
          versionPath,
          appId,
          branchId,
          buildId,
          depotList
        );

        return result;
      } else {
        console.log(`No manifests available for build ${buildId}, falling back to generic download`);
      }
    } catch (manifestError) {
      console.warn(`Failed to get manifests for build ${buildId}:`, manifestError);
      console.log(`Falling back to generic download for build ${buildId}`);
    }

    // Fall back to generic download if manifest resolution fails
    return await handleDownloadBranch(event, depotDownloaderPath, username, password, versionPath, appId, branchId, buildId);

  } catch (error) {
    console.error('Error during branch version download with DepotDownloader:', error);
    return { success: false, error: `Version download error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Migrates a legacy branch structure to the new version-specific structure
 *
 * @param event IPC event object
 * @param branchPath Legacy branch path
 * @param versionId Version ID to use for the migrated version (build ID or manifest ID)
 * @param useManifestId Whether to use manifest ID naming convention
 * @returns Promise<{success: boolean, error?: string}> Migration result
 */
async function handleMigrateLegacyBranch(event: any, branchPath: string, versionId: string, useManifestId: boolean = false): Promise<{success: boolean, error?: string}> {
  try {
    console.log('Migrating legacy branch structure:', branchPath, 'to version:', versionId, 'useManifestId:', useManifestId);

    if (!branchPath || !versionId) {
      return { success: false, error: 'Branch path and version ID are required for migration' };
    }

    const result = await migrateLegacyBranch(branchPath, versionId, useManifestId ? 'manifest' : 'build');
    return result;

  } catch (error) {
    console.error('Error during legacy branch migration:', error);
    return { success: false, error: `Migration error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Downloads a branch version using manifest ID
 *
 * @param event IPC event object
 * @param depotDownloaderPath Path to DepotDownloader installation
 * @param username Steam username
 * @param password Steam password
 * @param branchName Branch name
 * @param manifestId Manifest ID to download
 * @param appId Steam App ID
 * @param managedEnvironmentPath Managed environment root path
 * @returns Promise<{success: boolean, error?: string}> Download result
 */
async function handleDownloadBranchVersionByManifest(event: any, depotDownloaderPath: string | undefined, username: string, password: string, branchName: string, manifestId: string, appId: string, managedEnvironmentPath: string): Promise<{success: boolean, output?: string, error?: string}> {
  try {
    console.log('Downloading branch version by manifest ID:', branchName, 'manifest:', manifestId);

    if (!username || !password || !branchName || !manifestId || !appId || !managedEnvironmentPath) {
      return { success: false, error: 'All parameters are required for manifest download' };
    }

    // Use manifest ID based path structure
    const versionPath = getBranchVersionPathByManifest(managedEnvironmentPath, branchName, manifestId);
    await ensureBranchVersionDirectory(versionPath);

    // Check if this version already exists
    if (await fs.pathExists(versionPath) && (await fs.readdir(versionPath)).length > 0) {
      return { success: false, error: `Version ${manifestId} already exists for branch ${branchName}` };
    }

    // Use the existing manifest download handler
    const result = await handleDownloadWithManifest(event, depotDownloaderPath, username, password, branchName, manifestId, appId, '3164501', managedEnvironmentPath);
    console.log('handleDownloadBranchVersionByManifest result:', { success: result.success, hasOutput: !!result.output, hasError: !!result.error });
    return result;

  } catch (error) {
    console.error('Error during branch version download by manifest:', error);
    return { success: false, error: `Manifest download error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Gets branch build ID and manifest IDs from DepotDownloader manifest files (replaces SteamCMD's app_info_print)
 *
 * @param event IPC event object
 * @param branchPath Path to the downloaded branch
 * @param appId Steam App ID
 * @returns Promise<{success: boolean, buildId?: string, manifestIds?: string[], error?: string}> Build ID and manifest IDs result
 */
async function handleGetBranchBuildId(event: any, branchPath: string, appId: string): Promise<{success: boolean, buildId?: string, manifestIds?: string[], error?: string}> {
  try {
    console.log('Getting build ID and manifest IDs from DepotDownloader manifest at:', branchPath);

    if (!branchPath || !appId) {
      return { success: false, error: 'Branch path and App ID are required' };
    }

    // DepotDownloader creates .DepotDownloader directory with metadata
    const manifestPath = path.join(branchPath, '.DepotDownloader');

    if (!await fs.pathExists(manifestPath)) {
      return { success: false, error: 'DepotDownloader manifest directory not found. Download may have failed or used different tool.' };
    }

    const files = await fs.readdir(manifestPath);
    let buildId: string | undefined;
    const manifestIds: string[] = [];

    // Look for depot manifest files that contain build information
    for (const file of files) {
      if (file.includes(`depot_`) && (file.endsWith('.manifest') || file.endsWith('.json'))) {
        const filePath = path.join(manifestPath, file);
        const manifestData = await fs.readFile(filePath, 'utf8');

        // Parse manifest for build ID - format may vary depending on DepotDownloader version
        if (!buildId) {
          const buildIdMatch = manifestData.match(/BuildID[^\d]*(\d+)/i) ||
                              manifestData.match(/"buildid":\s*"?(\d+)"?/i) ||
                              manifestData.match(/build[_\s]*id[^\d]*(\d+)/i);

          if (buildIdMatch) {
            buildId = buildIdMatch[1];
            console.log('Found build ID in manifest:', buildId);
          }
        }

        // Extract manifest ID from depot manifest files
        const manifestIdMatch = manifestData.match(/ManifestID[^\d]*(\d+)/i) ||
                               manifestData.match(/"manifestid":\s*"?(\d+)"?/i) ||
                               manifestData.match(/manifest[_\s]*id[^\d]*(\d+)/i);

        if (manifestIdMatch) {
          const manifestId = manifestIdMatch[1];
          if (!manifestIds.includes(manifestId)) {
            manifestIds.push(manifestId);
            console.log('Found manifest ID in depot file:', manifestId);
          }
        }
      }
    }

    // If no build ID found in manifests, try to extract from depot files
    if (!buildId) {
      for (const file of files) {
        if (file.includes('depot_') && file.includes('.txt')) {
          const filePath = path.join(manifestPath, file);
          const data = await fs.readFile(filePath, 'utf8');
          const buildIdMatch = data.match(/build[_\s]*id[^\d]*(\d+)/i);
          if (buildIdMatch) {
            buildId = buildIdMatch[1];
            console.log('Found build ID in depot file:', buildId);
            break;
          }
        }
      }
    }

    if (!buildId) {
      return { success: false, error: 'Build ID not found in DepotDownloader manifest files' };
    }

    return { success: true, buildId, manifestIds: manifestIds.length > 0 ? manifestIds : undefined };

  } catch (error) {
    console.error('Error reading DepotDownloader manifest:', error);
    return { success: false, error: `Failed to read manifest: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Downloads a branch with specific depot and manifest information
 *
 * @param event IPC event object
 * @param depotDownloaderPath Path to DepotDownloader installation
 * @param username Steam username
 * @param password Steam password
 * @param branchPath Path where to install the branch
 * @param appId Steam App ID
 * @param branchId Steam branch ID
 * @param buildId Build ID for version-specific downloads
 * @param depots Array of depot information for manifest-specific downloads
 * @returns Promise<{success: boolean, error?: string}> Download result
 */
async function handleDownloadBranchWithManifests(event: any, depotDownloaderPath: string | undefined, username: string, password: string, branchPath: string, appId: string, branchId: string, buildId: string, depots: Array<{depotId: string, manifestId: string}>): Promise<{success: boolean, error?: string}> {
  try {
    console.log('Downloading branch with specific manifests:', branchId, 'build:', buildId, 'depots:', depots.length);

    if (!username || !password || !branchPath || !appId || !branchId || !buildId || !depots || depots.length === 0) {
      return { success: false, error: 'All parameters including depots are required for manifest-specific download' };
    }

    // Use the main download function with depot information
    return await handleDownloadBranch(event, depotDownloaderPath, username, password, branchPath, appId, branchId, buildId, depots);

  } catch (error) {
    console.error('Error during branch download with manifests:', error);
    return { success: false, error: `Manifest download error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Downloads with specific manifest ID using -app -depot -manifest format
 *
 * @param event IPC event object
 * @param depotDownloaderPath Path to DepotDownloader installation
 * @param username Steam username
 * @param password Steam password
 * @param branchName Branch name for path structure
 * @param manifestId Manifest ID to download
 * @param appId Steam App ID
 * @param depotId Depot ID
 * @param managedEnvironmentPath Managed environment root path
 * @returns Promise<{success: boolean, error?: string}> Download result
 */
async function handleDownloadWithManifest(event: any, depotDownloaderPath: string | undefined, username: string, password: string, branchName: string, manifestId: string, appId: string, depotId: string, managedEnvironmentPath: string): Promise<{success: boolean, output?: string, error?: string}> {
  try {
    console.log('Downloading with specific manifest:', manifestId, 'for branch:', branchName);

    if (!username || !password || !branchName || !manifestId || !appId || !depotId || !managedEnvironmentPath) {
      return { success: false, error: 'All parameters are required for manifest download' };
    }

    // Create version-specific path using manifestId with manifest type
    const versionPath = getBranchVersionPath(managedEnvironmentPath, branchName, manifestId, 'manifest');
    await ensureBranchVersionDirectory(versionPath);

    // Check if this version already exists
    if (await fs.pathExists(versionPath) && (await fs.readdir(versionPath)).length > 0) {
      return { success: false, error: `Version ${manifestId} already exists for branch ${branchName}` };
    }

    // Resolve DepotDownloader command
    const resolved = await resolveDepotDownloaderCommand(depotDownloaderPath);
    if (resolved.error) return { success: false, error: resolved.error };

    // Map branch name to Steam branch key for -beta parameter
    const getSteamBranchKey = (branchName: string): string => {
      switch (branchName) {
        case 'main-branch':
          return 'public';
        case 'beta-branch':
          return 'beta';
        case 'alternate-branch':
          return 'alternate';
        case 'alternate-beta-branch':
          return 'alternate-beta';
        default:
          return 'alternate-beta'; // Default to alternate-beta
      }
    };

    const steamBranchKey = getSteamBranchKey(branchName);
    console.log(`Using Steam branch key: ${steamBranchKey} for branch: ${branchName}`);

    // Build DepotDownloader arguments for specific manifest
    const args: string[] = [
      '-app', appId,
      '-depot', depotId,
      '-manifest', manifestId,
      '-beta', steamBranchKey,
      '-username', username,
      '-password', password,
      '-dir', (resolved.shell && versionPath.includes(' ')) ? `"${versionPath}"` : versionPath,
      '-max-downloads', '8'
    ];

    console.log('Launching DepotDownloader with manifest-specific args:', args.map(a => a === password ? '***' : a).join(' '));

    return new Promise<{success: boolean, output?: string, error?: string}>((resolve) => {
      const depotDownloader = spawn(resolved.cmd, args, { 
        shell: false, 
        windowsHide: true, 
        stdio: ['ignore', 'pipe', 'pipe'] 
      });
      currentDownloadProc = depotDownloader;

      let output = '';
      let errorOutput = '';

      // Progress parsing for DepotDownloader
      const parseProgress = (text: string): number | null => {
        try {
          const cleaned = text.replace(/\x1b\[[0-9;]*m/g, '').replace(/\r/g, '\n');
          const firstLine = cleaned.split('\n')[0] || '';
          const startMatch = firstLine.match(/^\s*(\d{1,3}(?:\.\d{1,2})?)%(?:\s|$)/);
          if (startMatch) return Math.max(0, Math.min(100, parseFloat(startMatch[1])));

          const progressMatch = cleaned.match(/\((\d+(?:\.\d+)?)%\)/);
          if (progressMatch) return Math.max(0, Math.min(100, parseFloat(progressMatch[1])));

          const progressLabelMatch = cleaned.match(/progress\s*:?\s*(\d+(?:\.\d+)?)%/i);
          if (progressLabelMatch) return Math.max(0, Math.min(100, parseFloat(progressLabelMatch[1])));

          const anyPercent = cleaned.match(/(\d+(?:\.\d+)?)%/);
          if (anyPercent) return Math.max(0, Math.min(100, parseFloat(anyPercent[1])));

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
        }, 50);
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

      depotDownloader.on('close', async (code) => {
        const fullOutput = output + errorOutput;
        console.log('DepotDownloader manifest download completed with code:', code);
        currentDownloadProc = null;

        // Final flush
        try {
          if (outBuf) event?.sender?.send('depotdownloader-progress', { type: 'output', data: outBuf });
          if (errBuf) event?.sender?.send('depotdownloader-progress', { type: 'error', data: errBuf });
          if (latestPercent != null) event?.sender?.send('depotdownloader-progress', { type: 'percent', value: latestPercent });
        } catch {}

        if (code === 0) {
          // Post-download: Copy contents from manifest_<manifest_id> to build_<manifest_id>
          // try {
          //   // Create the build directory path (replace manifest_ with build_)
          //   const buildPath = versionPath.replace(/manifest_(\d+)$/, 'build_$1');
            
          //   // Copy contents from manifest directory to build directory
          //   await copyManifestContentsToBuildDirectory(versionPath, buildPath);
            
          //   // Clean up manifest directory
          //   await cleanupManifestDirectory(versionPath);
            
          //   console.log(`Successfully moved contents from manifest directory to build directory`);

          //   // Set the newly downloaded version as active
          //   try {
          //     const buildId = manifestId; // Since we are using manifest_ to build_
          //     console.log(`Setting active build for branch ${branchName} to ${buildId}`);
          //     configService.setActiveBuild(branchName, buildId);
          //     configService.setBranchVersion(branchName, buildId, {
          //       buildId: buildId,
          //       manifestId: manifestId,
          //       downloadDate: new Date().toISOString(),
          //       isActive: true,
          //       path: buildPath,
          //     });
          //     console.log(`Successfully set active build and version info`);
          //   } catch (configError) {
          //     console.warn('Failed to set active build in config:', configError);
          //   }

          // } catch (manifestError) {
          //   console.warn('Failed to copy manifest contents:', manifestError);
          //   // Don't fail the download for manifest copy issues
          // }
          resolve({ success: true, output: fullOutput });
        } else {
          resolve({ success: false, error: `Download failed: ${fullOutput || 'Unknown error'}` });
        }
      });

      depotDownloader.on('error', (error) => {
        console.error('DepotDownloader manifest download error:', error);
        resolve({ success: false, error: `Failed to execute DepotDownloader: ${error.message}` });
      });
    });

  } catch (error) {
    console.error('Error during manifest download with DepotDownloader:', error);
    return { success: false, error: `Manifest download error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Downloads multiple depots sequentially for a specific build
 *
 * @param event IPC event object
 * @param depotDownloaderPath Path to DepotDownloader installation
 * @param username Steam username
 * @param password Steam password
 * @param branchPath Path where to install the branch
 * @param appId Steam App ID
 * @param branchId Steam branch ID
 * @param buildId Build ID for version-specific downloads
 * @param depots Array of depot information for sequential downloads
 * @returns Promise<{success: boolean, error?: string, completedDepots?: number}> Download result
 */
async function handleDownloadBranchSequentialDepots(event: any, depotDownloaderPath: string | undefined, username: string, password: string, branchPath: string, appId: string, branchId: string, buildId: string, depots: Array<{depotId: string, manifestId: string}>): Promise<{success: boolean, error?: string, completedDepots?: number}> {
  try {
    console.log('Starting sequential depot download:', branchId, 'build:', buildId, 'depots:', depots.length);

    if (!username || !password || !branchPath || !appId || !branchId || !buildId || !depots || depots.length === 0) {
      return { success: false, error: 'All parameters including depots are required for sequential depot download' };
    }

    let completedDepots = 0;
    const totalDepots = depots.length;

    // Send initial progress
    try {
      event?.sender?.send('depotdownloader-progress', {
        type: 'info',
        message: `Starting sequential download of ${totalDepots} depots...`
      });
    } catch {}

    // Download each depot sequentially
    for (let i = 0; i < depots.length; i++) {
      const depot = depots[i];
      const depotNumber = i + 1;

      try {
        // Send depot start progress
        try {
          event?.sender?.send('depotdownloader-progress', {
            type: 'info',
            message: `Downloading depot ${depotNumber}/${totalDepots}: ${depot.depotId} (manifest: ${depot.manifestId})`
          });
        } catch {}

        console.log(`Downloading depot ${depotNumber}/${totalDepots}: ${depot.depotId}`);

        // Download this specific depot
        const result = await handleDownloadBranch(event, depotDownloaderPath, username, password, branchPath, appId, branchId, buildId, [depot]);

        if (!result.success) {
          console.error(`Failed to download depot ${depot.depotId}:`, result.error);
          return {
            success: false,
            error: `Failed to download depot ${depot.depotId}: ${result.error}`,
            completedDepots
          };
        }

        completedDepots++;

        // Send depot completion progress
        try {
          event?.sender?.send('depotdownloader-progress', {
            type: 'info',
            message: `Completed depot ${depotNumber}/${totalDepots}: ${depot.depotId}`
          });
        } catch {}

        console.log(`Successfully downloaded depot ${depotNumber}/${totalDepots}: ${depot.depotId}`);

      } catch (error) {
        console.error(`Error downloading depot ${depot.depotId}:`, error);
        return {
          success: false,
          error: `Error downloading depot ${depot.depotId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          completedDepots
        };
      }
    }

    // Send final completion progress
    try {
      event?.sender?.send('depotdownloader-progress', {
        type: 'info',
        message: `Successfully downloaded all ${completedDepots} depots`
      });
    } catch {}

    console.log(`Successfully completed sequential download of ${completedDepots} depots`);
    return { success: true, completedDepots };

  } catch (error) {
    console.error('Error during sequential depot download:', error);
    return {
      success: false,
      error: `Sequential download error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      completedDepots: 0
    };
  }
}

/**
 * Validates a manifest ID by attempting to get depot information
 * This is a lightweight check to verify the manifest exists before adding to the list
 *
 * @param event IPC event object
 * @param depotDownloaderPath Path to DepotDownloader installation
 * @param username Steam username
 * @param password Steam password
 * @param manifestId Manifest ID to validate
 * @param appId Steam App ID
 * @param depotId Steam Depot ID
 * @param branchName Steam branch name (e.g., 'alternate-beta')
 * @returns Promise<{success: boolean, error?: string, manifestInfo?: any}> Validation result
 */
async function handleValidateManifest(event: any, depotDownloaderPath: string | undefined, username: string, password: string, manifestId: string, appId: string, depotId: string, branchName: string): Promise<{success: boolean, error?: string, manifestInfo?: any}> {
  try {
    console.log(`Validating manifest ${manifestId} for app ${appId}, depot ${depotId}`);

    // Find DepotDownloader executable
    const depotDownloaderExe = await findDepotDownloaderExecutable(depotDownloaderPath);
    if (!depotDownloaderExe) {
      return {
        success: false,
        error: 'DepotDownloader not found. Please ensure DepotDownloader is installed and accessible.'
      };
    }

    // Use DepotDownloader to get depot information (this will validate the manifest)
    const args = [
      '-app', appId,
      '-depot', depotId,
      '-manifest', manifestId,
      '-beta', branchName,
      '-username', username,
      '-password', password,
      '-dir', path.join(os.tmpdir(), 'depotdownloader_validation'),
      '-manifest-only',
      '-validate'
    ];

    // Mask password in log output
    const maskedArgs = args.map((arg, index) => {
      // Mask the password value (the argument after -password)
      if (index > 0 && args[index - 1] === '-password') {
        return '***';
      }
      return arg;
    });
    console.log(`Running DepotDownloader validation: ${depotDownloaderExe} ${maskedArgs.join(' ')}`);

    return new Promise((resolve) => {
      const proc = spawn(depotDownloaderExe, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(depotDownloaderExe)
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        console.log(`DepotDownloader validation exited with code ${code}`);
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);

        // Check if validation was successful
        if (code === 0 || stdout.includes('Depot download complete') || stdout.includes('Manifest found')) {
          resolve({
            success: true,
            manifestInfo: {
              manifestId,
              appId,
              depotId,
              validatedAt: new Date().toISOString()
            }
          });
        } else {
          // Parse error message for better user feedback
          let errorMessage = 'Manifest validation failed';
          if (stderr.includes('401') || stderr.includes('Unauthorized')) {
            errorMessage = 'Access denied. This manifest may be private or require different credentials.';
          } else if (stderr.includes('404') || stderr.includes('Not Found')) {
            errorMessage = 'Manifest not found. Please check the manifest ID.';
          } else if (stderr.includes('Invalid manifest')) {
            errorMessage = 'Invalid manifest ID format.';
          } else if (stderr.includes('Login failed')) {
            errorMessage = 'Steam login failed. Please check your credentials.';
          } else if (stderr) {
            errorMessage = `Validation error: ${stderr.trim()}`;
          }

          resolve({
            success: false,
            error: errorMessage
          });
        }
      });

      proc.on('error', (error) => {
        console.error('Error running DepotDownloader validation:', error);
        resolve({
          success: false,
          error: `Failed to run DepotDownloader: ${error.message}`
        });
      });

      // Set a timeout for validation
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill();
          resolve({
            success: false,
            error: 'Manifest validation timed out. The manifest may be invalid or inaccessible.'
          });
        }
      }, 30000); // 30 second timeout
    });

  } catch (error) {
    console.error('Error validating manifest:', error);
    return {
      success: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Downloads manifests for multiple branches using -manifest-only
 * @param event IPC event
 * @param depotDownloaderPath Path to DepotDownloader executable
 * @param username Steam username
 * @param password Steam password
 * @param branches Array of branch names to download manifests for
 * @param appId Steam App ID
 * @param managedEnvironmentPath Path to managed environment
 * @returns Promise with manifest information for each branch
 */
async function handleDownloadManifests(
  event: Electron.IpcMainInvokeEvent,
  depotDownloaderPath: string | undefined,
  username: string,
  password: string,
  branches: string[],
  appId: string,
  managedEnvironmentPath: string
): Promise<{ success: boolean; manifests?: Record<string, { manifestId: string; buildId: string }>; error?: string }> {
  try {
    console.log(`Downloading manifests for branches: ${branches.join(', ')}`);

    // Find DepotDownloader executable
    const resolved = await findDepotDownloaderExecutable(depotDownloaderPath);
    if (!resolved) {
      return {
        success: false,
        error: 'DepotDownloader not found. Please check the installation path.'
      };
    }

    const manifests: Record<string, { manifestId: string; buildId: string }> = {};

    // Map branch names to Steam branch IDs
    const branchIdMap: Record<string, string> = {
      'main-branch': 'public',
      'beta-branch': 'beta',
      'alternate-branch': 'alternate',
      'alternate-beta-branch': 'alternate-beta'
    };

    // Download manifest for each branch
    for (const branch of branches) {
      const branchId = branchIdMap[branch];
      if (!branchId) {
        console.warn(`Unknown branch ID for ${branch}, skipping`);
        continue;
      }

      console.log(`Downloading manifest for branch: ${branch} (${branchId})`);

      // Create temporary directory for this branch's manifest
      const tempDir = path.join(os.tmpdir(), `depotdownloader_manifest_${branch}_${Date.now()}`);
      await fs.ensureDir(tempDir);

      try {
        // Use -beta for beta branches, no flag for public branch
        const isPublicBranch = branch === 'main-branch';
        const args = [
          '-app', appId,
          '-depot', '3164501', // Schedule I depot ID
          '-username', username,
          '-password', password,
          ...(isPublicBranch ? [] : ['-beta', branchId]), // No branch flag for public, -beta for others
          '-dir', tempDir,
          '-manifest-only' // Only download manifest, not full game
        ];

        // Mask password in log output
        const maskedArgs = args.map((arg, index) => {
          // Mask the password value (the argument after -password)
          if (index > 0 && args[index - 1] === '-password') {
            return '***';
          }
          return arg;
        });
        console.log(`Running DepotDownloader manifest download: ${resolved} ${maskedArgs.join(' ')}`);

        const result = await new Promise<{ success: boolean; manifestId?: string; buildId?: string; error?: string }>((resolve) => {
          const proc = spawn(resolved, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.dirname(resolved)
          });

          let stdout = '';
          let stderr = '';

          proc.stdout?.on('data', (data) => {
            stdout += data.toString();
          });

          proc.stderr?.on('data', (data) => {
            stderr += data.toString();
          });

          proc.on('close', (code) => {
            if (code === 0) {
              // Extract manifest ID from DepotDownloader output
              // Look for: "Got manifest request code for depot 3164501 from app 3164500, manifest 941591400057088607, result: 12570078310817550920"
              const manifestMatch = stdout.match(/Got manifest request code for depot \d+ from app \d+, manifest (\d+), result: \d+/);
              
              if (manifestMatch) {
                const manifestId = manifestMatch[1];
                
                // Try to extract build ID from the manifest line if available
                // Look for: "Manifest 941591400057088607 (08/27/2025 01:43:39)"
                const buildIdMatch = stdout.match(/Manifest \d+ \((\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})\)/);
                let buildId = '';
                if (buildIdMatch) {
                  // Convert date to build ID format if needed
                  buildId = buildIdMatch[1];
                }

                resolve({
                  success: true,
                  manifestId,
                  buildId
                });
              } else {
                resolve({
                  success: false,
                  error: 'Could not extract manifest ID from DepotDownloader output'
                });
              }
            } else {
              resolve({
                success: false,
                error: `DepotDownloader failed with code ${code}: ${stderr}`
              });
            }
          });

          proc.on('error', (error) => {
            resolve({
              success: false,
              error: `Failed to run DepotDownloader: ${error.message}`
            });
          });

          // Set timeout
          setTimeout(() => {
            if (!proc.killed) {
              proc.kill();
              resolve({
                success: false,
                error: 'Manifest download timed out'
              });
            }
          }, 60000); // 60 second timeout
        });

        if (result.success && result.manifestId) {
          manifests[branch] = {
            manifestId: result.manifestId,
            buildId: result.buildId || ''
          };
          console.log(`Successfully downloaded manifest for ${branch}: ${result.manifestId}`);
        } else {
          console.error(`Failed to download manifest for ${branch}: ${result.error}`);
        }

      } finally {
        // Clean up temporary directory
        try {
          await fs.remove(tempDir);
        } catch (error) {
          console.warn(`Failed to clean up temp directory ${tempDir}:`, error);
        }
      }
    }

    console.log('handleDownloadManifests - returning manifests:', manifests);
    console.log('handleDownloadManifests - manifests keys:', Object.keys(manifests));
    
    return {
      success: true,
      manifests
    };

  } catch (error) {
    console.error('Error downloading manifests:', error);
    return {
      success: false,
      error: `Failed to download manifests: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
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

  // Download specific branch version (new multi-version support)
  ipcMain.handle('depotdownloader:download-branch-version', handleDownloadBranchVersion);

  // Download branch with specific depot and manifest information
  ipcMain.handle('depotdownloader:download-branch-with-manifests', handleDownloadBranchWithManifests);

  // Download multiple depots sequentially for a specific build
  ipcMain.handle('depotdownloader:download-branch-sequential-depots', handleDownloadBranchSequentialDepots);

  // Migrate legacy branch structure
  ipcMain.handle('depotdownloader:migrate-legacy-branch', handleMigrateLegacyBranch);

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

  // Download with specific manifest ID using -app -depot -manifest format
  ipcMain.handle('depotdownloader:download-with-manifest', async (event, depotDownloaderPath: string | undefined, username: string, password: string, branchName: string, manifestId: string, appId: string, depotId: string, managedEnvironmentPath: string) => {
    return await handleDownloadWithManifest(event, depotDownloaderPath, username, password, branchName, manifestId, appId, depotId, managedEnvironmentPath);
  });

  // Download branch version using manifest ID
  ipcMain.handle('depotdownloader:download-branch-version-by-manifest', async (event, depotDownloaderPath: string | undefined, username: string, password: string, branchName: string, manifestId: string, appId: string, managedEnvironmentPath: string) => {
    return await handleDownloadBranchVersionByManifest(event, depotDownloaderPath, username, password, branchName, manifestId, appId, managedEnvironmentPath);
  });

  // Validate manifest ID before adding to list
  ipcMain.handle('depotdownloader:validate-manifest', async (event, depotDownloaderPath: string | undefined, username: string, password: string, manifestId: string, appId: string = '3164500', depotId: string = '3164501', branchName: string = 'alternate-beta') => {
    return await handleValidateManifest(event, depotDownloaderPath, username, password, manifestId, appId, depotId, branchName);
  });

  // Get DepotDownloader path from config
  ipcMain.handle('depotdownloader:get-path', async () => {
    try {
      const config = await configService.getConfig();
      return { success: true, path: config.depotDownloaderPath || null };
    } catch (error) {
      console.error('Error getting DepotDownloader path:', error);
      return { success: false, error: 'Failed to get DepotDownloader path' };
    }
  });

  // Download manifests for multiple branches
  ipcMain.handle('depotdownloader:download-manifests', async (event, depotDownloaderPath: string | undefined, username: string, password: string, branches: string[], appId: string, managedEnvironmentPath: string) => {
    return await handleDownloadManifests(event, depotDownloaderPath, username, password, branches, appId, managedEnvironmentPath);
  });

  console.log('DepotDownloader IPC handlers registered successfully');
}
