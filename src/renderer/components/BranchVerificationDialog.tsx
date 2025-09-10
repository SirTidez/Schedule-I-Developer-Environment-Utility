import React, { useState, useEffect } from 'react';
import { useSteamService } from '../hooks/useSteamService';

interface BranchVerificationDialogProps {
  isOpen: boolean;
  libraryPath: string;
  expectedBranch: string;
  branchDisplayName: string;
  onVerified: () => void;
  onSkip: () => void;
  onCancel: () => void;
}

const BranchVerificationDialog: React.FC<BranchVerificationDialogProps> = ({
  isOpen,
  libraryPath,
  expectedBranch,
  branchDisplayName,
  onVerified,
  onSkip,
  onCancel
}) => {
  const { verifyBranchInstalled, detectInstalledBranch } = useSteamService();
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'checking' | 'correct' | 'incorrect' | 'error'>('checking');

  useEffect(() => {
    if (isOpen) {
      checkCurrentBranch();
    }
  }, [isOpen, libraryPath]);

  const checkCurrentBranch = async () => {
    setIsVerifying(true);
    setVerificationStatus('checking');
    
    try {
      const branch = await detectInstalledBranch(libraryPath);
      setCurrentBranch(branch);
      
      if (branch === expectedBranch) {
        setVerificationStatus('correct');
      } else {
        setVerificationStatus('incorrect');
      }
    } catch (error) {
      console.error('Error checking current branch:', error);
      setVerificationStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationStatus('checking');
    
    try {
      const isCorrect = await verifyBranchInstalled(libraryPath, expectedBranch);
      
      if (isCorrect) {
        setVerificationStatus('correct');
        setTimeout(() => onVerified(), 1000); // Small delay to show success
      } else {
        setVerificationStatus('incorrect');
      }
    } catch (error) {
      console.error('Error verifying branch:', error);
      setVerificationStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'correct': return 'text-green-400';
      case 'incorrect': return 'text-red-400';
      case 'error': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'correct': return '✓';
      case 'incorrect': return '✗';
      case 'error': return '⚠';
      default: return '⟳';
    }
  };

  const getStatusMessage = () => {
    switch (verificationStatus) {
      case 'correct': return 'Correct branch detected!';
      case 'incorrect': return `Wrong branch detected. Expected: ${branchDisplayName}`;
      case 'error': return 'Error checking branch';
      default: return 'Checking branch...';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">Branch Verification Required</h3>
          
          <div className="mb-6">
            <p className="text-gray-300 mb-4">
              Please change Schedule I to the <strong>{branchDisplayName}</strong> branch in Steam and wait for it to fully download.
            </p>
            
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className={`text-lg ${getStatusColor()}`}>{getStatusIcon()}</span>
                <span className={`font-medium ${getStatusColor()}`}>{getStatusMessage()}</span>
              </div>
              
              {currentBranch && (
                <p className="text-sm text-gray-400">
                  Current branch: <span className="font-mono">{currentBranch}</span>
                </p>
              )}
            </div>
            
            <div className="text-sm text-gray-400 mb-4">
              <p>Steps to change branch in Steam:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Right-click Schedule I in your Steam library</li>
                <li>Select "Properties"</li>
                <li>Go to "Betas" tab</li>
                <li>Select "{branchDisplayName}" from the dropdown</li>
                <li>Wait for the download to complete</li>
              </ol>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? 'Verifying...' : 'Verify Branch'}
            </button>
            
            <button
              onClick={onSkip}
              className="flex-1 btn-secondary"
            >
              Skip Branch
            </button>
            
            <button
              onClick={onCancel}
              className="flex-1 btn-secondary"
            >
              Cancel Setup
            </button>
          </div>
          
          <div className="mt-4">
            <button
              onClick={checkCurrentBranch}
              disabled={isVerifying}
              className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchVerificationDialog;
