import React from 'react';

interface FailureDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  details?: string;
  onRetry: () => void;
  onSkip: () => void;
  onCancel: () => void;
  onOpenLogs?: () => void;
  onCopyLogPath?: () => void;
}

const FailureDialog: React.FC<FailureDialogProps> = ({
  isOpen,
  title = 'Operation Failed',
  message,
  details,
  onRetry,
  onSkip,
  onCancel,
  onOpenLogs,
  onCopyLogPath
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 border border-gray-700">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-gray-300 mb-4">{message}</p>
          {details && (
            <div className="bg-gray-900/40 border border-gray-700 rounded p-3 text-left mb-4 max-h-48 overflow-auto">
              <pre className="text-xs text-gray-400 whitespace-pre-wrap">{details}</pre>
            </div>
          )}
          <div className="flex space-x-3">
            <button onClick={onRetry} className="flex-1 btn-primary">Retry</button>
            <button onClick={onSkip} className="flex-1 btn-secondary">Skip</button>
            <button onClick={onCancel} className="flex-1 btn-secondary">Cancel Setup</button>
          </div>
          {(onOpenLogs || onCopyLogPath) && (
            <div className="flex justify-center space-x-4 mt-3">
              {onOpenLogs && (
                <button onClick={onOpenLogs} className="text-xs text-blue-300 hover:text-blue-200">Open logs folder</button>
              )}
              {onCopyLogPath && (
                <button onClick={onCopyLogPath} className="text-xs text-blue-300 hover:text-blue-200">Copy log path</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FailureDialog;
