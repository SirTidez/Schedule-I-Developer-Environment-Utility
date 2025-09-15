import React, { useEffect, useState } from 'react';
import { useSteamService } from '../../../hooks/useSteamService';

interface LibrarySelectionStepProps {
  onLibrarySelected: (libraryPath: string) => void;
  selectedLibrary?: string;
}

const LibrarySelectionStep: React.FC<LibrarySelectionStepProps> = ({
  onLibrarySelected,
  selectedLibrary
}) => {
  const { libraries, loading, error, detectLibraries, findScheduleILibrary } = useSteamService();
  const [selectedPath, setSelectedPath] = useState(selectedLibrary || '');
  const [autoSelected, setAutoSelected] = useState(false);

  useEffect(() => {
    const initializeLibraries = async () => {
      await detectLibraries();
      
      // Auto-select library containing Schedule I if no library is already selected
      if (!selectedLibrary && !autoSelected) {
        try {
          const scheduleILibrary = await findScheduleILibrary();
          if (scheduleILibrary) {
            setSelectedPath(scheduleILibrary);
            onLibrarySelected(scheduleILibrary);
            setAutoSelected(true);
          }
        } catch (err) {
          console.warn('Failed to auto-select Schedule I library:', err);
        }
      }
    };
    
    initializeLibraries();
  }, [detectLibraries, findScheduleILibrary, selectedLibrary, autoSelected, onLibrarySelected]);

  const handleLibrarySelect = (libraryPath: string) => {
    setSelectedPath(libraryPath);
    onLibrarySelected(libraryPath);
  };

  const handleRefresh = () => {
    detectLibraries();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Steam Library</h3>
        <p className="text-gray-300 mb-4">
          Choose the Steam library where Schedule I is installed. We'll automatically detect available libraries.
        </p>
      </div>

      {loading && (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-gray-300">Detecting Steam libraries...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
          <button 
            onClick={handleRefresh}
            className="mt-2 btn-secondary text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && libraries.length === 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
          <p className="text-yellow-300">
            No Steam libraries detected. Please ensure Steam is installed and try refreshing.
          </p>
          <button 
            onClick={handleRefresh}
            className="mt-2 btn-secondary text-sm"
          >
            Refresh
          </button>
        </div>
      )}

      {!loading && libraries.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Detected Libraries:</h4>
            <button 
              onClick={handleRefresh}
              className="btn-secondary text-sm"
            >
              Refresh
            </button>
          </div>
          
          <div className="space-y-2">
            {libraries.map((libraryPath) => (
              <div
                key={libraryPath}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPath === libraryPath
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                }`}
                onClick={() => handleLibrarySelect(libraryPath)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedPath === libraryPath
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-500'
                  }`}>
                    {selectedPath === libraryPath && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{libraryPath}</p>
                      {selectedPath === libraryPath && autoSelected && (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                          Contains Schedule I
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      Steam installation directory
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPath && (
        <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
          <p className="text-green-300">
            ✓ Selected: {selectedPath}
          </p>
        </div>
      )}
    </div>
  );
};

export default LibrarySelectionStep;
