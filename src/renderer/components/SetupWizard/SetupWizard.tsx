/**
 * Setup Wizard Component for Schedule I Developer Environment Utility
 * 
 * Multi-step setup wizard that guides users through the initial configuration
 * of the development environment. Handles Steam library selection, environment
 * path configuration, branch selection, file copying, and setup completion.
 * 
 * Key features:
 * - Multi-step navigation with progress indicators
 * - Steam library detection and selection
 * - Environment path configuration
 * - Branch selection with build information
 * - File copying with progress tracking
 * - Setup completion and summary
 * - Validation and error handling
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LibrarySelectionStep from './steps/LibrarySelectionStep';
import EnvironmentPathStep from './steps/EnvironmentPathStep';
import BranchSelectionStep from './steps/BranchSelectionStep';
import DepotDownloaderIntegrationStep from './steps/SteamCMDIntegrationStep';
import SteamLoginStep from './steps/SteamLoginStep';
import CopyProgressStep from './steps/CopyProgressStep';
import SummaryStep from './steps/SummaryStep';

/**
 * Setup Wizard component
 * 
 * Provides a guided multi-step setup process for configuring the development
 * environment. Manages state across all steps and handles navigation between
 * them with proper validation.
 * 
 * @returns JSX element containing the setup wizard interface
 */
const SetupWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [steamLibraryPath, setSteamLibraryPath] = useState('');
  const [managedEnvironmentPath, setManagedEnvironmentPath] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [useDepotDownloader, setUseDepotDownloader] = useState<boolean>(false);
  const [depotDownloaderPath, setDepotDownloaderPath] = useState<string | null>(null);
  const [steamCredentials, setSteamCredentials] = useState<{ username: string; password: string; stayLoggedIn: boolean } | null>(null);
  
  const steps = [
    { key: 'library', title: 'Select Steam Library' },
    { key: 'env', title: 'Choose Environment Path' },
    { key: 'branches', title: 'Select Branches' },
    { key: 'depotdownloader', title: 'DepotDownloader Integration' },
    { key: 'login', title: 'Steam Login' },
    { key: 'copy', title: 'Copying Files' },
    { key: 'summary', title: 'Setup Complete' }
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 1: return steamLibraryPath.length > 0;
      case 2: return managedEnvironmentPath.length > 0;
      case 3: return selectedBranches.length > 0;
      case 4: return true; // DepotDownloader Integration configurable, not blocking
      case 5: return true; // Steam Login allows manual next/skip
      case 6: return true; // Copy progress step
      case 7: return true; // Summary step
      default: return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    navigate('/managed-environment');
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <LibrarySelectionStep
            onLibrarySelected={setSteamLibraryPath}
            selectedLibrary={steamLibraryPath}
          />
        );
      case 2:
        return (
          <EnvironmentPathStep
            onPathSelected={setManagedEnvironmentPath}
            selectedPath={managedEnvironmentPath}
          />
        );
      case 3:
        return (
          <BranchSelectionStep
            steamLibraryPath={steamLibraryPath}
            onBranchesSelected={setSelectedBranches}
            selectedBranches={selectedBranches}
          />
        );
      case 4:
        return (
          <DepotDownloaderIntegrationStep
            onDepotDownloaderPathSelected={setDepotDownloaderPath}
            onUseDepotDownloader={setUseDepotDownloader}
            selectedDepotDownloaderPath={depotDownloaderPath}
            useDepotDownloader={useDepotDownloader}
          />
        );
      case 5:
        return (
          <SteamLoginStep
            onLoginSuccess={(creds) => setSteamCredentials(creds)}
            onSkipLogin={() => setSteamCredentials(null)}
            depotDownloaderPath={depotDownloaderPath}
            useDepotDownloader={useDepotDownloader}
          />
        );
      case 6:
        return (
          <CopyProgressStep
            steamLibraryPath={steamLibraryPath}
            managedEnvironmentPath={managedEnvironmentPath}
            selectedBranches={selectedBranches}
            onComplete={() => setCurrentStep(7)}
            useDepotDownloader={useDepotDownloader}
            depotDownloaderPath={depotDownloaderPath}
            steamCredentials={steamCredentials}
          />
        );
      case 7:
        return (
          <SummaryStep
            steamLibraryPath={steamLibraryPath}
            managedEnvironmentPath={managedEnvironmentPath}
            selectedBranches={selectedBranches}
            onFinish={handleFinish}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Schedule I Development Environment Setup</h1>
        
        {/* Step indicator */}
        <div className="flex justify-between mb-8 overflow-x-auto">
          {steps.map((step, index) => (
            <div key={index} className={`flex-shrink-0 text-center px-2 ${
              index < currentStep ? 'text-blue-400' : 'text-gray-500'
            }`} style={{ minWidth: '120px' }}>
              <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${
                index < currentStep ? 'bg-blue-600' : 'bg-gray-600'
              }`}>
                {index < currentStep ? '✓' : index + 1}
              </div>
              <div className="text-xs">{step.title}</div>
            </div>
          ))}
        </div>
        
        {/* Current step content */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">{steps[currentStep - 1].title}</h2>
          
          {renderCurrentStep()}
          
          {/* Navigation buttons */}
          {currentStep < 6 && (
            <div className="mt-8 flex justify-between">
              <button 
                className="btn-secondary"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                Previous
              </button>
              {/* Hide Next on Steam Login step; login action progresses */}
              {(currentStep !== 4 && currentStep !== 5) && (
                <button 
                  className="btn-primary"
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  Next
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
