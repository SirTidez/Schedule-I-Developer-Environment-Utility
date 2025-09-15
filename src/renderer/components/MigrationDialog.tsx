/**
 * Migration Dialog Component for Schedule I Developer Environment Utility
 * 
 * Provides a user interface for managing the migration from build ID to manifest ID
 * based versioning system. This dialog handles detection, migration, validation,
 * and rollback of legacy installations.
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.0.3
 */

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, RefreshCw, RotateCcw, Info } from 'lucide-react';

interface LegacyInstallation {
  branchName: string;
  buildId: string;
  path: string;
  manifestId?: string;
}

interface MigrationProgress {
  currentStep: string;
  completedSteps: number;
  totalSteps: number;
  currentInstallation?: LegacyInstallation;
  error?: string;
}

interface MigrationResult {
  success: boolean;
  migratedInstallations: LegacyInstallation[];
  failedInstallations: Array<LegacyInstallation & { error: string }>;
  errors: string[];
}

interface MigrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  managedEnvironmentPath: string;
  onMigrationComplete?: (result: MigrationResult) => void;
}

/**
 * Migration Dialog Component
 * 
 * Provides a comprehensive interface for managing version migration from build ID
 * to manifest ID based versioning. Includes detection, migration, validation,
 * and rollback functionality with progress tracking and error handling.
 */
export const MigrationDialog: React.FC<MigrationDialogProps> = ({
  isOpen,
  onClose,
  managedEnvironmentPath,
  onMigrationComplete
}) => {
  const [legacyInstallations, setLegacyInstallations] = useState<LegacyInstallation[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [validationResult, setValidationResult] = useState<{valid: boolean, errors: string[]} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'detect' | 'migrate' | 'validate' | 'complete'>('detect');

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLegacyInstallations([]);
      setIsDetecting(false);
      setIsMigrating(false);
      setIsValidating(false);
      setIsRollingBack(false);
      setMigrationProgress(null);
      setMigrationResult(null);
      setValidationResult(null);
      setError(null);
      setCurrentStep('detect');
    }
  }, [isOpen]);

  // Set up migration progress listener
  useEffect(() => {
    if (isOpen && isMigrating) {
      const progressListener = (progress: any) => {
        setMigrationProgress(progress);
      };

      window.electronAPI.onMigrationProgress(progressListener);

      return () => {
        window.electronAPI.removeMigrationProgressListener();
      };
    }
  }, [isOpen, isMigrating]);

  /**
   * Detects legacy installations in the managed environment
   */
  const detectLegacyInstallations = async () => {
    try {
      setIsDetecting(true);
      setError(null);
      
      const result = await window.electronAPI.migration.detectLegacyInstallations(managedEnvironmentPath);
      
      if (result.success) {
        setLegacyInstallations(result.installations);
        if (result.installations.length === 0) {
          setCurrentStep('complete');
        } else {
          setCurrentStep('migrate');
        }
      } else {
        setError(result.error || 'Failed to detect legacy installations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during detection');
    } finally {
      setIsDetecting(false);
    }
  };

  /**
   * Migrates all detected legacy installations to manifest ID based versioning
   */
  const migrateToManifestIds = async () => {
    try {
      setIsMigrating(true);
      setError(null);
      setMigrationProgress({
        currentStep: 'Starting migration...',
        completedSteps: 0,
        totalSteps: 1
      });

      const result = await window.electronAPI.migration.migrateToManifestIds(managedEnvironmentPath);
      
      setMigrationResult(result);
      
      if (result.success) {
        setCurrentStep('validate');
        await validateMigration();
      } else {
        setError(result.errors.join(', '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during migration');
    } finally {
      setIsMigrating(false);
      setMigrationProgress(null);
    }
  };

  /**
   * Validates that migration completed successfully
   */
  const validateMigration = async () => {
    try {
      setIsValidating(true);
      setError(null);

      const result = await window.electronAPI.migration.validateMigration(managedEnvironmentPath);
      
      setValidationResult(result);
      
      if (result.valid) {
        setCurrentStep('complete');
        if (onMigrationComplete && migrationResult) {
          onMigrationComplete(migrationResult);
        }
      } else {
        setError(`Migration validation failed: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during validation');
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Rolls back a failed migration
   */
  const rollbackMigration = async () => {
    try {
      setIsRollingBack(true);
      setError(null);

      const result = await window.electronAPI.migration.rollbackMigration(managedEnvironmentPath);
      
      if (result.success) {
        setCurrentStep('detect');
        setLegacyInstallations([]);
        setMigrationResult(null);
        setValidationResult(null);
        await detectLegacyInstallations();
      } else {
        setError(`Rollback failed: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during rollback');
    } finally {
      setIsRollingBack(false);
    }
  };

  /**
   * Handles dialog close with confirmation if migration is in progress
   */
  const handleClose = () => {
    if (isMigrating || isValidating || isRollingBack) {
      if (window.confirm('Migration is in progress. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Version Migration</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isMigrating || isValidating || isRollingBack}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Step 1: Detection */}
          {currentStep === 'detect' && (
            <div className="space-y-6">
              <div className="text-center">
                <Info className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Detect Legacy Installations
                </h3>
                <p className="text-gray-400 mb-6">
                  This will scan your managed environment for installations using the old build ID based naming convention.
                </p>
                <button
                  onClick={detectLegacyInstallations}
                  disabled={isDetecting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
                >
                  {isDetecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Detecting...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Detect Legacy Installations</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Migration */}
          {currentStep === 'migrate' && (
            <div className="space-y-6">
              <div className="text-center">
                <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Migrate to Manifest ID Versioning
                </h3>
                <p className="text-gray-400 mb-6">
                  Found {legacyInstallations.length} legacy installation(s) that need to be migrated.
                </p>
              </div>

              {/* Legacy Installations List */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Legacy Installations Found:</h4>
                <div className="space-y-2">
                  {legacyInstallations.map((installation, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-700 rounded p-3">
                      <div>
                        <div className="text-white font-medium">
                          {installation.branchName} - Build {installation.buildId}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {installation.manifestId ? `Manifest ID: ${installation.manifestId}` : 'No manifest ID available'}
                        </div>
                      </div>
                      <div className="text-gray-400 text-sm">
                        {installation.manifestId ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Migration Progress */}
              {migrationProgress && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Migration Progress</h4>
                  <div className="space-y-2">
                    <div className="text-gray-400 text-sm">{migrationProgress.currentStep}</div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(migrationProgress.completedSteps / migrationProgress.totalSteps) * 100}%`
                        }}
                      />
                    </div>
                    <div className="text-gray-400 text-sm text-center">
                      {migrationProgress.completedSteps} / {migrationProgress.totalSteps}
                    </div>
                  </div>
                </div>
              )}

              {/* Migration Note */}
              <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-blue-400">
                  <Info className="w-5 h-5" />
                  <span className="font-medium">Migration Note</span>
                </div>
                <div className="text-blue-300 mt-2 text-sm">
                  Only installations with a resolved manifest ID will be migrated. Others can be retried after resolving Steam library detection.
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={migrateToManifestIds}
                  disabled={isMigrating || legacyInstallations.every(i => !i.manifestId)}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  {isMigrating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Migrating...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Start Migration</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Validation */}
          {currentStep === 'validate' && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Migration Complete
                </h3>
                <p className="text-gray-400 mb-6">
                  Migration has been completed. Validating the results...
                </p>
              </div>

              {validationResult && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Validation Results</h4>
                  {validationResult.valid ? (
                    <div className="text-green-400 flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>Migration validation passed successfully</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-red-400 flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Migration validation failed</span>
                      </div>
                      <div className="text-gray-400 text-sm">
                        <ul className="list-disc list-inside space-y-1">
                          {validationResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-center space-x-4">
                <button
                  onClick={rollbackMigration}
                  disabled={isRollingBack}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  {isRollingBack ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Rolling Back...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Rollback Migration</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 'complete' && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Migration Complete
                </h3>
                <p className="text-gray-400 mb-6">
                  {legacyInstallations.length === 0 
                    ? 'No legacy installations found. Your environment is already using manifest ID based versioning.'
                    : 'All legacy installations have been successfully migrated to manifest ID based versioning.'
                  }
                </p>
              </div>

              {migrationResult && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Migration Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-green-400">
                      <div className="font-medium">Successful:</div>
                      <div>{migrationResult.migratedInstallations.length} installations</div>
                    </div>
                    <div className="text-red-400">
                      <div className="font-medium">Failed:</div>
                      <div>{migrationResult.failedInstallations.length} installations</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={onClose}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-900 border border-red-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Error</span>
              </div>
              <div className="text-red-300 mt-2">{error}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
