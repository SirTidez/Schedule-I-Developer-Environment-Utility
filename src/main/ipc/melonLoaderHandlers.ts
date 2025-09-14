import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';
import { LoggingService } from '../services/LoggingService';

const MELON_URL = 'https://github.com/LavaGang/MelonLoader/releases/latest/download/MelonLoader.x64.zip';

function runPowerShell(psCommand: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

export function registerMelonLoaderHandlers(logging: LoggingService) {
  ipcMain.handle('melonloader:install', async (event, branchPath: string) => {
    try {
      if (!branchPath || typeof branchPath !== 'string') {
        throw new Error('Invalid branch path');
      }

      // Ensure destination path is quoted for PowerShell
      const zipVar = 'MLZip_' + Date.now();
      const dest = branchPath.replace(/`/g, '``').replace(/'/g, "''");
      const ps = [
        `$tempZip = Join-Path $env:TEMP ('${zipVar}.zip')`,
        `Write-Output ('Downloading MelonLoader to ' + $tempZip)`,
        `Invoke-WebRequest -Uri '${MELON_URL}' -OutFile $tempZip -UseBasicParsing`,
        `Write-Output ('Expanding to ${dest}')`,
        `Expand-Archive -Path $tempZip -DestinationPath '${dest}' -Force`,
        `Remove-Item $tempZip -Force`
      ].join('; ');

      await logging.info(`Installing MelonLoader into: ${branchPath}`);
      const { code, stdout, stderr } = await runPowerShell(ps);
      if (code !== 0) {
        await logging.error(`MelonLoader install failed (code ${code}): ${stderr || stdout}`);
        return { success: false, error: stderr || stdout || `PowerShell exited with code ${code}` };
      }
      await logging.info('MelonLoader installed successfully');
      return { success: true };
    } catch (error) {
      await logging.error('MelonLoader install error', error as Error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}

