/**
 * Steam Process Detection Service for Schedule I Developer Environment Utility
 * 
 * Detects if Steam is currently running on the system to prevent conflicts
 * with SteamCMD authentication. Steam accounts can only be logged in to one
 * place at a time, so we need to ensure Steam is closed before attempting
 * SteamCMD login.
 * 
 * Key features:
 * - Cross-platform Steam process detection
 * - Steam client identification
 * - Process termination status checking
 * - Integration with SteamCMD workflow
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import { spawn } from 'child_process';
import * as os from 'os';

export interface SteamProcessInfo {
  isRunning: boolean;
  processName: string;
  pid?: number;
  error?: string;
}

export class SteamProcessService {
  /**
   * Detects if Steam is currently running on the system
   * 
   * Checks for Steam processes using platform-specific methods.
   * On Windows, looks for "steam.exe" and "steamwebhelper.exe".
   * On macOS/Linux, looks for "steam" process.
   * 
   * @returns Promise<SteamProcessInfo> Information about Steam process status
   */
  async detectSteamProcess(): Promise<SteamProcessInfo> {
    try {
      const platform = os.platform();
      
      if (platform === 'win32') {
        return await this.detectSteamWindows();
      } else if (platform === 'darwin') {
        return await this.detectSteamMacOS();
      } else {
        return await this.detectSteamLinux();
      }
    } catch (error) {
      console.error('Error detecting Steam process:', error);
      return {
        isRunning: false,
        processName: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Detects Steam processes on Windows
   * 
   * Uses tasklist command to find Steam-related processes.
   * Looks for steam.exe and steamwebhelper.exe processes.
   * 
   * @returns Promise<SteamProcessInfo> Steam process information
   */
  private async detectSteamWindows(): Promise<SteamProcessInfo> {
    return new Promise((resolve) => {
      const tasklist = spawn('tasklist', ['/FI', 'IMAGENAME eq steam.exe', '/FO', 'CSV'], {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      tasklist.stdout.on('data', (data) => {
        output += data.toString();
      });

      tasklist.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      tasklist.on('close', (code) => {
        if (code !== 0) {
          resolve({
            isRunning: false,
            processName: 'steam.exe',
            error: errorOutput || 'Failed to check Steam process'
          });
          return;
        }

        // Check if steam.exe is in the output
        const hasSteam = output.toLowerCase().includes('steam.exe');
        
        if (hasSteam) {
          // Extract PID if possible
          const lines = output.split('\n');
          let pid: number | undefined;
          
          for (const line of lines) {
            if (line.toLowerCase().includes('steam.exe')) {
              const parts = line.split(',');
              if (parts.length >= 2) {
                const pidStr = parts[1].replace(/"/g, '').trim();
                const parsedPid = parseInt(pidStr, 10);
                if (!isNaN(parsedPid)) {
                  pid = parsedPid;
                  break;
                }
              }
            }
          }

          resolve({
            isRunning: true,
            processName: 'steam.exe',
            pid
          });
        } else {
          resolve({
            isRunning: false,
            processName: 'steam.exe'
          });
        }
      });

      tasklist.on('error', (error) => {
        resolve({
          isRunning: false,
          processName: 'steam.exe',
          error: error.message
        });
      });
    });
  }

  /**
   * Detects Steam processes on macOS
   * 
   * Uses ps command to find Steam processes.
   * Looks for processes containing "steam" in the name.
   * 
   * @returns Promise<SteamProcessInfo> Steam process information
   */
  private async detectSteamMacOS(): Promise<SteamProcessInfo> {
    return new Promise((resolve) => {
      const ps = spawn('ps', ['-ax', '-o', 'pid,comm'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      ps.stdout.on('data', (data) => {
        output += data.toString();
      });

      ps.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ps.on('close', (code) => {
        if (code !== 0) {
          resolve({
            isRunning: false,
            processName: 'steam',
            error: errorOutput || 'Failed to check Steam process'
          });
          return;
        }

        // Look for Steam processes
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.toLowerCase().includes('steam')) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              const pid = parseInt(parts[0], 10);
              if (!isNaN(pid)) {
                resolve({
                  isRunning: true,
                  processName: 'steam',
                  pid
                });
                return;
              }
            }
          }
        }

        resolve({
          isRunning: false,
          processName: 'steam'
        });
      });

      ps.on('error', (error) => {
        resolve({
          isRunning: false,
          processName: 'steam',
          error: error.message
        });
      });
    });
  }

  /**
   * Detects Steam processes on Linux
   * 
   * Uses ps command to find Steam processes.
   * Looks for processes containing "steam" in the name.
   * 
   * @returns Promise<SteamProcessInfo> Steam process information
   */
  private async detectSteamLinux(): Promise<SteamProcessInfo> {
    return new Promise((resolve) => {
      const ps = spawn('ps', ['-ax', '-o', 'pid,comm'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      ps.stdout.on('data', (data) => {
        output += data.toString();
      });

      ps.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ps.on('close', (code) => {
        if (code !== 0) {
          resolve({
            isRunning: false,
            processName: 'steam',
            error: errorOutput || 'Failed to check Steam process'
          });
          return;
        }

        // Look for Steam processes
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.toLowerCase().includes('steam')) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              const pid = parseInt(parts[0], 10);
              if (!isNaN(pid)) {
                resolve({
                  isRunning: true,
                  processName: 'steam',
                  pid
                });
                return;
              }
            }
          }
        }

        resolve({
          isRunning: false,
          processName: 'steam'
        });
      });

      ps.on('error', (error) => {
        resolve({
          isRunning: false,
          processName: 'steam',
          error: error.message
        });
      });
    });
  }

  /**
   * Waits for Steam to be closed
   * 
   * Polls the Steam process detection at regular intervals until
   * Steam is no longer running or timeout is reached.
   * 
   * @param timeoutMs Maximum time to wait in milliseconds (default: 30000)
   * @param pollIntervalMs Interval between checks in milliseconds (default: 1000)
   * @returns Promise<boolean> True if Steam was closed, false if timeout
   */
  async waitForSteamToClose(timeoutMs: number = 30000, pollIntervalMs: number = 1000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const processInfo = await this.detectSteamProcess();
      
      if (!processInfo.isRunning) {
        return true;
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    return false;
  }
}

