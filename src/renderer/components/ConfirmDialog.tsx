import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

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

