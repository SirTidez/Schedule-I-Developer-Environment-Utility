# Remove AppManifest Copy Fix

## Issue
The application was copying the Steam appmanifest file from the active Steam game installation to branch directories, but this was unnecessary since all build information is stored in the config file.

## Solution
Removed the appmanifest copying functionality from both the DepotDownloader setup wizard and managed environment components.

## Changes Made

### 1. Removed AppManifest Copy from DepotDownloader Setup Wizard
- **File**: `src/renderer/components/SetupWizard/steps/CopyProgressStep.tsx`
- **Removed**: All calls to `window.electronAPI.file.copyManifest()`
- **Removed**: Associated log messages and comments about appmanifest copying
- **Impact**: DepotDownloader downloads no longer copy Steam appmanifest files

### 2. Verified Managed Environment
- **File**: `src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx`
- **Status**: No appmanifest copying found - already clean
- **Impact**: No changes needed in managed environment

### 3. Functionality Removed
- **Before**: Application copied `appmanifest_<appId>.acf` from Steam library to branch folders
- **After**: No appmanifest copying - relies solely on config file for build information
- **Benefit**: Eliminates unnecessary file operations and dependencies on active Steam installation

## Code Changes

### Removed from CopyProgressStep.tsx
```typescript
// REMOVED: These code blocks were eliminated
// Copy Steam app manifest into branch folder for drift checks
try {
  const appId = await window.electronAPI.steam.getScheduleIAppId();
  if (appId) {
    addTerminalLog(`Copying Steam app manifest (app ${appId})...`);
    await window.electronAPI.file.copyManifest(appId, steamLibraryPath, branchVersionPath);
    addTerminalLog(`✓ Copied appmanifest_${appId}.acf to branch folder`);
  }
} catch (e) {
  addTerminalLog(`⚠ Failed to copy Steam app manifest: ${e instanceof Error ? e.message : String(e)}`);
}
```

## Benefits
- ✅ Eliminates unnecessary file operations during branch downloads
- ✅ Reduces dependencies on active Steam installation state
- ✅ Simplifies download process by relying on config file data
- ✅ Prevents potential conflicts with Steam appmanifest files
- ✅ Improves download performance by removing extra copy step

## Testing
- ✅ Build completed successfully with no compilation errors
- ✅ All `copyManifest` function calls removed from setup wizard
- ✅ No appmanifest copying references found in managed environment

## Files Modified
- `src/renderer/components/SetupWizard/steps/CopyProgressStep.tsx` - Removed appmanifest copying

## Date
2024-12-19
