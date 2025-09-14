import React, { useState, useEffect, useRef } from 'react';
import { useFileService } from '../../../hooks/useFileService';
import { useSteamService } from '../../../hooks/useSteamService';
import BranchVerificationDialog from '../../BranchVerificationDialog';
import TerminalOutput from '../../TerminalOutput';
import FailureDialog from '../../FailureDialog';
import ConfirmDialog from '../../ConfirmDialog';

interface CopyProgressStepProps {
  steamLibraryPath: string;
  managedEnvironmentPath: string;
  selectedBranches: string[];
  onComplete: () => void;
  useDepotDownloader?: boolean;
  depotDownloaderPath?: string | null;
  steamCredentials?: { username: string; password: string; stayLoggedIn: boolean } | null;
}

const CopyProgressStep: React.FC<CopyProgressStepProps> = ({
  steamLibraryPath,
  managedEnvironmentPath,
  selectedBranches,
  onComplete,
  useDepotDownloader = false,
  depotDownloaderPath = null,
  steamCredentials = null
}) => {
  const { copyGameFiles, createDirectory, loading, error, progress } = useFileService();
  const { getBranchBuildId } = useSteamService();
  const { verifyBranchInstalled } = useSteamService();
  
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [completedBranches, setCompletedBranches] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [currentBranchIndex, setCurrentBranchIndex] = useState(0);
  const [copyStatus, setCopyStatus] = useState<'waiting' | 'verifying' | 'copying' | 'completed'>('waiting');
  const [verificationResolve, setVerificationResolve] = useState<(() => void) | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [branchProgress, setBranchProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [filesCopied, setFilesCopied] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [downloadMethod, setDownloadMethod] = useState<'copy' | 'depotdownloader'>('copy');
  const cancelledRef = useRef(false);
  const [effectiveCreds, setEffectiveCreds] = useState<null | { username: string; password: string; stayLoggedIn: boolean }>(steamCredentials);
  const [branchLogLines, setBranchLogLines] = useState<string[]>([]);
  const [branchLogStart, setBranchLogStart] = useState<Date | null>(null);
  const [sessionLogLines, setSessionLogLines] = useState<string[]>([]);
  const [sessionLogPath, setSessionLogPath] = useState<string | null>(null);
  const [lastBranchLogPath, setLastBranchLogPath] = useState<string | null>(null);
  const [failureOpen, setFailureOpen] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string>('');
  const [failureDetails, setFailureDetails] = useState<string>('');
  const [failureResolve, setFailureResolve] = useState<((decision: 'retry'|'skip'|'cancel') => void) | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmResolve, setConfirmResolve] = useState<((ok: boolean) => void) | null>(null);

  // Branch display names mapping
  const branchDisplayNames: Record<string, string> = {
    'main-branch': 'Main',
    'beta-branch': 'Beta',
    'alternate-branch': 'Alternative',
    'alternate-beta-branch': 'Alternative Beta'
  };

  // Pull cached Steam credentials if not provided
  useEffect(() => {
    (async () => {
      if (!steamCredentials) {
        try {
          const res = await window.electronAPI?.credCache?.get?.();
          if (res?.success && res.credentials) {
            setEffectiveCreds({ username: res.credentials.username, password: res.credentials.password, stayLoggedIn: false });
            addTerminalLog('Using cached Steam credentials for DepotDownloader');
          }
        } catch {}
      } else {
        setEffectiveCreds(steamCredentials);
      }
    })();
  }, [steamCredentials]);

  // Ensure we only start once, and only when prerequisites are satisfied
  const startedRef = useRef(false);
  useEffect(() => {
    if (!steamLibraryPath || !managedEnvironmentPath || selectedBranches.length === 0) return;

    // If DepotDownloader is desired, wait until we have credentials
    const readyForDepotDownloader = useDepotDownloader && !!effectiveCreds;
    const shouldStart = useDepotDownloader ? readyForDepotDownloader : true;
    if (!shouldStart) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const method: 'copy' | 'depotdownloader' = useDepotDownloader ? 'depotdownloader' : 'copy';
    setDownloadMethod(method);
    addTerminalLog(method === 'depotdownloader' ? 'Using DepotDownloader for branch downloads' : 'Using manual file copying');
    startCopyProcess(method);
  }, [steamLibraryPath, managedEnvironmentPath, selectedBranches, useDepotDownloader, depotDownloaderPath, effectiveCreds]);

  useEffect(() => {
    // Set up progress event listener
    const handleProgress = (progress: any) => {
      setBranchProgress(progress.progress);
      setCurrentFile(progress.currentFile);
      setFilesCopied(progress.completedFiles);
      setTotalFiles(progress.totalFiles);
      
      // Add to terminal logs
      if (progress.currentFile && progress.currentFile !== 'Complete') {
        addTerminalLog(`Copying: ${progress.currentFile}`);
      } else if (progress.currentFile === 'Complete') {
        addTerminalLog(`✓ Completed copying ${progress.totalFiles} files`);
      }
    };

    window.electronAPI.onFileCopyProgress(handleProgress);

    return () => {
      window.electronAPI.removeFileCopyProgressListener();
    };
  }, []);

  // DepotDownloader output listener (terminal feed)
  useEffect(() => {
    const onDepotDownloader = (evt: any) => {
      if (!evt) return;
      if (evt.type === 'percent' && typeof evt.value === 'number') {
        setBranchProgress(prev => (evt.value > prev ? evt.value : prev));
        return;
      }
      if (evt.type === 'steam-guard' && evt.message) {
        addTerminalLog(`[DepotDownloader] ${evt.message}`);
        return;
      }
      if (evt.data) {
        const raw = String(evt.data);
        const lines = raw.replace(/\r/g, '\n').split(/\n/);
        for (const ln of lines) {
          const line = ln.trim();
          if (!line) continue;
          const sanitized = line.replace(/\x1b\[[0-9;]*m/g, '');
          addTerminalLog(`[DepotDownloader] ${sanitized}`);

          // Parse percentage from sanitized text
          let parsedPercent: number | null = null;
          const percentMatch = sanitized.match(/\((\d+(?:\.\d+)?)%\)/);
          if (percentMatch) parsedPercent = parseFloat(percentMatch[1]);
          if (parsedPercent == null) {
            const startPercent = sanitized.match(/^\s*(\d{1,3}(?:\.\d{1,2})?)%(?:\s|$)/);
            if (startPercent) parsedPercent = parseFloat(startPercent[1]);
            else {
              const anyPercent = sanitized.match(/(\d+(?:\.\d+)?)%/);
              if (anyPercent) parsedPercent = parseFloat(anyPercent[1]);
            }
          }
          if (!parsedPercent) {
            const depotMatch = sanitized.match(/Downloading depot (\d+) of (\d+)/);
            if (depotMatch) {
              const current = parseInt(depotMatch[1]);
              const total = parseInt(depotMatch[2]);
              if (total > 0) parsedPercent = Math.max(0, Math.min(100, (current / total) * 100));
            }
          }
          if (/download.*complete|all.*depot.*downloaded/i.test(sanitized) || /total downloaded:/i.test(sanitized) || /^\s*100%(?:\s|$)/.test(sanitized)) parsedPercent = 100;

          if (typeof parsedPercent === 'number' && !Number.isNaN(parsedPercent)) {
            const clamped = Math.max(0, Math.min(100, parsedPercent));
            setBranchProgress(prev => (clamped > prev ? clamped : prev));
          }
        }
      }
    };
    window.electronAPI.onDepotDownloaderProgress(onDepotDownloader);
    return () => {
      window.electronAPI.removeDepotDownloaderProgressListener();
    };
  }, []);
/*
      if (evt.type === 'percent' && typeof evt.value === 'number') {
        setBranchProgress(prev => (evt.value > prev ? evt.value : prev));
        return;
      }
      if (evt.type === 'steam-guard' && evt.message) {
        addTerminalLog(`[DepotDownloader] ${evt.message}`);
        return;
      }
      if (evt.data) {
        const raw = String(evt.data);
        // Normalize carriage returns and split
        const lines = raw.replace(/\r/g, '\n').split(/\n/);
        for (const ln of lines) {
          const line = ln.trim();
          if (!line) continue;
          // Strip ANSI color codes before parsing
          const sanitized = line.replace(/\x1b\[[0-9;]*m/g, '');
          addTerminalLog(`[DepotDownloader] ${sanitized}`);

          // Try to parse percentage from DepotDownloader output formats
          // Examples:
          // - "Downloaded X MB / Y MB (Z%)"
          // - "Downloading depot X of Y"
          // - Completion messages
          let parsedPercent: number | null = null;

          // Look for explicit percentage in parentheses
          const percentMatch = sanitized.match(/\((\d+(?:\.\d+)?)%\)/);
          if (percentMatch) { parsedPercent = parseFloat(percentMatch[1]); }

          // Fallback: start-of-line or any standalone percentage in the line (e.g., "12.34% path")
          if (parsedPercent == null) {
            const startPercent = sanitized.match(/^\s*(\d{1,3}(?:\.\d{1,2})?)%(?:\s|$)/);
            if (startPercent) { parsedPercent = parseFloat(startPercent[1]); }
            else {
              const anyPercent = sanitized.match(/(\d+(?:\.\d+)?)%/);
              if (anyPercent) { parsedPercent = parseFloat(anyPercent[1]); }
            }
          }

          // Look for depot progress indicators
          if (!parsedPercent) {
            const depotMatch = sanitized.match(/Downloading depot (\d+) of (\d+)/);
            if (depotMatch) {
              const current = parseInt(depotMatch[1]);
              const total = parseInt(depotMatch[2]);
              if (total > 0) { parsedPercent = Math.max(0, Math.min(100, (current / total) * 100)); }
            }
          }

          // Check for completion messages
          if (/download.*complete|all.*depot.*downloaded/i.test(sanitized) || /total downloaded:/i.test(sanitized) || /^\s*100%(?:\s|$)/.test(sanitized)) { parsedPercent = 100; }

          if (typeof parsedPercent === 'number' && !Number.isNaN(parsedPercent)) {
            const clamped = Math.max(0, Math.min(100, parsedPercent));
            // Only move forward
            setBranchProgress(prev => (clamped > prev ? clamped : prev));
          }
        }
      }
    };
    window.electronAPI.onDepotDownloaderProgress(onDepotDownloader);
    return () => {
      window.electronAPI.removeDepotDownloaderProgressListener();
    };
  }, []);

*/
  const addTerminalLog = (message: string) => {
    setTerminalLogs(prev => [...prev, message]);
    setBranchLogLines(prev => [...prev, message]);
  };

  const openBranchLog = (branch: string, method: 'copy'|'depotdownloader') => {
    const now = new Date();
    setBranchLogStart(now);
    const header = [
      `=== Schedule I Setup Log ===`,
      `Branch: ${branchDisplayNames[branch] || branch}`,
      `Method: ${method}`,
      `Start: ${now.toISOString()}`,
      `----------------------------------------`
    ];
    setBranchLogLines(header);
  };

  const writeBranchLog = async (branch: string, status: 'success'|'failure'|'cancel' = 'success') => {
    const start = branchLogStart || new Date();
    const end = new Date();
    const lines = [
      ...branchLogLines,
      `----------------------------------------`,
      `End: ${end.toISOString()}`,
      `Status: ${status}`
    ];
    const ts = end.toISOString().replace(/[:.]/g, '-');
    const filePath = `${managedEnvironmentPath}/logs/${branch}-${ts}.log`;
    try {
      await window.electronAPI.file.writeText(filePath, lines.join('\n'));
      setBranchLogLines([]);
      setLastBranchLogPath(filePath);
    } catch (e) {
      console.error('Failed to write branch log:', e);
    }
  };

  const openSessionLog = async () => {
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-');
    const filePath = `${managedEnvironmentPath}/logs/session-${ts}.log`;
    const header = [
      '=== Schedule I Setup Session ===',
      `Started: ${now.toISOString()}`,
      `Method: ${downloadMethod}`,
      `Branches: ${selectedBranches.join(', ')}`,
      '----------------------------------------'
    ];
    setSessionLogLines(header);
    setSessionLogPath(filePath);
    await window.electronAPI.file.writeText(filePath, header.join('\n'));
  };

  const appendSessionLog = async (line: string) => {
    try {
      if (!sessionLogPath) return;
      const updated = [...sessionLogLines, line];
      setSessionLogLines(updated);
      await window.electronAPI.file.writeText(sessionLogPath, updated.join('\n'));
    } catch (e) {
      console.error('Failed to append session log:', e);
    }
  };

  const closeSessionLog = async (status: 'completed'|'cancelled'|'failed' = 'completed') => {
    try {
      const end = new Date();
      await appendSessionLog('----------------------------------------');
      await appendSessionLog(`Ended: ${end.toISOString()}`);
      await appendSessionLog(`Status: ${status}`);
    } catch {}
  };

  const cleanupLogRetention = async () => {
    try {
      const cfg = await window.electronAPI.config.get();
      const retention = Math.max(1, Number(cfg?.logRetentionCount ?? 50));
      const logDir = `${managedEnvironmentPath}/logs`;
      const files = await window.electronAPI.file.listFiles(logDir);
      const logFiles = files.filter(f => f.isFile && f.name.toLowerCase().endsWith('.log'))
                            .sort((a,b) => b.mtimeMs - a.mtimeMs);
      if (logFiles.length > retention) {
        const toDelete = logFiles.slice(retention);
        for (const f of toDelete) {
          try { await window.electronAPI.file.deleteFile(f.path); } catch {}
        }
      }
    } catch (e) {
      console.error('Log retention cleanup failed:', e);
    }
  };

  const showFailureDialog = (message: string, details?: string): Promise<'retry'|'skip'|'cancel'> => {
    setFailureMessage(message);
    setFailureDetails(details || '');
    setFailureOpen(true);
    return new Promise((resolve) => {
      setFailureResolve(() => resolve);
    });
  };

  const showConfirmDialog = (message: string): Promise<boolean> => {
    setConfirmMessage(message);
    setConfirmOpen(true);
    return new Promise((resolve) => setConfirmResolve(() => resolve));
  };

  const createConfigFile = async () => {
    try {
      const config = {
        steamLibraryPath: steamLibraryPath,
        gameInstallPath: `${steamLibraryPath}/common/Schedule I`,
        managedEnvironmentPath: managedEnvironmentPath,
        selectedBranches: selectedBranches,
        installedBranch: selectedBranches[0], // First branch is the currently installed one
        branchBuildIds: {},
        customLaunchCommands: {},
        lastUpdated: new Date().toISOString(),
        configVersion: '3.0'
      };

      // Update config through the service
      await window.electronAPI.config.update(config);
    } catch (error) {
      console.error('Failed to create config file:', error);
      addTerminalLog(`✗ Error creating config file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const startCopyProcess = async (method: 'copy' | 'depotdownloader') => {
    try {
      console.log('Starting copy process...');
      console.log('Steam Library Path:', steamLibraryPath);
      console.log('Managed Environment Path:', managedEnvironmentPath);
      console.log('Selected Branches:', selectedBranches);

      // Disk space pre-check
      try {
        const cfg = await window.electronAPI.config.get();
        const thresholdGB = Number(cfg?.diskSpaceThresholdGB ?? 10);
        const disk = await window.electronAPI.system.getFreeSpace(managedEnvironmentPath);
        if (disk?.success && typeof disk.freeBytes === 'number') {
          const freeGB = disk.freeBytes / (1024 ** 3);
          addTerminalLog(`Free space on ${disk.drive ?? '?'}: ${freeGB.toFixed(2)} GB`);
          if (freeGB < thresholdGB) {
            const proceed = await showConfirmDialog(`Only ${freeGB.toFixed(2)} GB free; recommended minimum is ${thresholdGB} GB. Continue anyway?`);
            if (!proceed) {
              addTerminalLog('Operation cancelled due to low disk space.');
              await closeSessionLog('cancelled');
              setIsComplete(true);
              setCopyStatus('completed');
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Disk space check failed:', e);
      }

      // Create the main managed environment directory
      await createDirectory(managedEnvironmentPath);
      await createDirectory(`${managedEnvironmentPath}/branches`);
      
      // Create all branch directories upfront
      addTerminalLog('Creating directory structure...');
      for (const branch of selectedBranches) {
        const branchPath = `${managedEnvironmentPath}/branches/${branch}`;
        await createDirectory(branchPath);
        addTerminalLog(`Created directory: ${branchPath}`);
      }
      
      // Create additional required directories
      await createDirectory(`${managedEnvironmentPath}/logs`);
      addTerminalLog(`Created directory: ${managedEnvironmentPath}/logs`);
      await openSessionLog();
      await cleanupLogRetention();
      
      await createDirectory(`${managedEnvironmentPath}/temp`);
      addTerminalLog(`Created directory: ${managedEnvironmentPath}/temp`);
      
      // Create Default Mods runtime-specific structure
      const defaultModsPath = `${managedEnvironmentPath}/Default Mods`;
      await createDirectory(defaultModsPath);
      addTerminalLog(`Created directory: ${defaultModsPath}`);
      
      // Il2Cpp runtime directories (for main-branch and beta-branch)
      await createDirectory(`${defaultModsPath}/Il2Cpp/Mods`);
      addTerminalLog(`Created directory: ${defaultModsPath}/Il2Cpp/Mods`);
      
      await createDirectory(`${defaultModsPath}/Il2Cpp/Plugins`);
      addTerminalLog(`Created directory: ${defaultModsPath}/Il2Cpp/Plugins`);
      
      // Mono runtime directories (for alternate-branch and alternate-beta-branch)
      await createDirectory(`${defaultModsPath}/Mono/Mods`);
      addTerminalLog(`Created directory: ${defaultModsPath}/Mono/Mods`);
      
      await createDirectory(`${defaultModsPath}/Mono/Plugins`);
      addTerminalLog(`Created directory: ${defaultModsPath}/Mono/Plugins`);
      
      addTerminalLog('✓ Complete directory structure created');

      // Create configuration file
      addTerminalLog('Creating configuration file...');
      await createConfigFile();
      addTerminalLog('✓ Configuration file created');

      // Process each branch (verification only for copy-based flow)
      for (let i = 0; i < selectedBranches.length; i++) {
        if (cancelledRef.current) {
          await closeSessionLog('cancelled');
          setIsComplete(true);
          setCopyStatus('completed');
          return;
        }
        const branch = selectedBranches[i];
        setCurrentBranch(branch);
        setCurrentBranchIndex(i);
        
        console.log(`Processing branch: ${branch}`);
        
        // Calculate overall progress
        const branchProgress = ((i + 1) / selectedBranches.length) * 100;
        setOverallProgress(branchProgress);

        // For DepotDownloader flow: process all branches directly (no verification)
        if (method === 'depotdownloader') {
          // Reset per-branch progress UI
          setBranchProgress(0);
          setCurrentFile('');
          setFilesCopied(0);
          setTotalFiles(0);
          setCopyStatus('copying');
          let proceed = false;
          do {
            try {
              openBranchLog(branch, 'depotdownloader');
              await downloadBranchWithDepotDownloader(branch);
              await writeBranchLog(branch, 'success');
              await appendSessionLog(`[${new Date().toISOString()}] Downloaded ${branchDisplayNames[branch] || branch}: success`);
              // Delay between branches to avoid auth/rate limits
              await new Promise(res => setTimeout(res, 5000));
              proceed = true;
            } catch (e) {
              if (cancelledRef.current) {
                await writeBranchLog(branch, 'cancel');
                await appendSessionLog(`[${new Date().toISOString()}] Downloaded ${branchDisplayNames[branch] || branch}: cancelled`);
                await closeSessionLog('cancelled');
                setIsComplete(true);
                setCopyStatus('completed');
                return;
              }
              const errMsg = e instanceof Error ? e.message : String(e);
              await writeBranchLog(branch, 'failure');
              await appendSessionLog(`[${new Date().toISOString()}] Downloaded ${branchDisplayNames[branch] || branch}: failure - ${errMsg}`);
              const decision = await showFailureDialog(`Failed to download ${branchDisplayNames[branch] || branch}`, errMsg);
              if (decision === 'retry') {
                proceed = false;
              } else if (decision === 'skip') {
                proceed = true; // proceed to next branch
              } else {
                // cancel setup
                await writeBranchLog(branch, 'cancel');
                await closeSessionLog('cancelled');
                setIsComplete(true);
                setCopyStatus('completed');
                return;
              }
            }
          } while (!proceed);
          continue;
        }

        // Copy-based flow
        if (i === 0) {
          // Skip verification for the first branch (currently installed)
          console.log(`Skipping verification for first branch: ${branch}`);
          setCopyStatus('copying');
          let proceed = false;
          do {
            try {
              openBranchLog(branch, 'copy');
              await copyBranchFiles(branch);
              await writeBranchLog(branch, 'success');
              await appendSessionLog(`[${new Date().toISOString()}] Copied ${branchDisplayNames[branch] || branch}: success`);
              proceed = true;
            } catch (e) {
              const errMsg = e instanceof Error ? e.message : String(e);
              await writeBranchLog(branch, 'failure');
              await appendSessionLog(`[${new Date().toISOString()}] Copied ${branchDisplayNames[branch] || branch}: failure - ${errMsg}`);
              const decision = await showFailureDialog(`Failed to copy ${branchDisplayNames[branch] || branch}`, errMsg);
              if (decision === 'retry') {
                proceed = false;
              } else if (decision === 'skip') {
                proceed = true; // proceed to next branch
              } else {
                await writeBranchLog(branch, 'cancel');
                await closeSessionLog('cancelled');
                setIsComplete(true);
                setCopyStatus('completed');
                return;
              }
            }
          } while (!proceed);
        } else {
          setCopyStatus('verifying');
          // Show verification dialog for this branch
          await showBranchVerification(branch);
        }
      }

      await closeSessionLog('completed');
      setIsComplete(true);
      setCopyStatus('completed');
      onComplete();
    } catch (err) {
      console.error('Copy process failed:', err);
    }
  };

  const showBranchVerification = (branch: string): Promise<void> => {
    return new Promise((resolve) => {
      setVerificationResolve(() => resolve);
      setShowVerificationDialog(true);
    });
  };

  const copyBranchFiles = async (branch: string) => {
    try {
      const branchPath = `${managedEnvironmentPath}/branches/${branch}`;
      const branchDisplayName = branchDisplayNames[branch] || branch;
      
      addTerminalLog(`Starting copy for ${branchDisplayName} branch...`);
      addTerminalLog(`Source: ${steamLibraryPath}/common/Schedule I`);
      addTerminalLog(`Destination: ${branchPath}`);

      // Get the current build ID for this branch
      addTerminalLog(`Getting build ID for ${branchDisplayName} branch...`);
      const buildId = await getBranchBuildId(steamLibraryPath, branch);
      if (buildId) {
        addTerminalLog(`Build ID for ${branchDisplayName}: ${buildId}`);
        // Save the build ID to the configuration
        await window.electronAPI.config.setBuildIdForBranch(branch, buildId);
        addTerminalLog(`✓ Saved build ID for ${branchDisplayName} branch`);
      } else {
        addTerminalLog(`⚠ Could not get build ID for ${branchDisplayName} branch`);
      }
      
      // Copy Steam app manifest into branch folder for drift checks
      try {
        const appId = await window.electronAPI.steam.getScheduleIAppId();
        if (appId) {
          addTerminalLog(`Copying Steam app manifest (app ${appId})...`);
          await window.electronAPI.file.copyManifest(appId, steamLibraryPath, branchPath);
          addTerminalLog(`� Copied appmanifest_${appId}.acf to branch folder`);
        }
      } catch (e) {
        addTerminalLog(`? Failed to copy Steam app manifest: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Construct proper game source path - steamLibraryPath is already the steamapps path
      const gameSourcePath = `${steamLibraryPath}/common/Schedule I`;
      
      addTerminalLog(`Discovering files in: ${gameSourcePath}`);
      
      await copyGameFiles(gameSourcePath, branchPath);
      setCompletedBranches(prev => [...prev, branch]);
      addTerminalLog(`✓ Successfully completed ${branchDisplayName} branch`);
      
    } catch (err) {
      const errorMsg = `Failed to copy branch ${branch}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(errorMsg);
      addTerminalLog(`✗ Error: ${errorMsg}`);
      throw err;
    }
  };

  const downloadBranchWithDepotDownloader = async (branch: string) => {
    try {
      if (!steamCredentials) {
        throw new Error('Credentials not available');
      }

      const branchPath = `${managedEnvironmentPath}/branches/${branch}`;
      const branchDisplayName = branchDisplayNames[branch] || branch;
      
      addTerminalLog(`Starting DepotDownloader download for ${branchDisplayName} branch...`);
      addTerminalLog(`DepotDownloader Path: ${depotDownloaderPath || 'PATH/alias'}`);
      addTerminalLog(`Username: ${effectiveCreds.username}`);
      addTerminalLog(`Destination: ${branchPath}`);

      // Get the Schedule I App ID
      const appId = await window.electronAPI.steam.getScheduleIAppId();
      if (!appId) {
        throw new Error('Could not get Schedule I App ID');
      }

      addTerminalLog(`App ID: ${appId}`);

      // Map branch names to Steam branch IDs
      const branchIdMap: Record<string, string> = {
        'main-branch': 'public',
        'beta-branch': 'beta',
        'alternate-branch': 'alternate',
        'alternate-beta-branch': 'alternate-beta'
      };

      const branchId = branchIdMap[branch];
      if (!branchId) {
        throw new Error(`Unknown branch ID for ${branch}`);
      }

      addTerminalLog(`Steam Branch ID: ${branchId}`);

      // Download the branch using DepotDownloader
      addTerminalLog(`Executing DepotDownloader download command...`);
      const result = await window.electronAPI.depotdownloader.downloadBranch(
        depotDownloaderPath || undefined,
        effectiveCreds.username,
        effectiveCreds.password,
        branchPath,
        appId,
        branchId
      );

      if (result.success) {
        addTerminalLog(`✓ Successfully downloaded ${branchDisplayName} branch with DepotDownloader`);
        addTerminalLog(`Output: ${result.output}`);
        
      // Get and save build ID via node-steam-user for this branch key
      addTerminalLog(`Getting build ID for ${branchDisplayName} branch from Steam...`);
      try {
        const steamBuildResp = await window.electronAPI.steamUpdate.getBranchBuildId(branchId);
        const buildId = steamBuildResp?.success ? steamBuildResp.buildId : undefined;
        if (buildId) {
          addTerminalLog(`Build ID for ${branchDisplayName}: ${buildId}`);
          await window.electronAPI.config.setBuildIdForBranch(branch, buildId);
          addTerminalLog(`✓ Saved build ID for ${branchDisplayName} branch`);
          // Optionally mirror manifest for downstream tools
          try {
            const manifestPath = `${branchPath}/appmanifest_${appId}.acf`;
            const manifest = `"AppState"\n{\n\t"appid"\t"${appId}"\n\t"Universe"\t"1"\n\t"name"\t"Schedule I"\n\t"StateFlags"\t"4"\n\t"installdir"\t"${branch}"\n\t"buildid"\t"${buildId}"\n\t"LastUpdated"\t"${Math.floor(Date.now()/1000)}"\n}`;
            await window.electronAPI.file.writeText(manifestPath, manifest);
            addTerminalLog(`✓ Wrote manifest to ${manifestPath}`);
          } catch (e) {
            addTerminalLog(`⚠ Failed to write manifest: ${e instanceof Error ? e.message : String(e)}`);
          }
        } else {
          addTerminalLog(`⚠ Could not get build ID for ${branchDisplayName} branch`);
        }
      } catch (e) {
        addTerminalLog(`⚠ Error retrieving build ID: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Install MelonLoader into the new branch root
      try {
        addTerminalLog('Installing MelonLoader into branch root...');
        const res = await window.electronAPI.melonloader.install(branchPath);
        if (res?.success) {
          addTerminalLog('✓ MelonLoader installed');
        } else {
          addTerminalLog(`⚠ MelonLoader install failed${res?.error ? `: ${res.error}` : ''}`);
        }
      } catch (e) {
        addTerminalLog(`⚠ MelonLoader install error: ${e instanceof Error ? e.message : String(e)}`);
      }
        setCompletedBranches(prev => [...prev, branch]);
      } else {
        throw new Error(result.error || 'DepotDownloader download failed');
      }
      
    } catch (err) {
      const errorMsg = `Failed to download branch ${branch} with DepotDownloader: ${err instanceof Error ? err.message : String(err)}`;
      console.error(errorMsg);
      addTerminalLog(`✗ Error: ${errorMsg}`);
      throw err;
    }
  };

  const handleBranchVerified = async () => {
    setShowVerificationDialog(false);
    setCopyStatus('copying');
    
    try {
      const branch = selectedBranches[currentBranchIndex];
      // Reset per-branch UI regardless of method
      setBranchProgress(0);
      setCurrentFile('');
      setFilesCopied(0);
      setTotalFiles(0);
      let proceed = false;
      do {
        try {
          if (downloadMethod === 'depotdownloader') {
            openBranchLog(branch, 'depotdownloader');
            await downloadBranchWithDepotDownloader(branch);
            await writeBranchLog(branch, 'success');
            // Delay between branches to avoid rate limits
            await new Promise(res => setTimeout(res, 5000));
          } else {
            openBranchLog(branch, 'copy');
            await copyBranchFiles(branch);
            await writeBranchLog(branch, 'success');
          }
          proceed = true;
        } catch (e) {
          if (cancelledRef.current) {
            await writeBranchLog(branch, 'cancel');
            setIsComplete(true);
            setCopyStatus('completed');
            return;
          }
          const errMsg = e instanceof Error ? e.message : String(e);
          await writeBranchLog(branch, 'failure');
          const decision = await showFailureDialog(`Failed to process ${branchDisplayNames[branch] || branch}`, errMsg);
          if (decision === 'retry') {
            proceed = false;
          } else if (decision === 'skip') {
            proceed = true; // proceed to next branch
          } else {
            // cancel setup
            await writeBranchLog(branch, 'cancel');
            setIsComplete(true);
            setCopyStatus('completed');
            return;
          }
        }
      } while (!proceed);
      
    } catch (err) {
      console.error(`Failed to process branch ${currentBranch}:`, err);
    } finally {
      if (verificationResolve) {
        verificationResolve();
        setVerificationResolve(null);
      }
    }
  };

  const handleBranchSkipped = () => {
    setShowVerificationDialog(false);
    console.log(`Skipped branch: ${currentBranch}`);
    if (verificationResolve) {
      verificationResolve();
      setVerificationResolve(null);
    }
  };

  const handleCancelSetup = () => {
    setShowVerificationDialog(false);
    setIsComplete(true);
    if (verificationResolve) {
      verificationResolve();
      setVerificationResolve(null);
    }
    onComplete();
  };

  const handleFailureRetry = () => {
    setFailureOpen(false);
    if (failureResolve) { failureResolve('retry'); setFailureResolve(null); }
  };
  const handleFailureSkip = () => {
    setFailureOpen(false);
    if (failureResolve) { failureResolve('skip'); setFailureResolve(null); }
  };
  const handleFailureCancel = () => {
    setFailureOpen(false);
    if (failureResolve) { failureResolve('cancel'); setFailureResolve(null); }
  };

  const handleConfirmYes = () => { setConfirmOpen(false); if (confirmResolve) { confirmResolve(true); setConfirmResolve(null); } };
  const handleConfirmNo  = () => { setConfirmOpen(false); if (confirmResolve) { confirmResolve(false); setConfirmResolve(null); } };

  const getBranchProgress = (branch: string) => {
    if (completedBranches.includes(branch)) return 100;
    if (currentBranch === branch && copyStatus === 'copying') return branchProgress;
    return 0;
  };

  const getStatusMessage = () => {
    switch (copyStatus) {
      case 'verifying':
        return `Verifying branch: ${branchDisplayNames[currentBranch] || currentBranch}`;
      case 'copying':
        return `Copying branch: ${branchDisplayNames[currentBranch] || currentBranch}`;
      case 'completed':
        return 'Setup complete!';
      default:
        return 'Preparing to copy branches...';
    }
  };

  return (
    <div className="space-y-6">
      {cancelledRef.current && (
        <div className="bg-yellow-900/30 border border-yellow-500/50 text-yellow-200 px-4 py-2 text-sm text-center">
          Download cancelled. You can restart the setup when ready.
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold mb-2">Copying Files</h3>
        <p className="text-gray-300 mb-4">
          Please wait while the selected branches are copied to your managed environment.
        </p>
      </div>

      {/* Overall Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
        <div
          className="bg-blue-600 h-4 rounded-full transition-all duration-300"
          style={{ width: `${overallProgress}%` }}
        ></div>
      </div>
      <p className="text-sm text-gray-300 text-center mb-4">{overallProgress.toFixed(0)}% Complete</p>

      {/* Status Message */}
      <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
        <p className="text-blue-300 text-center">
          {getStatusMessage()}
        </p>
        {copyStatus === 'copying' && (
          <div className="mt-2">
            <p className="text-sm text-blue-400 text-center">
              {currentFile && currentFile !== 'Complete' && `File: ${currentFile}`}
              {filesCopied > 0 && totalFiles > 0 && 
                ` (${filesCopied}/${totalFiles} files)`
              }
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${branchProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 text-center mt-1">
              {branchProgress.toFixed(1)}% complete
            </p>
            {downloadMethod === 'depotdownloader' && (
              <div className="flex items-center justify-center mt-1 space-x-3">
                <p className="text-xs text-gray-500">Download progress from DepotDownloader</p>
                <button
                  className="text-xs text-red-300 hover:text-red-200"
                  onClick={async () => {
                    const ok = confirm('Cancel the current download?');
                    if (!ok) return;
                    try {
                      addTerminalLog('Attempting to cancel DepotDownloader download...');
                      cancelledRef.current = true;
                      const res = await window.electronAPI.depotdownloader.cancel();
                      if (res?.success) {
                        addTerminalLog('✔ Cancelled DepotDownloader download');
                        try { window.electronAPI.removeDepotDownloaderProgressListener(); } catch {}
                        try { await closeSessionLog('cancelled'); } catch {}
                        setIsComplete(true);
                        setCopyStatus('completed');
                      } else {
                        addTerminalLog(`? Cancel failed${res?.error ? `: ${res.error}` : ''}`);
                      }
                    } catch (e) {
                      addTerminalLog(`? Cancel error: ${e instanceof Error ? e.message : String(e)}`);
                    }
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Terminal Output Toggle */}
      {copyStatus === 'copying' && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className="btn-secondary text-sm"
          >
            {showTerminal ? 'Hide' : 'Show'} Terminal Output
          </button>
        </div>
      )}

      {/* Terminal Output */}
      <TerminalOutput logs={terminalLogs} isVisible={showTerminal} />

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-300">Error: {error}</p>
        </div>
      )}

      {/* Completion Message */}
      {isComplete && (
        <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
          <p className="text-green-300">
            ✓ Setup complete! All selected branches have been copied successfully.
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && !isComplete && (
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-gray-300">Processing files...</span>
        </div>
      )}

      {/* Branch Verification Dialog (copy flow only) */}
      {downloadMethod === 'copy' && (
        <BranchVerificationDialog
          isOpen={showVerificationDialog}
          libraryPath={steamLibraryPath}
          expectedBranch={currentBranch}
          branchDisplayName={branchDisplayNames[currentBranch] || currentBranch}
          onVerified={handleBranchVerified}
          onSkip={handleBranchSkipped}
          onCancel={handleCancelSetup}
        />
      )}

      {/* Failure Dialog */}
      <FailureDialog
        isOpen={failureOpen}
        title="Operation Failed"
        message={failureMessage}
        details={failureDetails}
        onRetry={handleFailureRetry}
        onSkip={handleFailureSkip}
        onCancel={handleFailureCancel}
        onOpenLogs={async () => {
          try { await window.electronAPI.shell.openFolder(`${managedEnvironmentPath}/logs`); } catch {}
        }}
        onCopyLogPath={async () => {
          try {
            const p = lastBranchLogPath || `${managedEnvironmentPath}/logs`;
            await navigator.clipboard.writeText(p);
            addTerminalLog(`Copied log path to clipboard: ${p}`);
          } catch (e) {
            addTerminalLog(`? Failed to copy log path: ${e instanceof Error ? e.message : String(e)}`);
          }
        }}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Low Disk Space"
        message={confirmMessage}
        confirmText="Continue Anyway"
        cancelText="Cancel"
        onConfirm={handleConfirmYes}
        onCancel={handleConfirmNo}
      />
    </div>
  );
};

export default CopyProgressStep;
