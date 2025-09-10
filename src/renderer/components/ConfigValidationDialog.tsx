import React from 'react';

interface ConfigValidationDialogProps {
  isOpen: boolean;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  onClose: () => void;
  onContinue: () => void;
}

export const ConfigValidationDialog: React.FC<ConfigValidationDialogProps> = ({
  isOpen,
  validation,
  onClose,
  onContinue
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center mb-4">
          <div className={`w-4 h-4 rounded-full mr-3 ${
            validation.isValid ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <h2 className="text-xl font-semibold text-white">
            Configuration Validation
          </h2>
        </div>

        <div className="mb-6">
          {validation.isValid ? (
            <div className="text-green-400 mb-4">
              ✓ Configuration is valid and ready to use.
            </div>
          ) : (
            <div className="text-red-400 mb-4">
              ✗ Configuration has errors that need to be fixed.
            </div>
          )}

          {validation.errors.length > 0 && (
            <div className="mb-4">
              <h3 className="text-red-400 font-semibold mb-2">Errors:</h3>
              <ul className="list-disc list-inside text-red-300 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="mb-4">
              <h3 className="text-yellow-400 font-semibold mb-2">Warnings:</h3>
              <ul className="list-disc list-inside text-yellow-300 space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
          {validation.isValid && (
            <button
              onClick={onContinue}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
