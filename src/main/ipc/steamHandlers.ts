/**
 * Steam IPC Handlers for Schedule I Developer Environment Utility
 * 
 * Provides IPC communication handlers for all Steam-related operations.
 * These handlers bridge the gap between the renderer process and the
 * SteamService in the main process, enabling secure communication.
 * 
 * Handled operations:
 * - Steam library detection
 * - App manifest parsing
 * - Branch detection and verification
 * - Build ID management
 * - Game library management
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import { ipcMain } from 'electron';
import { SteamService } from '../services/SteamService';

/** Steam service instance for handling Steam operations */
const steamService = new SteamService();

/**
 * Sets up all Steam-related IPC handlers
 * 
 * Registers handlers for Steam library detection, app manifest parsing,
 * branch management, and other Steam-related operations. All handlers
 * include proper error handling and logging.
 */
export function setupSteamHandlers() {
  ipcMain.handle('steam:detect-libraries', async () => {
    try {
      return await steamService.detectSteamLibraries();
    } catch (error) {
      console.error('Error detecting Steam libraries:', error);
      throw error;
    }
  });
  
  ipcMain.handle('steam:parse-manifest', async (event, appId: string, libraryPath: string) => {
    try {
      return await steamService.parseAppManifest(appId, libraryPath);
    } catch (error) {
      console.error('Error parsing app manifest:', error);
      throw error;
    }
  });
  
  ipcMain.handle('steam:get-libraries', async () => {
    try {
      return await steamService.getSteamLibraries();
    } catch (error) {
      console.error('Error getting Steam libraries:', error);
      throw error;
    }
  });
  
  ipcMain.handle('steam:get-schedule-i-app-id', async () => {
    try {
      return steamService.getScheduleIAppId();
    } catch (error) {
      console.error('Error getting Schedule I app ID:', error);
      throw error;
    }
  });
  
  ipcMain.handle('steam:detect-installed-branch', async (event, libraryPath: string) => {
    try {
      return await steamService.detectInstalledBranch(libraryPath);
    } catch (error) {
      console.error('Error detecting installed branch:', error);
      throw error;
    }
  });
  
  ipcMain.handle('steam:find-schedule-i-library', async () => {
    try {
      return await steamService.findScheduleIInLibraries();
    } catch (error) {
      console.error('Error finding Schedule I library:', error);
      throw error;
    }
  });
  
  ipcMain.handle('steam:get-games-from-library', async (event, libraryPath: string) => {
    try {
      return await steamService.getSteamGamesFromLibrary(libraryPath);
    } catch (error) {
      console.error('Error getting games from library:', error);
      throw error;
    }
  });
  
  ipcMain.handle('steam:verify-branch-installed', async (event, libraryPath: string, expectedBranch: string) => {
    try {
      return await steamService.verifyBranchInstalled(libraryPath, expectedBranch);
    } catch (error) {
      console.error('Error verifying branch installation:', error);
      throw error;
    }
  });
  
  ipcMain.handle('steam:wait-for-branch-change', async (event, libraryPath: string, expectedBranch: string, maxWaitTime?: number) => {
    try {
      return await steamService.waitForBranchChange(libraryPath, expectedBranch, maxWaitTime);
    } catch (error) {
      console.error('Error waiting for branch change:', error);
      throw error;
    }
  });

  ipcMain.handle('steam:get-branch-build-id', async (event, libraryPath: string, branchName: string) => {
    try {
      return await steamService.getBranchBuildId(libraryPath, branchName);
    } catch (error) {
      console.error('Error getting branch build ID:', error);
      throw error;
    }
  });

  ipcMain.handle('steam:get-current-steam-build-id', async (event, libraryPath: string) => {
    try {
      return await steamService.getCurrentSteamBuildId(libraryPath);
    } catch (error) {
      console.error('Error getting current Steam build ID:', error);
      throw error;
    }
  });

  ipcMain.handle('steam:detect-current-steam-branch-key', async (event, libraryPath: string) => {
    try {
      return await steamService.detectCurrentSteamBranchKey(libraryPath);
    } catch (error) {
      console.error('Error detecting current Steam branch key:', error);
      throw error;
    }
  });
}
