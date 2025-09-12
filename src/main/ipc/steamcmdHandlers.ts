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
import { spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SteamProcessService } from '../services/SteamProcessService';
import { CredentialService } from '../services/CredentialService';

const steamProcessService = new SteamProcessService();
const credentialService = new CredentialService();

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
      // Quote the path to handle spaces correctly
      const quotedPath = `"${steamcmdExe}"`;
      const steamcmd = spawn(quotedPath, ['+quit'], {
        shell: true,
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
      // Quote the path to handle spaces correctly
      const quotedPath = `"${steamcmdExe}"`;
      const steamcmd = spawn(quotedPath, ['+login', username, password, '+quit'], {
        shell: true,
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
    
    // Check if Steam is running
    const steamProcess = await steamProcessService.detectSteamProcess();
    if (steamProcess.isRunning) {
      return { 
        success: false, 
        error: 'Steam is currently running. Please close Steam before downloading.' 
      };
    }

    if (!steamCMDPath || !username || !password || !branchPath || !appId || !branchId) {
      return { success: false, error: 'All parameters are required for branch download' };
    }

    // Ensure branch directory exists
    await fs.ensureDir(branchPath);

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

    // Download branch
    return new Promise((resolve) => {
      // Quote the path to handle spaces correctly
      const quotedPath = `"${steamcmdExe}"`;
      const steamcmd = spawn(quotedPath, [
        '+force_install_dir', branchPath,
        '+login', username, password,
        '+app_update', appId, '-beta', branchId,
        '+quit'
      ], {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      steamcmd.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.log('SteamCMD output:', dataStr);
        
        // Send progress updates to renderer
        event.sender.send('steamcmd-progress', {
          type: 'output',
          data: dataStr
        });
      });

      steamcmd.stderr.on('data', (data) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        console.log('SteamCMD error output:', dataStr);
        
        // Send progress updates to renderer
        event.sender.send('steamcmd-progress', {
          type: 'error',
          data: dataStr
        });
      });

      steamcmd.on('close', (code) => {
        const fullOutput = output + errorOutput;
        console.log('SteamCMD download completed with code:', code);

        if (code === 0) {
          console.log('Branch download successful');
          resolve({ success: true });
        } else {
          console.log('Branch download failed');
          resolve({ 
            success: false, 
            error: `Download failed: ${fullOutput || 'Unknown error'}` 
          });
        }
      });

      steamcmd.on('error', (error) => {
        console.error('SteamCMD download error:', error);
        resolve({ 
          success: false, 
          error: `Failed to execute SteamCMD: ${error.message}` 
        });
      });

      // Set a longer timeout for downloads
      setTimeout(() => {
        steamcmd.kill();
        resolve({ 
          success: false, 
          error: 'Branch download timed out' 
        });
      }, 300000); // 5 minute timeout
    });

  } catch (error) {
    console.error('Error during branch download:', error);
    return { 
      success: false, 
      error: `Download error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
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

  console.log('SteamCMD IPC handlers registered successfully');
}
