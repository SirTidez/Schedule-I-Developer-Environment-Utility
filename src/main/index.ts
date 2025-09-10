import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { setupSteamHandlers } from './ipc/steamHandlers';
import { setupConfigHandlers } from './ipc/configHandlers';
import { setupFileHandlers } from './ipc/fileHandlers';
import { setupDialogHandlers } from './ipc/dialogHandlers';
import { registerUpdateHandlers } from './ipc/updateHandlers';
import { registerShellHandlers } from './ipc/shellHandlers';
import { registerWindowHandlers } from './ipc/windowHandlers';
import { ConfigService } from './services/ConfigService';
import { LoggingService } from './services/LoggingService';
import { UpdateService } from './services/UpdateService';

const isDev = process.env.NODE_ENV === 'development';

// Initialize services
const configService = new ConfigService();
const loggingService = new LoggingService(configService);
const updateService = new UpdateService(loggingService, configService.getConfigDir());

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

function createWindow(): void {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Hide the default window frame
    titleBarStyle: 'hidden', // Hide the title bar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    title: `Schedule I Developer Environment v${app.getVersion()}`,
    show: false,
  });

  // Start the window maximized
  mainWindow.maximize();

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    // Dereference the window object
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Setup IPC handlers
  setupSteamHandlers();
  setupConfigHandlers();
  setupFileHandlers();
  setupDialogHandlers();
  registerUpdateHandlers(updateService, loggingService);
  registerShellHandlers(loggingService);
  registerWindowHandlers(loggingService);

  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});
