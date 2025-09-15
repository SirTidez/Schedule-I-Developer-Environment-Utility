/**
 * Main Application Component for Schedule I Developer Environment Utility
 * 
 * The root component that manages application routing, configuration validation,
 * and determines whether to show the setup wizard or managed environment interface.
 * Handles the initial application state and provides the main navigation structure.
 * 
 * Key features:
 * - Configuration validation and loading
 * - Conditional routing based on configuration state
 * - Setup wizard for initial configuration
 * - Managed environment for ongoing use
 * - Custom title bar with window controls
 * - Loading states and error handling
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SetupWizard from './components/SetupWizard/SetupWizard';
import ManagedEnvironment from './components/ManagedEnvironment/ManagedEnvironment';
import CopyProgress from './components/CopyProgress/CopyProgress';
import DeleteProgress from './components/DeleteProgress/DeleteProgress';
import DefaultModsProgress from './components/DefaultModsProgress/DefaultModsProgress';
import SteamCMDSetup from './components/SteamCMDSetup';
import { MigrationDialog } from './components/MigrationDialog';
import { CustomTitleBar } from './components/CustomTitleBar/CustomTitleBar';
import { useConfigValidation } from './hooks/useConfigValidation';

/**
 * Main application content component
 * 
 * Handles configuration validation, determines the appropriate interface to show,
 * and manages the application's initial state. Shows either the setup wizard for
 * new users or the managed environment for configured users.
 * 
 * @returns JSX element containing the main application interface
 */
const AppContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowManagedEnvironment, setShouldShowManagedEnvironment] = useState(false);
  const [showDepotDownloaderSetup, setShowDepotDownloaderSetup] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [depotDownloaderConfig, setDepotDownloaderConfig] = useState<{useDepotDownloader: boolean, depotDownloaderPath: string | null} | null>(null);
  const [managedEnvironmentPath, setManagedEnvironmentPath] = useState<string>('');
  const { validation, configExists, validateConfig, checkConfigExists } = useConfigValidation();
  const location = useLocation();

  useEffect(() => {
    const checkDepotDownloaderConfiguration = async () => {
      setIsLoading(true);
      try {
        // First check if DepotDownloader configuration exists
        const config = await window.electronAPI?.config?.get();
        if (config && (config.useDepotDownloader !== undefined || config.depotDownloaderPath !== undefined)) {
          // DepotDownloader configuration already exists, proceed to normal flow
          setDepotDownloaderConfig({
            useDepotDownloader: config.useDepotDownloader || false,
            depotDownloaderPath: config.depotDownloaderPath || null
          });
          await checkMainConfiguration();
        } else {
          // No DepotDownloader configuration, show setup first
          setShowDepotDownloaderSetup(true);
        }
      } catch (error) {
        console.error('Error checking DepotDownloader configuration:', error);
        // On error, show DepotDownloader setup
        setShowDepotDownloaderSetup(true);
      } finally {
        setIsLoading(false);
      }
    };

    const checkMainConfiguration = async () => {
      try {
        const exists = await checkConfigExists();
        if (exists) {
          const validationResult = await validateConfig();
          if (validationResult.isValid) {
            // Valid config found - check for migration needs
            await checkMigrationNeeds();
          }
          // Invalid config - will show setup wizard by default (no dialog)
        }
        // No config exists - will show setup wizard by default
      } catch (error) {
        console.error('Error checking configuration:', error);
        // On error, show setup wizard
      }
    };

    const checkMigrationNeeds = async () => {
      try {
        // Get managed environment path from config
        const config = await window.electronAPI?.config?.get();
        if (config?.managedEnvironmentPath) {
          setManagedEnvironmentPath(config.managedEnvironmentPath);
          
          // Check for legacy installations
          const result = await window.electronAPI?.migration?.detectLegacyInstallations(config.managedEnvironmentPath);
          if (result?.success && result.installations.length > 0) {
            // Legacy installations found - show migration dialog
            setShowMigrationDialog(true);
          } else {
            // No legacy installations - show managed environment
            setShouldShowManagedEnvironment(true);
          }
        } else {
          // No managed environment path - show managed environment anyway
          setShouldShowManagedEnvironment(true);
        }
      } catch (error) {
        console.error('Error checking migration needs:', error);
        // On error, show managed environment
        setShouldShowManagedEnvironment(true);
      }
    };

    checkDepotDownloaderConfiguration();
  }, []);

  // Check if user is forcing setup wizard
  const forceSetupWizard = location.search.includes('setup=true');

  // Handle DepotDownloader setup completion
  const handleDepotDownloaderSetupComplete = async (useDepotDownloader: boolean, depotDownloaderPath: string | null) => {
    try {
      // Save DepotDownloader configuration
      const config = await window.electronAPI?.config?.get() || {};
      const updatedConfig = {
        ...config,
        useDepotDownloader,
        depotDownloaderPath
      };
      await window.electronAPI?.config?.update(updatedConfig);

      // Update local state
      setDepotDownloaderConfig({ useDepotDownloader, depotDownloaderPath });
      setShowDepotDownloaderSetup(false);

      // Now check main configuration
      const exists = await checkConfigExists();
      if (exists) {
        const validationResult = await validateConfig();
        if (validationResult.isValid) {
          await checkMigrationNeeds();
        }
      }
    } catch (error) {
      console.error('Error saving DepotDownloader configuration:', error);
      // Continue anyway
      setDepotDownloaderConfig({ useDepotDownloader, depotDownloaderPath });
      setShowDepotDownloaderSetup(false);
    }
  };

  // Handle migration dialog close
  const handleMigrationClose = () => {
    setShowMigrationDialog(false);
    setShouldShowManagedEnvironment(true);
  };

  // Handle migration completion
  const handleMigrationComplete = (result: any) => {
    console.log('Migration completed:', result);
    setShowMigrationDialog(false);
    setShouldShowManagedEnvironment(true);
  };

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

  // Show DepotDownloader setup if needed
  if (showDepotDownloaderSetup) {
    return (
      <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
        <CustomTitleBar title="Schedule I Developer Environment - DepotDownloader Setup" />
        <div className="flex-1 overflow-auto">
          <SteamCMDSetup onSetupComplete={handleDepotDownloaderSetupComplete} />
        </div>
      </div>
    );
  }

  // Show migration dialog if needed
  if (showMigrationDialog) {
    return (
      <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
        <CustomTitleBar title="Schedule I Developer Environment - Migration" />
        <div className="flex-1 overflow-auto">
          <MigrationDialog
            isOpen={showMigrationDialog}
            onClose={handleMigrationClose}
            managedEnvironmentPath={managedEnvironmentPath}
            onMigrationComplete={handleMigrationComplete}
          />
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

/**
 * Root App component with routing
 * 
 * Wraps the main application content with React Router to provide
 * client-side routing functionality throughout the application.
 * 
 * @returns JSX element containing the routed application
 */
const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
