import React from 'react';

interface SummaryStepProps {
  steamLibraryPath: string;
  managedEnvironmentPath: string;
  selectedBranches: string[];
  onFinish: () => void;
}

const SummaryStep: React.FC<SummaryStepProps> = ({
  steamLibraryPath,
  managedEnvironmentPath,
  selectedBranches,
  onFinish
}) => {
  const handleFinish = () => {
    onFinish();
  };

  const handleOpenEnvironment = () => {
    // This would open the managed environment folder
    // In a real implementation, we'd use electron's shell API
    console.log('Opening environment folder:', managedEnvironmentPath);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Setup Complete!</h3>
        <p className="text-gray-300 mb-4">
          Your Schedule I development environment has been successfully configured.
        </p>
      </div>

      {/* Configuration Summary */}
      <div className="space-y-4">
        <div className="card">
          <h4 className="font-medium mb-3">Configuration Summary</h4>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-400">Steam Library Path:</label>
              <p className="text-sm text-gray-300 font-mono bg-gray-800 p-2 rounded mt-1">
                {steamLibraryPath}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-400">Managed Environment Path:</label>
              <p className="text-sm text-gray-300 font-mono bg-gray-800 p-2 rounded mt-1">
                {managedEnvironmentPath}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-400">Selected Branches:</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedBranches.map((branch) => (
                  <span 
                    key={branch}
                    className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded"
                  >
                    {branch}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Directory Structure Preview */}
        <div className="card">
          <h4 className="font-medium mb-3">Created Directory Structure:</h4>
          <div className="text-sm text-gray-300 font-mono bg-gray-800 p-3 rounded">
            <div>{managedEnvironmentPath}/</div>
            <div className="ml-4">├── branches/</div>
            {selectedBranches.map((branch, index) => (
              <div key={branch} className="ml-8">
                {index === selectedBranches.length - 1 ? '└' : '├'}── {branch}/
              </div>
            ))}
            <div className="ml-4">├── logs/</div>
            <div className="ml-4">└── temp/</div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="card">
          <h4 className="font-medium mb-3">Next Steps</h4>
          <div className="space-y-2 text-sm text-gray-300">
            <p>• Your managed environment is ready for development</p>
            <p>• Each branch contains a complete copy of the game</p>
            <p>• You can switch between branches for different development needs</p>
            <p>• Mods and plugins are excluded from copies to prevent conflicts</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleFinish}
          className="btn-primary"
        >
          Launch Managed Environment
        </button>
        
        <button
          onClick={handleOpenEnvironment}
          className="btn-secondary"
        >
          Open Environment Folder
        </button>
      </div>

      {/* Success Message */}
      <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="text-green-400 text-xl">✓</div>
          <div>
            <p className="text-green-300 font-medium">Setup Successful!</p>
            <p className="text-sm text-green-400">
              You can now start developing with your managed environment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryStep;
