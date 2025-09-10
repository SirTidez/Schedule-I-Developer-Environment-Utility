import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SetupWizard from './components/SetupWizard/SetupWizard';
import ManagedEnvironment from './components/ManagedEnvironment/ManagedEnvironment';
import CopyProgress from './components/CopyProgress/CopyProgress';
import DeleteProgress from './components/DeleteProgress/DeleteProgress';
import DefaultModsProgress from './components/DefaultModsProgress/DefaultModsProgress';
import { CustomTitleBar } from './components/CustomTitleBar/CustomTitleBar';
import { useConfigValidation } from './hooks/useConfigValidation';

const AppContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowManagedEnvironment, setShouldShowManagedEnvironment] = useState(false);
  const { validation, configExists, validateConfig, checkConfigExists } = useConfigValidation();
  const location = useLocation();

  useEffect(() => {
    const checkConfiguration = async () => {
      setIsLoading(true);
      try {
        const exists = await checkConfigExists();
        if (exists) {
          const validationResult = await validateConfig();
          if (validationResult.isValid) {
            // Valid config found - show managed environment
            setShouldShowManagedEnvironment(true);
          }
          // Invalid config - will show setup wizard by default (no dialog)
        }
        // No config exists - will show setup wizard by default
      } catch (error) {
        console.error('Error checking configuration:', error);
        // On error, show setup wizard
      } finally {
        setIsLoading(false);
      }
    };

    checkConfiguration();
  }, []);

  // Check if user is forcing setup wizard
  const forceSetupWizard = location.search.includes('setup=true');

  // Show loading state while checking configuration
  if (isLoading) {
    return (
      <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
        <CustomTitleBar title="Schedule I Developer Environment" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Checking configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show managed environment if config is valid and not forcing setup wizard
  if (shouldShowManagedEnvironment && !forceSetupWizard) {
    return (
      <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
        <CustomTitleBar title="Schedule I Developer Environment" />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/managed-environment" replace />} />
            <Route path="/managed-environment" element={<ManagedEnvironment />} />
            <Route path="/copy-progress" element={<CopyProgress />} />
            <Route path="/delete-progress" element={<DeleteProgress />} />
            <Route path="/default-mods-progress" element={<DefaultModsProgress />} />
          </Routes>
        </div>
      </div>
    );
  }

  // Show setup wizard for invalid config, no config, or forced setup
  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      <CustomTitleBar title="Schedule I Developer Environment - Setup" />
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<SetupWizard />} />
          <Route path="/managed-environment" element={<ManagedEnvironment />} />
          <Route path="/copy-progress" element={<CopyProgress />} />
          <Route path="/delete-progress" element={<DeleteProgress />} />
          <Route path="/default-mods-progress" element={<DefaultModsProgress />} />
        </Routes>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
