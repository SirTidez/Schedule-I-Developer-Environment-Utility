import React, { useState, useEffect } from 'react';
import { useSteamService } from '../../../hooks/useSteamService';

interface BranchInfo {
  name: string;
  buildId: number;
  lastUpdated: number;
  isAvailable: boolean;
}

interface BranchSelectionStepProps {
  steamLibraryPath: string;
  onBranchesSelected: (branches: string[], descriptions?: Record<string, string>) => void;
  selectedBranches?: string[];
}

const BranchSelectionStep: React.FC<BranchSelectionStepProps> = ({
  steamLibraryPath,
  onBranchesSelected,
  selectedBranches = []
}) => {
  const { detectInstalledBranch } = useSteamService();
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(selectedBranches);
  const [installedBranch, setInstalledBranch] = useState<string | null>(null);
  const [customDescriptions, setCustomDescriptions] = useState<Record<string, string>>({});

  // Define the available Schedule I branches
  const availableBranches = [
    { id: 'main-branch', name: 'Main', description: 'Public release branch' },
    { id: 'beta-branch', name: 'Beta', description: 'Beta testing branch' },
    { id: 'alternate-branch', name: 'Alternative', description: 'Alternative build branch' },
    { id: 'alternate-beta-branch', name: 'Alternative Beta', description: 'Alternative beta branch' }
  ];

  useEffect(() => {
    if (steamLibraryPath) {
      loadBranches();
    }
  }, [steamLibraryPath]);

  const loadBranches = async () => {
    setLoading(true);
    setError(null);

    try {
      // Detect which branch is currently installed
      const currentBranch = await detectInstalledBranch(steamLibraryPath);
      setInstalledBranch(currentBranch);

      // Create branch info for all available branches
      const branchInfos: BranchInfo[] = availableBranches.map(branch => ({
        name: branch.id,
        buildId: 0, // We'll get this from the manifest if needed
        lastUpdated: Date.now() / 1000,
        isAvailable: true,
        isInstalled: branch.id === currentBranch
      }));

      setBranches(branchInfos);

      // Auto-select the currently installed branch
      if (currentBranch && !selectedBranches.length) {
        setSelected([currentBranch]);
        onBranchesSelected([currentBranch]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const handleBranchToggle = (branchName: string) => {
    const newSelected = selected.includes(branchName)
      ? selected.filter(b => b !== branchName)
      : [...selected, branchName];
    
    setSelected(newSelected);
    onBranchesSelected(newSelected, customDescriptions);
  };

  const handleDescriptionChange = (branchName: string, description: string) => {
    const newDescriptions = { ...customDescriptions };
    if (description.trim()) {
      newDescriptions[branchName] = description.trim();
    } else {
      delete newDescriptions[branchName];
    }
    setCustomDescriptions(newDescriptions);
    onBranchesSelected(selected, newDescriptions);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Branches</h3>
        <p className="text-gray-300 mb-4">
          Choose which development branches you want to set up. Each branch will be copied to your managed environment.
        </p>
      </div>

      {loading && (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-gray-300">Loading available branches...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
          <button 
            onClick={loadBranches}
            className="mt-2 btn-secondary text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && branches.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Available Branches:</h4>
            <div className="text-sm text-gray-400">
              {selected.length} of {branches.length} selected
            </div>
          </div>
          
          <div className="space-y-2">
            {branches.map((branch) => {
              const branchInfo = availableBranches.find(b => b.id === branch.name);
              const displayName = branchInfo?.name || branch.name;
              const description = branchInfo?.description || '';
              
              return (
                <div
                  key={branch.name}
                  className={`p-4 rounded-lg border transition-colors ${
                    selected.includes(branch.name)
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(branch.name)}
                        onChange={() => handleBranchToggle(branch.name)}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h5 className="font-medium">{displayName}</h5>
                          {branch.isInstalled && (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-green-400">Currently Installed</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{description}</p>
                      </div>
                      <div className="text-right">
                        <div className={`w-2 h-2 rounded-full ${
                          branch.isAvailable ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                    </div>
                    
                    {selected.includes(branch.name) && (
                      <div className="ml-7">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Custom Description (Optional)
                        </label>
                        <input
                          type="text"
                          value={customDescriptions[branch.name] || ''}
                          onChange={(e) => handleDescriptionChange(branch.name, e.target.value)}
                          placeholder={`Enter a custom description for ${displayName}`}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This description will be used to identify this installation in the Version Management window.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
          <p className="text-green-300">
            ✓ Selected {selected.length} branch{selected.length !== 1 ? 'es' : ''}: {selected.join(', ')}
          </p>
        </div>
      )}

      {selected.length === 0 && !loading && (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
          <p className="text-yellow-300">
            ⚠ Please select at least one branch to continue.
          </p>
        </div>
      )}
    </div>
  );
};

export default BranchSelectionStep;
