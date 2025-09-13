# DepotDownloader Migration Plan

## Executive Summary
**Goal**: Migrate from SteamCMD to DepotDownloader for improved reliability, simpler syntax, and better user experience. DepotDownloader is a modern .NET-based Steam depot downloader with cleaner command-line interface and better error handling than legacy SteamCMD.

**Why DepotDownloader**:
- **Simpler Commands**: `DepotDownloader -app 3164500 -branch beta -username user -password pass -dir path` vs complex SteamCMD syntax
- **Better Error Handling**: More descriptive error messages and status codes
- **Modern Installation**: Available via `winget install --exact --id SteamRE.DepotDownloader`
- **Better Authentication**: Built-in Steam Guard support with QR codes and 2FA handling
- **Reliable Progress**: Consistent progress reporting and download management
- **Cross-Platform**: Works on Windows, macOS, Linux (your app is Windows-focused but future-ready)

## Current Architecture Analysis

### Files Requiring Changes:
1. **`src/main/ipc/steamcmdHandlers.ts`** - Core backend logic for tool operations
2. **`src/renderer/components/SetupWizard/steps/SteamCMDIntegrationStep.tsx`** - Installation and path configuration UI
3. **`src/renderer/components/SetupWizard/steps/SteamLoginStep.tsx`** - Authentication UI and flows
4. **`src/preload/index.ts`** - IPC API definitions (steamcmd namespace)
5. **`src/shared/types.ts`** - Configuration types and interfaces
6. **`CLAUDE.md`** - Update build commands and architecture notes

### Configuration Changes:
- Rename `steamCMDPath` → `depotDownloaderPath` in `DevEnvironmentConfig`
- Rename `useSteamCMD` → `useDepotDownloader`
- Update validation and installation guidance

## Detailed Migration Steps

### 1. Update Backend Handlers (`src/main/ipc/depotdownloaderHandlers.ts`)

**Current SteamCMD Command Structure:**
```bash
# Validation
steamcmd.exe +quit

# Login
steamcmd.exe +@ShutdownOnFailedCommand 1 +@NoPromptForPassword 1 +login username password +quit

# Download Branch
steamcmd.exe +@ShutdownOnFailedCommand 1 +@NoPromptForPassword 1 +login username password +force_install_dir "C:\path" +app_update 3164500 -beta branch validate +quit

# Build ID Query
steamcmd.exe +@ShutdownOnFailedCommand 1 +@NoPromptForPassword 1 +login username password +app_info_print 3164500 +quit
```

**New DepotDownloader Command Structure:**
```bash
# Validation
DepotDownloader.exe --version

# Download Branch (combines login + download)
DepotDownloader.exe -app 3164500 -branch branchname -username username -password password -dir "C:\path" -remember-password -max-downloads 8

# For public branch (main-branch maps to Steam's "public" branch)
DepotDownloader.exe -app 3164500 -username username -password password -dir "C:\path" -remember-password -max-downloads 8

# Build ID Query - Use manifest files instead of app_info_print
# DepotDownloader creates .DepotDownloader files with metadata
```

**Key Changes in `depotdownloaderHandlers.ts`:**

```typescript
// Update executable detection
// OLD: steamcmd.exe
// NEW: DepotDownloader.exe
const depotDownloaderExe = stat.isDirectory() ?
  path.join(depotDownloaderPath, 'DepotDownloader.exe') :
  depotDownloaderPath;

// Update validation command
// OLD: spawn(steamcmdExe, ['+quit'])
// NEW: spawn(depotDownloaderExe, ['--version'])
const depotDownloader = spawn(depotDownloaderExe, ['--version'], {
  shell: false,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

// Update download command construction
const buildDownloadArgs = (): string[] => {
  const args: string[] = [
    '-app', appId,
    '-username', username,
    '-password', password,
    '-dir', installDir,
    '-remember-password',
    '-max-downloads', '8' // Parallel downloads for better performance
  ];

  // Handle branch mapping: main-branch → public (no -branch flag)
  // beta-branch → beta, alternate-branch → alternate, etc.
  const steamBranchKey = branchId === 'main-branch' ? 'public' : branchId.replace('-branch', '');
  if (steamBranchKey !== 'public') {
    args.push('-branch', steamBranchKey);
  }

  return args;
};
```

### 2. Update Authentication Flow (`src/renderer/components/SetupWizard/steps/SteamLoginStep.tsx`)

**Steam Guard Handling Changes:**
```typescript
// DepotDownloader has better Steam Guard support
// OLD: Monitor output for "Steam Guard" text
// NEW: Use -qr flag for QR code or handle 2FA prompts

const handleLoginWithQR = async () => {
  // DepotDownloader can show QR code for mobile auth
  const result = await window.electronAPI?.depotdownloader?.login(
    depotDownloaderPath, username, password, { useQR: true }
  );
};

const handleLoginWith2FA = async (code: string) => {
  // Handle 2FA code input for Steam Guard
  const result = await window.electronAPI?.depotdownloader?.login(
    depotDownloaderPath, username, password, { twoFactorCode: code }
  );
};
```

### 3. Update Installation UI (`src/renderer/components/SetupWizard/steps/SteamCMDIntegrationStep.tsx`)

**Installation Guidance Changes:**
```tsx
// Update installation instructions
const openDepotDownloaderInstall = () => {
  // OLD: https://developer.valvesoftware.com/wiki/SteamCMD
  // NEW: GitHub README with installation instructions
  window.electronAPI?.shell?.openExternal('https://github.com/steamre/depotdownloader#installation');
};

// Update validation text
<p className="text-gray-300 text-sm mb-4">
  DepotDownloader is a modern Steam depot downloader. You can install it via Windows Package Manager
  or download from GitHub. Click "Installation Guide" below for detailed instructions.
</p>

// Update benefits section
<ul className="text-sm text-blue-200 space-y-1 list-disc list-inside">
  <li>Simpler command syntax and better error messages</li>
  <li>Built-in Steam Guard support with QR codes</li>
  <li>Faster parallel downloads with configurable threads</li>
  <li>Modern .NET-based tool with active development</li>
  <li>Cross-platform support for future compatibility</li>
</ul>

// Update installation options
<div className="flex items-center space-x-3 mb-4">
  <button
    onClick={openDepotDownloaderInstall}
    className="btn-secondary text-sm"
  >
    Installation Guide
  </button>
  <span className="text-xs text-gray-400">
    winget install --exact --id SteamRE.DepotDownloader
  </span>
</div>
```

### 4. Update Preload API (`src/preload/index.ts`)

**Rename and Update API:**
```typescript
// OLD: steamcmd namespace
// NEW: depotdownloader namespace
depotdownloader: {
  validateInstallation: (depotDownloaderPath: string) =>
    ipcRenderer.invoke('depotdownloader:validate-installation', depotDownloaderPath),
  login: (depotDownloaderPath: string, username: string, password: string, options?: any) =>
    ipcRenderer.invoke('depotdownloader:login', depotDownloaderPath, username, password, options),
  downloadBranch: (depotDownloaderPath: string, username: string, password: string, branchPath: string, appId: string, branchId: string) =>
    ipcRenderer.invoke('depotdownloader:download-branch', depotDownloaderPath, username, password, branchPath, appId, branchId),
  cancel: () =>
    ipcRenderer.invoke('depotdownloader:cancel'),
  // Remove getBranchBuildId - use manifest files instead
},

// Update progress listener
onDepotDownloaderProgress: (callback: (progress: any) => void) => {
  ipcRenderer.on('depotdownloader-progress', (event, progress) => callback(progress));
},
```

### 5. Update Configuration Types (`src/shared/types.ts`)

```typescript
export interface DevEnvironmentConfig {
  steamLibraryPath: string;
  gameInstallPath: string;
  managedEnvironmentPath: string;
  selectedBranches: string[];
  installedBranch: string | null;
  branchBuildIds: Record<string, BranchBuildInfo>;
  customLaunchCommands: Record<string, string>;
  lastUpdated: string;
  configVersion: string;
  // DepotDownloader integration settings (renamed from SteamCMD)
  useDepotDownloader: boolean; // renamed from useSteamCMD
  depotDownloaderPath: string | null; // renamed from steamCMDPath
  // Enhanced settings for DepotDownloader
  depotDownloaderMaxDownloads?: number; // parallel download threads (default: 8)
  depotDownloaderRememberPassword?: boolean; // use -remember-password flag
  logRetentionCount?: number;
  diskSpaceThresholdGB?: number;
}
```

### 6. Build ID Extraction Alternative

Since DepotDownloader doesn't have `app_info_print` equivalent, use manifest inspection:

```typescript
// New approach: Parse DepotDownloader manifest files
async function getBuildIdFromManifest(branchPath: string, appId: string): Promise<string | null> {
  try {
    // DepotDownloader creates .DepotDownloader directory with metadata
    const manifestPath = path.join(branchPath, '.DepotDownloader');
    const files = await fs.readdir(manifestPath);

    // Look for depot manifest files
    for (const file of files) {
      if (file.includes(`depot_${appId}`) && file.endsWith('.manifest')) {
        const manifestData = await fs.readFile(path.join(manifestPath, file), 'utf8');
        // Parse manifest for build ID - format may vary
        const buildIdMatch = manifestData.match(/BuildID[^\d]*(\d+)/i);
        if (buildIdMatch) {
          return buildIdMatch[1];
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error reading DepotDownloader manifest:', error);
    return null;
  }
}
```

### 7. Progress Parsing Updates

**DepotDownloader Progress Output:**
```typescript
// Update progress parsing for DepotDownloader output format
const parseDepotDownloaderProgress = (text: string): number | null => {
  try {
    // DepotDownloader may have different progress indicators
    // Look for patterns like "Downloaded X MB / Y MB (Z%)"
    const progressMatch = text.match(/\((\d+(?:\.\d+)?)%\)/);
    if (progressMatch) {
      return Math.min(100, Math.max(0, parseFloat(progressMatch[1])));
    }

    // Look for "Downloading depot X of Y"
    const depotMatch = text.match(/Downloading depot (\d+) of (\d+)/);
    if (depotMatch) {
      const current = parseInt(depotMatch[1]);
      const total = parseInt(depotMatch[2]);
      return Math.min(100, Math.max(0, (current / total) * 100));
    }

    // Look for completion messages
    if (text.includes('Download complete') || text.includes('All depots downloaded')) {
      return 100;
    }

    return null;
  } catch {
    return null;
  }
};
```

## Migration Strategy

### Phase 1: Backend Migration
1. **Create New Handler**: `depotdownloaderHandlers.ts` to replace `steamcmdHandlers.ts`
2. **Update Command Logic**: Replace SteamCMD commands with DepotDownloader equivalents
3. **Update Validation**: Change executable detection and test commands
4. **Update Progress Parsing**: Adapt to DepotDownloader output format

### Phase 2: Frontend Migration
1. **Update Configuration UI**: Change installation guidance and validation
2. **Update Authentication UI**: Enhance Steam Guard handling with DepotDownloader features
3. **Update Progress Display**: Adapt to new progress format and error messages
4. **Update Help Text**: Change all references from SteamCMD to DepotDownloader

### Phase 3: Configuration Migration
1. **Schema Migration**: Migrate existing configs from `useSteamCMD`/`steamCMDPath` to new names
2. **Path Detection**: Auto-detect DepotDownloader installation (winget installs to standard location)
3. **Settings Migration**: Preserve user preferences during transition

### Phase 4: Testing & Validation
1. **Fresh Installation**: Test complete setup flow with DepotDownloader
2. **Migration Path**: Test upgrading from SteamCMD configuration
3. **Error Handling**: Verify all error scenarios work correctly
4. **Performance**: Validate download speeds and reliability improvements

## File Reference Summary

**Core Files to Modify:**
- `src/main/ipc/steamcmdHandlers.ts:38-612` - Main backend logic → Create `depotdownloaderHandlers.ts`
- `src/renderer/components/SetupWizard/steps/SteamCMDIntegrationStep.tsx:132-134` - Installation guidance
- `src/renderer/components/SetupWizard/steps/SteamLoginStep.tsx:184-288` - Authentication flow
- `src/preload/index.ts:117-125` - API definitions
- `src/shared/types.ts:16-18` - Configuration schema
- `src/main/index.ts` - Update IPC handler registration

**Configuration Updates:**
- Rename all `steamCMD` references to `depotDownloader`
- Update installation URLs to GitHub README
- Add new DepotDownloader-specific settings
- Migrate existing user configurations

## Implementation Status

### Completed:
✅ **Migration Plan Documentation** - Comprehensive plan with code examples and file references
✅ **Architecture Analysis** - Current vs target state documented
✅ **Command Mapping** - SteamCMD to DepotDownloader syntax conversion

### In Progress:
🚧 **Backend Handler Migration** - Creating new depotdownloaderHandlers.ts

### Pending:
⏳ **Configuration Type Updates** - Update shared/types.ts
⏳ **Preload API Updates** - Update IPC interface definitions
⏳ **UI Component Updates** - Installation and authentication components
⏳ **Main Process Registration** - Update IPC handler registration
⏳ **Testing and Validation** - End-to-end migration testing

## Key Benefits of Migration

1. **Simplified Architecture**: DepotDownloader combines login + download in single command
2. **Better User Experience**: Clearer error messages and installation via winget
3. **Enhanced Security**: Built-in Steam Guard QR code support
4. **Improved Performance**: Configurable parallel downloads with -max-downloads
5. **Future-Proofing**: Modern .NET tool with active development vs legacy SteamCMD
6. **Reduced Complexity**: Fewer command-line arguments and error cases to handle

## Branch Mapping Reference

| Schedule I Branch | Steam Branch Key | DepotDownloader Command |
|------------------|------------------|------------------------|
| main-branch      | public           | (no -branch flag)      |
| beta-branch      | beta             | -branch beta           |
| alternate-branch | alternate        | -branch alternate      |
| alternate-beta-branch | alternate-beta | -branch alternate-beta |

## Error Handling Strategy

**DepotDownloader vs SteamCMD Error Comparison:**
- **Authentication**: DepotDownloader provides clearer 2FA/Steam Guard prompts
- **Network Issues**: Better retry logic and error messages
- **Permissions**: Clearer file access and directory creation errors
- **Steam Running**: DepotDownloader handles Steam client conflicts more gracefully
- **Invalid Branches**: More descriptive error messages for branch access issues

---

*This migration plan ensures a smooth transition from SteamCMD to DepotDownloader while maintaining all existing functionality and improving the user experience.*