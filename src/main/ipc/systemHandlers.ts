import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';

function getDriveFromPath(p: string): string | null {
  try {
    const root = path.parse(p).root; // e.g., 'C:\\'
    if (!root) return null;
    const m = root.match(/^[A-Za-z]:\\\\?$/) || root.match(/^[A-Za-z]:\\?$/);
    if (m) return root.slice(0, 2); // 'C:'
    return null;
  } catch {
    return null;
  }
}

export function setupSystemHandlers() {
  ipcMain.handle('system:get-free-space', async (event, targetPath: string) => {
    try {
      const drive = getDriveFromPath(targetPath);
      if (!drive) {
        return { success: false, error: 'Unable to determine drive from path' };
      }

      // Use WMIC to query free/total bytes for the drive (Windows only)
      const cmd = 'wmic';
      const args = [
        'logicaldisk', 'where', `DeviceID='${drive}'`, 'get', 'FreeSpace,Size', '/value'
      ];

      return await new Promise((resolve) => {
        const child = spawn(cmd, args, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        let err = '';
        child.stdout.on('data', (d) => { out += d.toString(); });
        child.stderr.on('data', (d) => { err += d.toString(); });
        child.on('close', () => {
          const freeMatch = out.match(/FreeSpace=(\d+)/i);
          const sizeMatch = out.match(/Size=(\d+)/i);
          if (freeMatch && sizeMatch) {
            const freeBytes = Number(freeMatch[1]);
            const totalBytes = Number(sizeMatch[1]);
            resolve({ success: true, freeBytes, totalBytes, drive });
          } else {
            resolve({ success: false, error: err || 'Failed to parse disk info' });
          }
        });
        child.on('error', (e) => resolve({ success: false, error: e.message }));
      });
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  });
}

