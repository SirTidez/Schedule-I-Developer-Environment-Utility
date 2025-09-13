import { ipcMain } from 'electron';

let cachedSteamCredentials: { username: string; password: string } | null = null;

export function setupCredentialCacheHandlers(): void {
  ipcMain.handle('cred-cache:set', async (_event, creds: { username: string; password: string }) => {
    try {
      cachedSteamCredentials = { username: String(creds.username || ''), password: String(creds.password || '') };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('cred-cache:get', async () => {
    return { success: true, credentials: cachedSteamCredentials };
  });

  ipcMain.handle('cred-cache:clear', async () => {
    cachedSteamCredentials = null;
    return { success: true };
  });
}

export function getCachedSteamCredentials(): { username: string; password: string } | null {
  return cachedSteamCredentials;
}

