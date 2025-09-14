import React, { useState, useEffect } from 'react';
import { useUpdateService } from '../../hooks/useUpdateService';

interface CustomTitleBarProps {
  title?: string;
}

export const CustomTitleBar: React.FC<CustomTitleBarProps> = ({ title = "Schedule I Developer Environment" }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { currentVersion, getCurrentVersion } = useUpdateService();

  useEffect(() => {
    // Check initial maximized state
    const checkMaximized = async () => {
      try {
        const maximized = await window.electronAPI.window.isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error('Failed to check window state:', error);
      }
    };

    checkMaximized();
    // Ensure version is loaded for the title bar
    getCurrentVersion().catch(() => {/* non-fatal */});

    // Listen for window state changes
    const handleResize = () => {
      checkMaximized();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMinimize = async () => {
    try {
      await window.electronAPI.window.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await window.electronAPI.window.toggleMaximize();
      // Update state after a short delay to allow the window to update
      setTimeout(async () => {
        const maximized = await window.electronAPI.window.isMaximized();
        setIsMaximized(maximized);
      }, 100);
    } catch (error) {
      console.error('Failed to toggle maximize window:', error);
    }
  };

  const handleClose = async () => {
    try {
      await window.electronAPI.window.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  return (
    <div 
      className="flex items-center justify-between bg-gray-800 text-white px-4 py-2 h-8 select-none"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Title */}
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
        <span className="text-sm font-medium">{title}</span>
        {currentVersion && (
          <span className="text-xs text-gray-300">v{currentVersion}</span>
        )}
      </div>

      {/* Window Controls */}
      <div className="flex items-center space-x-1" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Minimize Button */}
        <button
          onClick={handleMinimize}
          className="w-8 h-6 flex items-center justify-center hover:bg-gray-700 rounded transition-colors"
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>

        {/* Maximize/Restore Button */}
        <button
          onClick={handleToggleMaximize}
          className="w-8 h-6 flex items-center justify-center hover:bg-gray-700 rounded transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            // Restore icon (two overlapping squares)
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1" y="1" width="6" height="6" stroke="currentColor" strokeWidth="0.5" fill="none" />
              <rect x="3" y="3" width="6" height="6" stroke="currentColor" strokeWidth="0.5" fill="none" />
            </svg>
          ) : (
            // Maximize icon (single square)
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1" y="1" width="8" height="8" stroke="currentColor" strokeWidth="0.5" fill="none" />
            </svg>
          )}
        </button>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="w-8 h-6 flex items-center justify-center hover:bg-red-600 rounded transition-colors"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </button>
      </div>
    </div>
  );
};
