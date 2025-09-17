import fs from 'fs';
import http from 'http';
import path from 'path';
import url from 'url';
import { execSync } from 'child_process';
import { expect, test } from '@playwright/test';

const projectRoot = path.resolve(__dirname, '../../');
const distDir = path.join(projectRoot, 'dist/renderer');
let isBuilt = false;
let server: http.Server | undefined;
let baseUrl: string | undefined;

const contentTypeByExt: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const startServer = async () => {
  if (server) {
    return;
  }

  server = http.createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end('Bad Request');
      return;
    }

    const parsed = url.parse(req.url);
    const pathname = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '/index.html';
    const filePath = path.join(distDir, pathname);

    if (!filePath.startsWith(distDir)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = contentTypeByExt[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.end(data);
    });
  });

  await new Promise<void>((resolve) => {
    server!.listen(0, () => {
      const address = server!.address();
      if (address && typeof address === 'object') {
        baseUrl = `http://127.0.0.1:${address.port}`;
      }
      resolve();
    });
  });
};

const stopServer = async () => {
  if (!server) return;
  await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = undefined;
  baseUrl = undefined;
};

test.beforeAll(async () => {
  if (!isBuilt) {
    execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
    isBuilt = true;
  }
  await startServer();
});

test.afterAll(async () => {
  await stopServer();
});

const defaultConfig = {
  steamLibraryPath: '',
  gameInstallPath: '',
  managedEnvironmentPath: '',
  selectedBranches: [],
  installedBranch: null,
  branchBuildIds: {},
  branchVersions: {},
  branchManifestVersions: {},
  userAddedVersions: {},
  activeBuildPerBranch: {},
  activeManifestPerBranch: {},
  maxRecentBuilds: 10,
  customLaunchCommands: {},
  lastUpdated: new Date().toISOString(),
  configVersion: '4.0',
  useDepotDownloader: undefined,
  depotDownloaderPath: undefined,
  autoInstallMelonLoader: true,
  autoInstallPromptShown: false,
  logRetentionCount: 50,
  diskSpaceThresholdGB: 10,
  skipSteamCMD: false,
  credentials: null,
};

test.beforeEach(async ({ page }) => {
  if (!baseUrl) {
    throw new Error('Static server not started');
  }

  page.on('console', (msg) => {
    console.log(`console:${msg.type()}: ${msg.text()}`);
  });

  await page.addInitScript((config) => {
    const state = {
      config: { ...config },
      exists: false,
    };

    const makeResolve = (value: any) => async () => value;

    window.electronAPI = {
      config: {
        get: async () => state.config,
        update: async (updates: Record<string, unknown>) => {
          Object.assign(state.config, updates);
          state.exists = true;
          return state.config;
        },
        validate: async () => ({
          isValid: false,
          errors: ['Configuration incomplete'],
          warnings: [],
        }),
        exists: async () => state.exists,
        loadFromFile: async () => state.config,
        saveToFile: async () => true,
        getManagedPath: async () => state.config.managedEnvironmentPath,
        setManagedPath: async (value: string) => {
          state.config.managedEnvironmentPath = value;
          return value;
        },
        setBuildIdForBranch: async () => undefined,
        getBuildIdForBranch: async () => null,
        saveDepotDownloaderConfig: async ({ useDepotDownloader, depotDownloaderPath }: { useDepotDownloader: boolean; depotDownloaderPath: string | null }) => {
          state.config.useDepotDownloader = useDepotDownloader;
          state.config.depotDownloaderPath = depotDownloaderPath;
          return { success: true };
        },
        setAutoInstallPromptShown: async (value: boolean) => {
          state.config.autoInstallPromptShown = value;
          return value;
        },
      },
      migration: {
        detectLegacyInstallations: async () => ({ success: true, installations: [] }),
      },
      steamcmd: {
        validateInstallation: async () => ({ success: true }),
        login: async () => ({ success: true }),
      },
      depotdownloader: {
        cancel: async () => ({ success: true }),
      },
      onSteamCMDProgress: () => {},
      removeSteamCMDProgressListener: () => {},
      steam: {
        detectLibraries: makeResolve([]),
        getLibraries: makeResolve([]),
        getScheduleIAppId: makeResolve('3164500'),
        findScheduleILibrary: async () => null,
      },
      window: {
        isMaximized: async () => true,
        maximize: async () => {},
      },
      update: {
        getCurrentVersion: async () => 'test-version',
        checkForUpdates: async () => ({ hasUpdate: false }),
      },
    } as any;
  }, defaultConfig);

  await page.goto(`${baseUrl}/index.html`);
  await page.waitForLoadState('networkidle');
});

test.describe('Application bootstrap (browser harness)', () => {
  test('renders SteamCMD setup screen on first load', async ({ page }) => {
    await expect(page.locator('text=SteamCMD Integration')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip SteamCMD' })).toBeVisible();
  });

  test('allows skipping SteamCMD and shows setup wizard', async ({ page }) => {
    await page.getByRole('button', { name: 'Skip SteamCMD' }).click();

    await expect(page.getByRole('heading', { name: 'Select Steam Library', level: 2 })).toBeVisible({ timeout: 15_000 });
  });
});




