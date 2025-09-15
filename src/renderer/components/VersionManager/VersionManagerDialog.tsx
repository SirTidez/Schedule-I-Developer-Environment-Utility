import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, CheckCircle, Circle, Loader2, Plus, Info } from 'lucide-react';

interface VersionInfo {
  buildId: string;
  manifestId: string;
  downloadDate: string;
  sizeBytes?: number;
  isInstalled: boolean;
  isActive: boolean;
  path?: string;
  description?: string;
  isUserAdded?: boolean; // New field to track user-added versions
}

interface VersionManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  branchName: string;
  branchKey: string;
  onVersionChange: (version: { buildId?: string; manifestId?: string }) => void;
}

export const VersionManagerDialog: React.FC<VersionManagerDialogProps> = ({
  isOpen,
  onClose,
  branchName,
  branchKey,
  onVersionChange
}) => {
  // Map Steam branch keys to folder names for DepotDownloader
  const getBranchFolderName = (branchKey: string): string => {
    console.log('VersionManagerDialog - branchKey received:', branchKey);
    console.log('VersionManagerDialog - branchName received:', branchName);
    
    // Map Steam branch keys to folder names
    const branchFolderMap: Record<string, string> = {
      'public': 'main-branch',
      'beta': 'beta-branch',
      'alternate': 'alternate-branch',
      'alternate-beta': 'alternate-beta-branch'
    };
    
    const folderName = branchFolderMap[branchKey] || branchKey;
    console.log('VersionManagerDialog - mapped folder name:', folderName);
    return folderName;
  };
  const [userAddedVersions, setUserAddedVersions] = useState<VersionInfo[]>([]);
  const [installedVersions, setInstalledVersions] = useState<VersionInfo[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [activeVersion, setActiveVersion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string>('');
  
  // New state for manual version addition
  const [showAddVersion, setShowAddVersion] = useState(false);
  const [manifestId, setManifestId] = useState('');
  const [description, setDescription] = useState('');
  const [addingVersion, setAddingVersion] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Load versions when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadVersions();
      loadUserAddedVersions();
    }
  }, [isOpen, branchKey]);

  const loadVersions = async () => {
    setLoading(true);
    setError('');
    
    try {
      const installed = await window.electronAPI.steam.getInstalledVersions(branchName);
      const manifestVersions = await window.electronAPI.config.getBranchManifestVersions(branchName);

      const unifiedVersions = new Map<string, VersionInfo>();

      // Process installed versions first
      installed.forEach((v: any) => {
        const key = v.manifestId || v.buildId;
        if (key) {
          unifiedVersions.set(key, {
            buildId: v.buildId,
            manifestId: v.manifestId || v.buildId,
            downloadDate: v.downloadDate,
            sizeBytes: v.sizeBytes || 0,
            isInstalled: true,
            isActive: v.isActive,
            path: v.path,
            description: v.description || (v.manifestId ? `Manifest ${v.manifestId}` : (v.buildId ? `Build ${v.buildId}` : 'Unknown')),
            isUserAdded: v.isUserAdded || false
          });
        }
      });

      // Merge with manifest versions from config
      if (manifestVersions && Object.keys(manifestVersions).length > 0) {
        Object.values(manifestVersions).forEach((v: any) => {
          const key = v.manifestId;
          if (key && !unifiedVersions.has(key)) {
            unifiedVersions.set(key, {
              buildId: v.buildId,
              manifestId: v.manifestId,
              downloadDate: v.downloadDate,
              sizeBytes: v.sizeBytes || 0,
              isInstalled: true, // A version from config is considered installed
              isActive: v.isActive,
              path: v.path,
              description: v.description || `Manifest ${v.manifestId}`,
              isUserAdded: false
            });
          }
        });
      }

      const installedVersions = Array.from(unifiedVersions.values());

      // Find active version (prefer manifest ID based)
      const activeManifest = await window.electronAPI.config.getActiveManifest(branchName);
      const activeBuild = await window.electronAPI.config.getActiveBuild(branchName);
      
      const active = installedVersions.find(v => 
        (activeManifest && v.manifestId === activeManifest) || 
        (activeBuild && v.buildId === activeBuild)
      );
      const activeVersionId = active?.manifestId || active?.buildId || '';

      setInstalledVersions(installedVersions);
      setActiveVersion(activeVersionId);
    } catch (err) {
      setError(`Failed to load versions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadUserAddedVersions = async () => {
    try {
      // Load user-added versions from storage
      const userVersions = await window.electronAPI.config.getUserAddedVersions(branchKey);
      setUserAddedVersions(userVersions || []);
    } catch (err) {
      console.error('Failed to load user-added versions:', err);
    }
  };

  const handleAddVersion = async () => {
    if (!manifestId.trim()) {
      setError('Please enter a manifest ID');
      return;
    }

    setAddingVersion(true);
    setError('');

    try {
      // Retrieve cached Steam credentials
      console.log('Retrieving cached Steam credentials for version addition...');
      console.log('Available electronAPI methods:', Object.keys(window.electronAPI || {}));
      console.log('credCache available:', !!window.electronAPI?.credCache);
      
      const credResult = await window.electronAPI.credCache.get();
      console.log('Credential cache result:', credResult);
      console.log('credResult.success:', credResult?.success);
      console.log('credResult.credentials:', credResult?.credentials);
      
      if (!credResult || !credResult.success || !credResult.credentials) {
        console.log('No cached credentials found, showing error message');
        setError('Steam credentials not found. Please login to Steam first using the Steam login section in the main window, then try adding the version again.');
        return;
      }

      const { username, password } = credResult.credentials;
      console.log('Using cached credentials for user:', username);
      console.log('Password length:', password?.length || 0);
      console.log('Username empty?', !username || username.trim() === '');
      console.log('Password empty?', !password || password.trim() === '');

      // Get DepotDownloader path
      const depotPathResult = await window.electronAPI.depotdownloader.getDepotDownloaderPath();
      console.log('DepotDownloader path result:', depotPathResult);
      
      if (!depotPathResult.success) {
        setError(`Failed to get DepotDownloader path: ${depotPathResult.error}`);
        return;
      }
      
      const depotDownloaderPath = depotPathResult.path;
      console.log('DepotDownloader path:', depotDownloaderPath);

      // Validate manifest ID first
      setError('Validating manifest ID...');
      const branchFolderName = getBranchFolderName(branchKey);
      console.log('Using branch folder name:', branchFolderName);
      console.log('Starting manifest validation with:', {
        depotDownloaderPath,
        username: username ? `${username.substring(0, 3)}***` : 'undefined',
        password: password ? '***' : 'undefined',
        manifestId: manifestId.trim(),
        appId: '3164500',
        depotId: '3164501',
        steamBranchName
      });
      
      const validationResult = await window.electronAPI.depotdownloader.validateManifest(
        depotDownloaderPath,
        username,
        password,
        manifestId.trim(),
        '3164500', // App ID
        '3164501', // Depot ID
        branchFolderName // Branch folder name
      );
      
      console.log('Validation result:', validationResult);

      if (!validationResult.success) {
        setError(`Manifest validation failed: ${validationResult.error}`);
        return;
      }

      // Create a new version entry
      const newVersion: VersionInfo = {
        buildId: manifestId, // Use manifestId as buildId for now
        manifestId: manifestId,
        downloadDate: new Date().toISOString(),
        description: description.trim() || `Manifest ${manifestId}`,
        isInstalled: false,
        isActive: false,
        isUserAdded: true
      };

      // Add to user-added versions
      const updatedUserVersions = [...userAddedVersions, newVersion];
      setUserAddedVersions(updatedUserVersions);

      // Save to storage
      await window.electronAPI.config.setUserAddedVersions(branchKey, updatedUserVersions);

      // Reset form
      setManifestId('');
      setDescription('');
      setShowAddVersion(false);
      setError(''); // Clear any validation messages
    } catch (err) {
      setError(`Failed to add version: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setAddingVersion(false);
    }
  };

  const handleInstallVersion = async (version: VersionInfo) => {
    setDownloading(true);
    setError('');

    try {
      // Get config for managed environment path
      const config = await window.electronAPI.config.get();
      const managedEnvPath = config.managedEnvironmentPath;

      // Retrieve cached credentials
      const credResult = await window.electronAPI.credCache.get();
      if (!credResult.success || !credResult.credentials) {
        setError('Steam credentials not found. Please login to Steam first.');
        setDownloading(false);
        return;
      }

      const { username, password } = credResult.credentials;

      // Set up progress listener
      const progressListener = (data: any) => {
        if (data.type === 'percent' && data.value !== undefined) {
          setDownloadProgress(prev => ({ ...prev, [version.buildId]: data.value }));
        }
      };

      window.electronAPI.onDepotDownloaderProgress(progressListener);

      // Download using DepotDownloader with specific manifest
      const downloadResult = await window.electronAPI.depotdownloader.downloadWithManifest(
        config.depotDownloaderPath,
        username,
        password,
        getBranchFolderName(branchKey),
        version.manifestId,
        '3164500', // Schedule I App ID
        '3164501', // Depot ID
        managedEnvPath
      );

      window.electronAPI.removeDepotDownloaderProgressListener();

      // Check if download was successful
      if (downloadResult && !downloadResult.success) {
        throw new Error(downloadResult.error || 'Download failed');
      }

      setDownloadProgress(prev => ({ ...prev, [version.buildId]: 100 }));

      // Refresh the versions list
      await loadVersions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Parse specific error types for better user feedback
      let userFriendlyError = errorMessage;
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        userFriendlyError = 'Access denied. This manifest may be private or require different credentials.';
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        userFriendlyError = 'Manifest not found. The manifest ID may be invalid or no longer available.';
      } else if (errorMessage.includes('Login failed')) {
        userFriendlyError = 'Steam login failed. Please check your credentials.';
      } else if (errorMessage.includes('timeout')) {
        userFriendlyError = 'Download timed out. Please try again.';
      } else if (errorMessage.includes('ENOSPC')) {
        userFriendlyError = 'Not enough disk space. Please free up space and try again.';
      }

      setError(`Download failed: ${userFriendlyError}`);
      window.electronAPI.removeDepotDownloaderProgressListener();
    } finally {
      setDownloading(false);
    }
  };

  const handleSetActive = async (buildId: string) => {
    try {
      setLoading(true);
      setToastMsg('Switching to new version...');
      
      // Call the config service to set active build
      await window.electronAPI.config.setActiveBuild(branchName, buildId);
      setActiveVersion(buildId);
      console.log('Calling onVersionChange with buildId:', buildId);
      onVersionChange({ buildId });
      
      // Refresh the versions list to update the UI
      await loadVersions();
      
      setToastMsg('Version switched successfully!');
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      setError(`Failed to set active version: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setToastMsg(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSetActiveManifest = async (manifestId: string) => {
    try {
      setLoading(true);
      setToastMsg('Switching to new version...');
      
      // Call the config service to set active manifest
      await window.electronAPI.config.setActiveManifest(branchName, manifestId);
      setActiveVersion(manifestId);
      console.log('Calling onVersionChange with manifestId:', manifestId);
      onVersionChange({ manifestId });
      
      // Refresh the versions list to update the UI
      await loadVersions();
      
      setToastMsg('Version switched successfully!');
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err) {
      setError(`Failed to set active manifest: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setToastMsg(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUserVersion = async (version: VersionInfo) => {
    if (!confirm(`Are you sure you want to remove "${version.description}" from the list?`)) return;

    try {
      const updatedVersions = userAddedVersions.filter(v => v.buildId !== version.buildId && v.manifestId !== version.manifestId);
      setUserAddedVersions(updatedVersions);
      await window.electronAPI.config.setUserAddedVersions(branchKey, updatedVersions);
    } catch (err) {
      setError(`Failed to remove version: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteVersion = async (buildId: string) => {
    if (!confirm(`Are you sure you want to delete version ${buildId}?`)) return;

    try {
      setLoading(true);
      const version = installedVersions.find(v => v.buildId === buildId || v.manifestId === buildId);
      if (version?.path) {
        await window.electronAPI.file.deleteDirectory(version.path);
        await loadVersions();
      }
    } catch (err) {
      setError(`Failed to delete version: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={loading ? undefined : onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">
            Manage Versions - {branchName}
          </h2>
          <button
            onClick={loading ? undefined : onClose}
            disabled={loading}
            className={`transition-colors ${loading ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {toastMsg && (
          <div className="bg-blue-900/30 border border-blue-500/50 text-blue-200 px-4 py-2 text-sm text-center rounded mb-4">
            {toastMsg}
          </div>
        )}

        {/* Info notice */}
        <div className="bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded mb-4">
          <div className="flex items-start space-x-2">
            <Info size={16} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">Manual Version Management</p>
              <p>Add specific versions by entering their manifest ID. You can find manifest IDs on SteamDB or other Steam tracking sites.</p>
              <p className="mt-2 text-yellow-200">
                <strong>Note:</strong> You must be logged into Steam first using the Steam login section in the main window before adding versions.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Add Version Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-white">Add New Version</h3>
              <button
                onClick={() => setShowAddVersion(!showAddVersion)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>{showAddVersion ? 'Cancel' : 'Add Version'}</span>
              </button>
            </div>

            {showAddVersion && (
              <div className="bg-gray-700 p-4 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Manifest ID
                  </label>
                  <input
                    type="text"
                    value={manifestId}
                    onChange={(e) => setManifestId(e.target.value)}
                    placeholder="Enter manifest ID (e.g., 1234567890123456789)"
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter a description for this version"
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleAddVersion}
                    disabled={addingVersion || !manifestId.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {addingVersion ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    <span>{addingVersion ? 'Adding...' : 'Add to List'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setManifestId('');
                      setDescription('');
                      setShowAddVersion(false);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User-Added Versions */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-3">Available Versions</h3>
            <div className="space-y-2">
              {userAddedVersions.map((version) => {
                const isInstalled = installedVersions.some(v => (v.buildId && v.buildId === version.buildId) || (v.manifestId && v.manifestId === version.manifestId));
                const progress = downloadProgress[version.buildId] || 0;

                return (
                  <div
                    key={version.manifestId || version.buildId || 'unknown'}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="text-white font-medium">{version.description}</div>
                        <div className="text-gray-400 text-sm">
                          Manifest: {version.manifestId} • Added: {formatDate(version.downloadDate)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isInstalled ? (
                        <span className="text-green-400 text-sm">Installed</span>
                      ) : downloading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-400">{progress}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleInstallVersion(version)}
                            disabled={downloading}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
                          >
                            <Download size={14} />
                            <span>Install</span>
                          </button>
                          <button
                            onClick={() => handleRemoveUserVersion(version)}
                            disabled={downloading}
                            className="p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {userAddedVersions.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Info size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No versions added yet. Click "Add Version" to get started.</p>
                </div>
              )}
            </div>
          </div>

          {/* Installed Versions */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-3">Installed Versions</h3>
            <div className="space-y-2">
              {installedVersions.map((version) => (
                <div
                  key={version.manifestId || version.buildId || 'unknown'}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {version.isActive ? (
                        <CheckCircle size={20} className="text-green-400" />
                      ) : (
                        <Circle size={20} className="text-gray-400" />
                      )}
                      <div>
                        <div className="text-white font-medium">
                          {version.manifestId ? `Manifest ${version.manifestId}` : (version.buildId ? `Build ${version.buildId}` : 'Unknown')}
                          {version.isActive && <span className="text-green-400 ml-2">(Active)</span>}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {version.manifestId && version.manifestId !== version.buildId && (
                            <span>Build: {version.buildId} • </span>
                          )}
                          {formatDate(version.downloadDate)} • {formatSize(version.sizeBytes)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!version.isActive && (
                      <button
                        onClick={() => version.manifestId ? handleSetActiveManifest(version.manifestId) : (version.buildId ? handleSetActive(version.buildId) : null)}
                        disabled={loading}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => version.buildId ? handleDeleteVersion(version.buildId) : null}
                      disabled={loading || version.isActive}
                      className="p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {installedVersions.length} version{installedVersions.length !== 1 ? 's' : ''} installed • {userAddedVersions.length} available
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loading ? undefined : onClose}
              disabled={loading}
              className={`px-4 py-2 rounded transition-colors ${
                loading 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
