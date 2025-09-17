import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

type ConsoleSpies = {
  warn: ReturnType<typeof vi.spyOn>;
  log: ReturnType<typeof vi.spyOn>;
  error: ReturnType<typeof vi.spyOn>;
};

const fsExtraMock = vi.hoisted(() => ({
  ensureDirSync: vi.fn(),
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  copyFileSync: vi.fn(),
}));

const storeMock = vi.hoisted(() => ({
  ctor: vi.fn().mockImplementation(() => ({
    store: {},
    set: vi.fn(),
    get: vi.fn(),
  })),
}));

vi.mock('fs-extra', () => fsExtraMock);
vi.mock('electron-store', () => ({
  default: storeMock.ctor,
}));

import { ConfigService } from '../../src/main/services/ConfigService';

const VALID_CONFIG_FIXTURE = JSON.stringify({
  steamLibraryPath: 'C:/Steam',
  gameInstallPath: 'C:/Games/ScheduleI',
  managedEnvironmentPath: 'C:/Managed/ScheduleI',
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
  lastUpdated: '2024-01-01T00:00:00.000Z',
  configVersion: '4.0',
  useDepotDownloader: false,
  depotDownloaderPath: null,
  autoInstallMelonLoader: true,
  autoInstallPromptShown: false,
  logRetentionCount: 50,
  diskSpaceThresholdGB: 10,
}, null, 2);

const resetFsMocks = () => {
  fsExtraMock.ensureDirSync.mockReset();
  fsExtraMock.existsSync.mockReset();
  fsExtraMock.readFileSync.mockReset();
  fsExtraMock.writeFileSync.mockReset();
  fsExtraMock.copyFileSync.mockReset();
};

describe('ConfigService', () => {
  let consoleSpies: ConsoleSpies;

  beforeEach(() => {
    vi.clearAllMocks();
    resetFsMocks();
    storeMock.ctor.mockClear();
    consoleSpies = {
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    consoleSpies.warn.mockRestore();
    consoleSpies.log.mockRestore();
    consoleSpies.error.mockRestore();
  });

  test('writes defaults when config file missing', () => {
    fsExtraMock.existsSync.mockReturnValue(false);

    new ConfigService();

    expect(fsExtraMock.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('config.json'),
      expect.stringContaining('"configVersion": "4.0"'),
    );
  });

  test('backs up and rewrites when config file invalid', () => {
    fsExtraMock.existsSync.mockReturnValue(true);
    fsExtraMock.readFileSync
      .mockImplementationOnce(() => 'not json')
      .mockImplementationOnce(() => VALID_CONFIG_FIXTURE);

    new ConfigService();

    expect(fsExtraMock.copyFileSync).toHaveBeenCalled();
    expect(fsExtraMock.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('config.json'),
      expect.stringContaining('"configVersion": "4.0"'),
    );
    expect(storeMock.ctor).toHaveBeenCalled();
  });
});
