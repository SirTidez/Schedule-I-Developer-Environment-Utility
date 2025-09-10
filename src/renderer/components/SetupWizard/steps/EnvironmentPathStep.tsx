import React, { useState } from 'react';
import { useConfigService } from '../../../hooks/useConfigService';
import { useDialog } from '../../../hooks/useDialog';

interface EnvironmentPathStepProps {
  onPathSelected: (path: string) => void;
  selectedPath?: string;
}

const EnvironmentPathStep: React.FC<EnvironmentPathStepProps> = ({
  onPathSelected,
  selectedPath
}) => {
  const { setManagedPath } = useConfigService();
  const { openDirectory } = useDialog();
  const [path, setPath] = useState(selectedPath || '');
  const [isValid, setIsValid] = useState(false);

  const handlePathChange = (newPath: string) => {
    setPath(newPath);
    setIsValid(newPath.length > 0);
    onPathSelected(newPath);
  };

  const handleBrowse = async () => {
    try {
      const newPath = await openDirectory({
        title: 'Select Managed Environment Directory',
        defaultPath: path || undefined
      });
      
      if (newPath) {
        handlePathChange(newPath);
      }
    } catch (error) {
      console.error('Failed to open directory dialog:', error);
    }
  };

  const getDefaultPath = () => {
    const defaultPath = `${process.env.USERPROFILE || process.env.HOME}\\Schedule I Development Environment`;
    handlePathChange(defaultPath);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Environment Path</h3>
        <p className="text-gray-300 mb-4">
          Select where you want to store your managed development environment. This will contain copies of different game branches.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Managed Environment Path
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={path}
              onChange={(e) => handlePathChange(e.target.value)}
              placeholder="C:\Schedule I Development Environment"
              className="input-field flex-1"
            />
            <button
              onClick={handleBrowse}
              className="btn-secondary"
            >
              Browse
            </button>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={getDefaultPath}
            className="btn-secondary text-sm"
          >
            Use Default Path
          </button>
        </div>

        {path && (
          <div className={`p-3 rounded-lg border ${
            isValid 
              ? 'border-green-500/50 bg-green-900/20' 
              : 'border-red-500/50 bg-red-900/20'
          }`}>
            <p className={`text-sm ${
              isValid ? 'text-green-300' : 'text-red-300'
            }`}>
              {isValid ? '✓' : '⚠'} {path}
            </p>
            {!isValid && (
              <p className="text-xs text-red-400 mt-1">
                Please enter a valid path
              </p>
            )}
          </div>
        )}

        <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Recommended Structure:</h4>
          <div className="text-sm text-gray-300 font-mono">
            <div>{path || 'Your Path'}/</div>
            <div className="ml-4">├── branches/</div>
            <div className="ml-8">├── development/</div>
            <div className="ml-8">├── testing/</div>
            <div className="ml-8">└── staging/</div>
            <div className="ml-4">├── logs/</div>
            <div className="ml-4">└── temp/</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentPathStep;
