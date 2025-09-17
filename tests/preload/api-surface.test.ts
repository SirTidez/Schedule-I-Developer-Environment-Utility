import { beforeEach, describe, expect, test, vi } from 'vitest';

const exposeInMainWorld = vi.fn();
const invoke = vi.fn();
const on = vi.fn();
const removeListener = vi.fn();

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld,
  },
  ipcRenderer: {
    invoke,
    on,
    removeListener,
  },
}));

describe('preload electronAPI surface', () => {
  beforeEach(() => {
    vi.resetModules();
    exposeInMainWorld.mockClear();
    invoke.mockClear();
  });

  test('registers electronAPI namespaces', async () => {
    await import('../../src/preload/index');

    expect(exposeInMainWorld).toHaveBeenCalledWith(
      'electronAPI',
      expect.objectContaining({
        steam: expect.any(Object),
        config: expect.any(Object),
        depotdownloader: expect.any(Object),
      }),
    );

    const api = exposeInMainWorld.mock.calls[0][1];
    await api.steam.detectLibraries();
    expect(invoke).toHaveBeenCalledWith('steam:detect-libraries');
  });
});
