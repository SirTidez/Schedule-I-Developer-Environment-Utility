import React, { useEffect, useState } from 'react';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const [logRetentionCount, setLogRetentionCount] = useState<number>(50);
  const [diskSpaceThresholdGB, setDiskSpaceThresholdGB] = useState<number>(10);
  const [maxRecentBuilds, setMaxRecentBuilds] = useState<number>(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configDir, setConfigDir] = useState<string>('');
  const [logsDir, setLogsDir] = useState<string>('');
  const [autoInstallMelon, setAutoInstallMelon] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const cfg = await window.electronAPI.config.get();
        setLogRetentionCount(Number(cfg?.logRetentionCount ?? 50));
        setDiskSpaceThresholdGB(Number(cfg?.diskSpaceThresholdGB ?? 10));
        setMaxRecentBuilds(Number(cfg?.maxRecentBuilds ?? 10));
        setAutoInstallMelon(Boolean(cfg?.autoInstallMelonLoader ?? true));
        try {
          const cdir = await window.electronAPI.config.getConfigDir();
          const ldir = await window.electronAPI.config.getLogsDir();
          setConfigDir(cdir || '');
          setLogsDir(ldir || '');
        } catch {}
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await window.electronAPI.config.update({
        logRetentionCount: Math.max(1, Math.floor(logRetentionCount)),
        diskSpaceThresholdGB: Math.max(0, Math.floor(diskSpaceThresholdGB)),
        maxRecentBuilds: Math.max(1, Math.min(50, Math.floor(maxRecentBuilds))),
        autoInstallMelonLoader: !!autoInstallMelon,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Settings</h3>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded p-3 text-red-300 text-sm mb-3">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="flex items-center space-x-3 text-sm">
              <input
                type="checkbox"
                checked={autoInstallMelon}
                onChange={(e) => setAutoInstallMelon(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 rounded"
              />
              <span>Auto-install MelonLoader after branch downloads</span>
            </label>
            <p className="text-xs text-gray-400 mt-1">You can toggle this anytime. Default is enabled.</p>
          </div>
          <div className="bg-gray-900/40 border border-gray-700 rounded p-3">
            <div className="text-xs text-gray-400">Config directory:</div>
            <div className="text-sm text-gray-200 break-all">{configDir || 'Unknown'}</div>
            <div className="text-xs text-gray-400 mt-2">Logs directory:</div>
            <div className="text-sm text-gray-200 break-all">{logsDir || 'Unknown'}</div>
            <div className="flex space-x-3 mt-2">
              <button
                onClick={async () => { try { await window.electronAPI.shell.openFolder(configDir); } catch {} }}
                className="btn-secondary text-xs"
              >
                Open Config Folder
              </button>
              <button
                onClick={async () => { try { await window.electronAPI.shell.openFolder(logsDir); } catch {} }}
                className="btn-secondary text-xs"
              >
                Open Logs Folder
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Log retention (number of .log files)</label>
            <input
              type="number"
              min={1}
              value={logRetentionCount}
              onChange={(e) => setLogRetentionCount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Older logs beyond this count will be deleted automatically.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Disk space threshold (GB)</label>
            <input
              type="number"
              min={0}
              value={diskSpaceThresholdGB}
              onChange={(e) => setDiskSpaceThresholdGB(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Warn if free space is below this value at setup start.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Recent builds to show</label>
            <input
              type="number"
              min={1}
              max={50}
              value={maxRecentBuilds}
              onChange={(e) => setMaxRecentBuilds(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Number of recent builds to display in version manager (default: 10)</p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
