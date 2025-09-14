import { ipcMain } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { LoggingService } from '../services/LoggingService';
import extract from 'extract-zip';

const MELON_URL = 'https://github.com/LavaGang/MelonLoader/releases/latest/download/MelonLoader.x64.zip';

export function registerMelonLoaderHandlers(logging: LoggingService) {
  ipcMain.handle('melonloader:install', async (event, branchPath: string) => {
    try {
      if (!branchPath || typeof branchPath !== 'string') {
        throw new Error('Invalid branch path');
      }

      await logging.info(`Installing MelonLoader into: ${branchPath}`);

      // 1) Download the zip to the system temp directory via Node (robust TLS)
      const tmpDir = os.tmpdir();
      const tmpZip = path.join(tmpDir, `MelonLoader_${Date.now()}.zip`);
      await logging.info(`Downloading MelonLoader to temp: ${tmpZip}`);
      const res = await fetch(MELON_URL);
      if (!res.ok) {
        await logging.error(`Failed HTTP download for MelonLoader: ${res.status} ${res.statusText}`);
        return { success: false, error: `Download failed: ${res.status} ${res.statusText}` };
      }
      await fs.ensureDir(path.dirname(tmpZip));
      const ab = await res.arrayBuffer();
      await fs.writeFile(tmpZip, Buffer.from(ab));

      // 2) Extract using lightweight JS unzip (extract-zip)
      await fs.ensureDir(branchPath);
      await logging.info('Extracting MelonLoader using extract-zip...');
      await extract(tmpZip, { dir: branchPath });
      await fs.remove(tmpZip).catch(() => {});

      // Basic integrity check for expected files/folders
      const mustExist = [
        path.join(branchPath, 'MelonLoader'),
        path.join(branchPath, 'version.dll'),
      ];
      const missing: string[] = [];
      for (const p of mustExist) {
        try {
          if (!(await fs.pathExists(p))) missing.push(path.basename(p));
        } catch {
          missing.push(path.basename(p));
        }
      }
      if (missing.length > 0) {
        const msg = `MelonLoader integrity check failed: missing ${missing.join(', ')}`;
        await logging.error(msg);
        return { success: false, error: msg };
      }

      await logging.info('MelonLoader installed successfully');
      return { success: true };
    } catch (error) {
      await logging.error('MelonLoader install error', error as Error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
