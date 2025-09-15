/**
 * Confirm Dialog Component for Schedule I Developer Environment Utility
 * 
 * A reusable confirmation dialog component that displays a modal with
 * customizable title, message, and action buttons. Used throughout the
 * application for user confirmations before destructive actions.
 * 
 * Key features:
 * - Modal overlay with backdrop
 * - Customizable title and message
 * - Customizable button text
 * - Callback handlers for confirm/cancel actions
 * - Responsive design with proper z-index layering
 * 
 * @author Schedule I Developer Environment Utility Team
 * @version 2.2.0
 */

import React from 'react';

/**
 * Props interface for the ConfirmDialog component
 * 
 * @interface ConfirmDialogProps
 */
interface ConfirmDialogProps {
  /** Whether the dialog is currently open/visible */
  isOpen: boolean;
  /** Optional dialog title (defaults to 'Please Confirm') */
  title?: string;
  /** The confirmation message to display */
  message: string;
  /** Optional confirm button text (defaults to 'Continue') */
  confirmText?: string;
  /** Optional cancel button text (defaults to 'Cancel') */
  cancelText?: string;
  /** Callback function called when confirm button is clicked */
  onConfirm: () => void;
  /** Callback function called when cancel button is clicked */
  onCancel: () => void;
}

/**
 * Confirm Dialog component
 * 
 * Renders a modal confirmation dialog with customizable content and actions.
 * Only renders when isOpen is true, otherwise returns null.
 * 
 * @param props - Component props
 * @returns JSX element containing the confirmation dialog or null
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Please Confirm',
  message,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
        <p className="text-gray-300 mb-4 text-center">{message}</p>
        <div className="flex space-x-3">
          <button onClick={onConfirm} className="flex-1 btn-primary">{confirmText}</button>
          <button onClick={onCancel} className="flex-1 btn-secondary">{cancelText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

