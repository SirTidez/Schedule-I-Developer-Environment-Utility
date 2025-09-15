/**
 * Failure Dialog Component for Schedule I Developer Environment Utility
 * 
 * A specialized dialog component for displaying operation failures with
 * detailed error information and multiple action options. Provides users
 * with retry, skip, and cancel options along with access to log files.
 * 
 * Key features:
 * - Modal overlay with error display
 * - Detailed error information in scrollable area
 * - Multiple action buttons (Retry, Skip, Cancel)
 * - Optional log file access buttons
 * - Responsive design with proper error formatting
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.2.0
 */

import React from 'react';

/**
 * Props interface for the FailureDialog component
 * 
 * @interface FailureDialogProps
 */
interface FailureDialogProps {
  /** Whether the dialog is currently open/visible */
  isOpen: boolean;
  /** Optional dialog title (defaults to 'Operation Failed') */
  title?: string;
  /** The main error message to display */
  message: string;
  /** Optional detailed error information for debugging */
  details?: string;
  /** Callback function called when retry button is clicked */
  onRetry: () => void;
  /** Callback function called when skip button is clicked */
  onSkip: () => void;
  /** Callback function called when cancel button is clicked */
  onCancel: () => void;
  /** Optional callback function for opening logs folder */
  onOpenLogs?: () => void;
  /** Optional callback function for copying log path to clipboard */
  onCopyLogPath?: () => void;
}

/**
 * Failure Dialog component
 * 
 * Renders a modal failure dialog with error details and action options.
 * Only renders when isOpen is true, otherwise returns null.
 * 
 * @param props - Component props
 * @returns JSX element containing the failure dialog or null
 */
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
