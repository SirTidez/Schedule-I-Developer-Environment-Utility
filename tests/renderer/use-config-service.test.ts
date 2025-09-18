import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { setElectronNamespace } from '../setup/globals';
import { useConfigService } from '../../src/renderer/hooks/useConfigService';

// Representative config snapshot used to validate happy-path reads.
const sampleConfig = {
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
  lastUpdated: new Date().toISOString(),
  configVersion: '4.0',
  useDepotDownloader: false,
  depotDownloaderPath: null,
  autoInstallMelonLoader: true,
  autoInstallPromptShown: false,
  logRetentionCount: 50,
  diskSpaceThresholdGB: 10,
};

let cleanup: (() => void) | undefined;

describe('useConfigService', () => {
  beforeEach(() => {
    cleanup?.();
    cleanup = setElectronNamespace('config', {
      get: vi.fn().mockResolvedValue(sampleConfig),
      update: vi.fn().mockResolvedValue(sampleConfig),
      getManagedPath: vi.fn().mockResolvedValue(sampleConfig.managedEnvironmentPath),
      setManagedPath: vi.fn().mockResolvedValue(sampleConfig.managedEnvironmentPath),
      setBuildIdForBranch: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  // Hook should eagerly load persisted config and expose it to consumers.
  test('loads configuration on mount', async () => {
    const { result } = renderHook(() => useConfigService());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.config?.managedEnvironmentPath).toBe(sampleConfig.managedEnvironmentPath);
    expect((window as any).electronAPI.config.get).toHaveBeenCalledTimes(1);
  });
});
