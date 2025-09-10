import { useState, useEffect } from 'react';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  release?: {
    tag_name: string;
    name: string;
    body: string;
    published_at: string;
    html_url: string;
    assets: Array<{
      name: string;
      browser_download_url: string;
      size: number;
    }>;
  };
}

export const useUpdateService = () => {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const getCurrentVersion = async (): Promise<string> => {
    try {
      const version = await window.electronAPI.update.getCurrentVersion();
      setCurrentVersion(version);
      return version;
    } catch (error) {
      console.error('Failed to get current version:', error);
      return '';
    }
  };

  const checkForUpdates = async (): Promise<UpdateInfo> => {
    setIsChecking(true);
    try {
      const info = await window.electronAPI.update.checkForUpdates();
      setUpdateInfo(info);
      return info;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      throw error;
    } finally {
      setIsChecking(false);
    }
  };

  const getReleaseNotes = async (release: any): Promise<string> => {
    try {
      return await window.electronAPI.update.getReleaseNotes(release);
    } catch (error) {
      console.error('Failed to get release notes:', error);
      return 'Failed to load release notes.';
    }
  };

  // Load current version on mount
  useEffect(() => {
    getCurrentVersion();
  }, []);

  return {
    currentVersion,
    updateInfo,
    isChecking,
    getCurrentVersion,
    checkForUpdates,
    getReleaseNotes
  };
};
