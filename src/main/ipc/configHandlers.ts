import { ipcMain } from 'electron';
import { ConfigService } from '../services/ConfigService';

const configService = new ConfigService();

export function setupConfigHandlers() {
  ipcMain.handle('config:get', async () => {
    try {
      return configService.getConfig();
    } catch (error) {
      console.error('Error getting config:', error);
      throw error;
    }
  });
  
  ipcMain.handle('config:update', async (event, updates) => {
    try {
      configService.updateConfig(updates);
      return configService.getConfig();
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  });
  
  ipcMain.handle('config:get-managed-path', async () => {
    try {
      return configService.getManagedEnvironmentPath();
    } catch (error) {
      console.error('Error getting managed environment path:', error);
      throw error;
    }
  });
  
  ipcMain.handle('config:set-managed-path', async (event, path: string) => {
    try {
      configService.setManagedEnvironmentPath(path);
      return configService.getManagedEnvironmentPath();
    } catch (error) {
      console.error('Error setting managed environment path:', error);
      throw error;
    }
  });

  ipcMain.handle('config:validate', async () => {
    try {
      return configService.validateConfig();
    } catch (error) {
      console.error('Error validating config:', error);
      throw error;
    }
  });

  ipcMain.handle('config:exists', async () => {
    try {
      return configService.isConfigFileExists();
    } catch (error) {
      console.error('Error checking config file existence:', error);
      throw error;
    }
  });

  ipcMain.handle('config:load-from-file', async () => {
    try {
      return configService.loadConfigFromFile();
    } catch (error) {
      console.error('Error loading config from file:', error);
      throw error;
    }
  });

  ipcMain.handle('config:save-to-file', async (event, config) => {
    try {
      return configService.saveConfigToFile(config);
    } catch (error) {
      console.error('Error saving config to file:', error);
      throw error;
    }
  });

  ipcMain.handle('config:get-game-install-path', async () => {
    try {
      return configService.getGameInstallPath();
    } catch (error) {
      console.error('Error getting game install path:', error);
      throw error;
    }
  });

  ipcMain.handle('config:set-game-install-path', async (event, path: string) => {
    try {
      configService.setGameInstallPath(path);
      return configService.getGameInstallPath();
    } catch (error) {
      console.error('Error setting game install path:', error);
      throw error;
    }
  });

  ipcMain.handle('config:set-build-id-for-branch', async (event, branchName: string, buildId: string) => {
    try {
      configService.setBuildIdForBranch(branchName, buildId);
    } catch (error) {
      console.error('Error setting build ID for branch:', error);
      throw error;
    }
  });

  ipcMain.handle('config:get-build-id-for-branch', async (event, branchName: string) => {
    try {
      return configService.getBuildIdForBranch(branchName);
    } catch (error) {
      console.error('Error getting build ID for branch:', error);
      throw error;
    }
  });

  ipcMain.handle('config:set-custom-launch-command', async (event, branchName: string, command: string) => {
    try {
      configService.setCustomLaunchCommand(branchName, command);
    } catch (error) {
      console.error('Error setting custom launch command:', error);
      throw error;
    }
  });

  ipcMain.handle('config:get-custom-launch-command', async (event, branchName: string) => {
    try {
      return configService.getCustomLaunchCommand(branchName);
    } catch (error) {
      console.error('Error getting custom launch command:', error);
      throw error;
    }
  });
}
