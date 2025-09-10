import React, { useState, useEffect } from 'react';
import { useUpdateService } from '../../hooks/useUpdateService';

interface UpdateDialogProps {
  isOpen: boolean;
  updateInfo: {
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: string;
    release?: any;
  };
  onClose: () => void;
  onHideUntilNextRelease: () => void;
}

export const UpdateDialog: React.FC<UpdateDialogProps> = ({
  isOpen,
  updateInfo,
  onClose,
  onHideUntilNextRelease
}) => {
  const { getReleaseNotes } = useUpdateService();
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  useEffect(() => {
    if (isOpen && updateInfo.release) {
      setIsLoadingNotes(true);
      getReleaseNotes(updateInfo.release)
        .then(notes => {
          setReleaseNotes(notes);
        })
        .catch(error => {
          console.error('Failed to load release notes:', error);
          setReleaseNotes('Failed to load release notes.');
        })
        .finally(() => {
          setIsLoadingNotes(false);
        });
    }
  }, [isOpen, updateInfo.release, getReleaseNotes]);

  if (!isOpen) return null;

  const handleDownloadClick = () => {
    if (updateInfo.release?.html_url) {
      console.log('Opening download URL:', updateInfo.release.html_url);
      // Use Electron's shell to open in user's default browser
      window.electronAPI.shell.openExternal(updateInfo.release.html_url);
    } else {
      console.error('No release URL available for download');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center mb-4">
          <div className="w-4 h-4 rounded-full mr-3 bg-blue-500"></div>
          <h2 className="text-xl font-semibold text-white">
            Update Available
          </h2>
        </div>

        <div className="mb-6">
          <div className="text-green-400 mb-4">
            ✓ A new version of Schedule I Developer Environment is available!
          </div>

          <div className="mb-4">
            <div className="text-gray-300 mb-2">
              <span className="font-semibold">Current Version:</span> v{updateInfo.currentVersion}
            </div>
            <div className="text-gray-300 mb-2">
              <span className="font-semibold">Latest Version:</span> v{updateInfo.latestVersion}
            </div>
            {updateInfo.release && (
              <div className="text-gray-300 mb-2">
                <span className="font-semibold">Released:</span> {new Date(updateInfo.release.published_at).toLocaleDateString()}
              </div>
            )}
          </div>

          {updateInfo.release && (
            <div className="mb-4">
              <h3 className="text-white font-semibold mb-2">Release Notes:</h3>
              <div className="bg-gray-700 rounded p-3 text-gray-300 text-sm max-h-40 overflow-y-auto">
                {isLoadingNotes ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Loading release notes...</span>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-xs">{releaseNotes}</pre>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <div className="flex space-x-3">
            <button
              onClick={onHideUntilNextRelease}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
            >
              Hide Until Next Release
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
            >
              Close
            </button>
          </div>
          
          <button
            onClick={handleDownloadClick}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors font-semibold"
            title="Open GitHub release page to download the update"
          >
            Download Update
          </button>
        </div>
      </div>
    </div>
  );
};
