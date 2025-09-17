/**
 * Update Manager Component
 * 
 * Provides a comprehensive UI for managing application updates including
 * checking for updates, downloading, and installing with progress tracking.
 */

import React from 'react';
import { useAutoUpdater, UpdateStatus } from '../hooks/useAutoUpdater';
import { Download, CheckCircle, AlertCircle, RefreshCw, Play } from 'lucide-react';

interface UpdateManagerProps {
  className?: string;
}

export function UpdateManager({ className = '' }: UpdateManagerProps) {
  const { status, checkForUpdates, downloadUpdate, installUpdate, isLoading, error } = useAutoUpdater();

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const getStatusIcon = (status: UpdateStatus['status']) => {
    switch (status) {
      case 'checking':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'available':
        return <Download className="w-4 h-4 text-blue-500" />;
      case 'downloading':
        return <Download className="w-4 h-4 animate-pulse text-blue-500" />;
      case 'downloaded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: UpdateStatus['status']) => {
    switch (status) {
      case 'checking':
        return 'Checking for updates...';
      case 'available':
        return 'Update available';
      case 'downloading':
        return 'Downloading update...';
      case 'downloaded':
        return 'Update ready to install';
      case 'error':
        return 'Update error';
      case 'not-available':
        return 'Up to date';
      default:
        return 'Unknown status';
    }
  };

  const renderProgressBar = () => {
    if (status.status !== 'downloading' || !status.progress) return null;

    return (
      <div className="w-full">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{status.progress.percent}%</span>
          <span>{formatSpeed(status.progress.bytesPerSecond)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${status.progress.percent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatBytes(status.progress.transferred)}</span>
          <span>{formatBytes(status.progress.total)}</span>
        </div>
      </div>
    );
  };

  const renderUpdateInfo = () => {
    if (!status.updateInfo || !status.updateInfo.hasUpdate) return null;

    return (
      <div className="text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Current: {status.updateInfo.currentVersion}</span>
          <span>Latest: {status.updateInfo.latestVersion}</span>
        </div>
      </div>
    );
  };

  const renderActionButton = () => {
    if (isLoading) {
      return (
        <button
          disabled
          className="px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4 animate-spin" />
          {status.status === 'checking' ? 'Checking...' : 
           status.status === 'downloading' ? 'Downloading...' : 'Processing...'}
        </button>
      );
    }

    switch (status.status) {
      case 'not-available':
        return (
          <button
            onClick={checkForUpdates}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Check for Updates
          </button>
        );
      case 'available':
        return (
          <button
            onClick={downloadUpdate}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Update
          </button>
        );
      case 'downloaded':
        return (
          <button
            onClick={installUpdate}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Install & Restart
          </button>
        );
      case 'error':
        return (
          <button
            onClick={checkForUpdates}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getStatusIcon(status.status)}
          <h3 className="text-lg font-semibold text-gray-800">
            {getStatusText(status.status)}
          </h3>
        </div>
        {renderActionButton()}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      {renderUpdateInfo()}
      {renderProgressBar()}

      {status.status === 'downloading' && status.progress && (
        <div className="mt-2 text-xs text-gray-500">
          Estimated time remaining: {Math.round((status.progress.total - status.progress.transferred) / status.progress.bytesPerSecond)}s
        </div>
      )}
    </div>
  );
}
