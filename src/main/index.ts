/**
 * Main Electron process entry point for Schedule I Developer Environment Utility
 * 
 * This file initializes the Electron application, sets up IPC handlers for communication
 * between main and renderer processes, and manages the application lifecycle.
 * 
 * Key responsibilities:
 * - Initialize core services (Config, Logging, Update)
 * - Set up IPC communication handlers
 * - Create and manage the main application window
 * - Handle application lifecycle events
 * - Configure security settings
 */

import { app, BrowserWindow, ipcMain, nativeImage } from 'electron';
import * as path from 'path';
import { setupSteamHandlers } from './ipc/steamHandlers';
import { setupSteamBranchHandlers } from './ipc/steamBranchHandlers';
import { setupConfigHandlers } from './ipc/configHandlers';
import { setupFileHandlers } from './ipc/fileHandlers';
import { setupDialogHandlers } from './ipc/dialogHandlers';
import { setupDepotDownloaderHandlers } from './ipc/depotdownloaderHandlers';
import { setupSteamLoginHandlers } from './ipc/steamLoginHandlers';
import { setupSteamUpdateHandlers } from './ipc/steamUpdateHandlers';
import { setupSystemHandlers } from './ipc/systemHandlers';
import { setupMigrationHandlers } from './ipc/migrationHandlers';
import { setupPathUtilsHandlers } from './ipc/pathUtilsHandlers';
import { registerUpdateHandlers } from './ipc/updateHandlers';
import { registerShellHandlers } from './ipc/shellHandlers';
import { registerWindowHandlers } from './ipc/windowHandlers';
import { ConfigService } from './services/ConfigService';
import { setupCredentialCacheHandlers } from './ipc/credentialCacheHandlers';
import { LoggingService } from './services/LoggingService';
import { UpdateService } from './services/UpdateService';
import { registerMelonLoaderHandlers } from './ipc/melonLoaderHandlers';
import { SteamUpdateService } from './services/SteamUpdateService';

const isDev = process.env.NODE_ENV === 'development';

// Ensure Windows taskbar displays correct app name and icon
try {
  app.setName('Schedule I Developer Environment');
  // Set AppUserModelId before creating any windows (Windows taskbar grouping & tooltip)
  app.setAppUserModelId('com.schedulei.dev-environment');
} catch {}

// Initialize core services
const configService = new ConfigService();
const loggingService = new LoggingService(configService);
const updateService = new UpdateService(loggingService, configService.getConfigDir());
const steamUpdateService = new SteamUpdateService(loggingService);

// Initialize logging
(async () => {
  await loggingService.info('Schedule I Developer Environment Utility starting...');
  await loggingService.info(`Config path: ${configService.getConfigPath()}`);
  await loggingService.info(`Logs path: ${configService.getLogsPath()}`);

  // Validate configuration on startup
  const configValidation = configService.validateConfig();
  if (configValidation.isValid) {
    await loggingService.info('Configuration validation passed');
    if (configValidation.warnings.length > 0) {
      await loggingService.warn(`Configuration warnings: ${configValidation.warnings.join(', ')}`);
    }
  } else {
    await loggingService.error(`Configuration validation failed: ${configValidation.errors.join(', ')}`);
    if (configValidation.warnings.length > 0) {
      await loggingService.warn(`Configuration warnings: ${configValidation.warnings.join(', ')}`);
    }
  }
})();

/**
 * Creates and configures the main application window
 * 
 * Sets up a frameless window with custom title bar, configures security settings,
 * and loads the appropriate content based on the environment (dev vs production).
 * 
 * Security features:
 * - Context isolation enabled
 * - Node integration disabled
 * - Preload script for secure API exposure
 * 
 * @returns void
 */
function createWindow(): void {
  // Pick best icon for platform; prefer .ico on Windows (dev server/titlebar icon)
  const icoPath = path.join(__dirname, '../../Assets/icon.ico');
  const pngPath = path.join(__dirname, '../../Assets/icon.png');
  let appIcon = nativeImage.createFromPath(process.platform === 'win32' ? icoPath : pngPath);
  if (!appIcon || appIcon.isEmpty()) {
    appIcon = nativeImage.createFromPath(pngPath);
  }
  
  // Create the browser window with custom configuration
  const versionLabel = updateService.getCurrentVersion();
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Hide the default window frame for custom title bar
    titleBarStyle: 'hidden', // Hide the title bar
    webPreferences: {
      nodeIntegration: false, // Security: disable node integration in renderer
      contextIsolation: true, // Security: enable context isolation
      preload: path.join(__dirname, '../preload/index.js'), // Secure API exposure
    },
    icon: appIcon,
    title: `Schedule I Developer Environment v${versionLabel}`,
    show: false, // Don't show until ready
  });

  // Start the window maximized for better user experience
  mainWindow.maximize();

  // Load the appropriate content based on environment
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools(); // Open dev tools in development
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  // Show window when ready to prevent flash of white content
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed event
  mainWindow.on('closed', () => {
    // Dereference the window object (optional cleanup)
  });
}

/**
 * Application initialization and lifecycle management
 * 
 * Sets up IPC handlers, creates the main window, and configures application
 * lifecycle events including platform-specific behavior for macOS.
 */

// Initialize application when Electron is ready
app.whenReady().then(() => {
  // Set the application icon for the taskbar
  const iconPath = path.join(__dirname, '../../Assets/icon.png');
  app.setAppUserModelId('com.schedulei.dev-environment');
  
  // Set the app icon for Windows taskbar
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.schedulei.dev-environment');
  }
  
  // Register all IPC handlers for communication with renderer process
  setupSteamHandlers(); // Steam library detection and management
  setupSteamBranchHandlers(steamUpdateService, configService, loggingService); // Steam branch version management
  setupConfigHandlers(); // Configuration management
  setupFileHandlers(); // File operations
  setupDialogHandlers(); // Native dialog boxes
  setupDepotDownloaderHandlers(); // DepotDownloader integration
  setupSteamLoginHandlers(); // Steam login and authentication
  setupSteamUpdateHandlers(loggingService, configService); // Steam update monitoring
  setupSystemHandlers(); // System info (disk space, etc.)
  setupMigrationHandlers(); // Version migration (build ID to manifest ID)
  setupPathUtilsHandlers(); // Path utility functions
  setupCredentialCacheHandlers(); // In-memory Steam credential cache
  registerUpdateHandlers(updateService, loggingService); // Update checking
  registerShellHandlers(loggingService); // External URL opening
  registerWindowHandlers(loggingService); // Window management
  registerMelonLoaderHandlers(loggingService); // MelonLoader download/extract

  // Create the main application window
  createWindow();

  // Handle macOS dock icon click behavior
  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked and no windows exist
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Handle application quit behavior
 * 
 * On macOS, applications typically stay running even when all windows are closed.
 * On other platforms, the application quits when all windows are closed.
 */
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Security: Prevent unauthorized window creation
 * 
 * This prevents malicious websites from creating new windows or popups
 * by denying all window creation requests from web contents.
 */
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});
