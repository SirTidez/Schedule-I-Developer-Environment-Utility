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
 * @version 2.0.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LibrarySelectionStep from './steps/LibrarySelectionStep';
import EnvironmentPathStep from './steps/EnvironmentPathStep';
import BranchSelectionStep from './steps/BranchSelectionStep';
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
  
  const steps = [
    { component: LibrarySelectionStep, title: 'Select Steam Library' },
    { component: EnvironmentPathStep, title: 'Choose Environment Path' },
    { component: BranchSelectionStep, title: 'Select Branches' },
    { component: CopyProgressStep, title: 'Copying Files' },
    { component: SummaryStep, title: 'Setup Complete' }
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 1: return steamLibraryPath.length > 0;
      case 2: return managedEnvironmentPath.length > 0;
      case 3: return selectedBranches.length > 0;
      case 4: return true; // Copy progress step
      case 5: return true; // Summary step
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
    const StepComponent = steps[currentStep - 1].component;
    
    switch (currentStep) {
      case 1:
        return (
          <StepComponent
            onLibrarySelected={setSteamLibraryPath}
            selectedLibrary={steamLibraryPath}
          />
        );
      case 2:
        return (
          <StepComponent
            onPathSelected={setManagedEnvironmentPath}
            selectedPath={managedEnvironmentPath}
          />
        );
      case 3:
        return (
          <StepComponent
            steamLibraryPath={steamLibraryPath}
            onBranchesSelected={setSelectedBranches}
            selectedBranches={selectedBranches}
          />
        );
      case 4:
        return (
          <StepComponent
            steamLibraryPath={steamLibraryPath}
            managedEnvironmentPath={managedEnvironmentPath}
            selectedBranches={selectedBranches}
            onComplete={() => setCurrentStep(5)}
          />
        );
      case 5:
        return (
          <StepComponent
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
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => (
            <div key={index} className={`flex-1 text-center ${
              index < currentStep ? 'text-blue-400' : 'text-gray-500'
            }`}>
              <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${
                index < currentStep ? 'bg-blue-600' : 'bg-gray-600'
              }`}>
                {index < currentStep ? '✓' : index + 1}
              </div>
              <div className="text-sm">{step.title}</div>
            </div>
          ))}
        </div>
        
        {/* Current step content */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">{steps[currentStep - 1].title}</h2>
          
          {renderCurrentStep()}
          
          {/* Navigation buttons */}
          {currentStep < 4 && (
            <div className="mt-8 flex justify-between">
              <button 
                className="btn-secondary"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                Previous
              </button>
              <button 
                className="btn-primary"
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
