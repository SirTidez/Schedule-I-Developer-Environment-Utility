# Sequential Manifest Downloads Verification Implementation

## Overview
Implemented verification comments to ensure manifest-accurate installs land in the correct version directory and that the renderer uses the supported progress APIs.

## Changes Made

### VersionManagerDialog.tsx
- **Removed direct call to `downloadBranchSequentialDepots`**: The renderer no longer directly calls the sequential depot download method
- **Always use `downloadBranchVersion`**: All downloads now go through the main handler which resolves manifests and picks the appropriate download method
- **Fixed progress API usage**: 
  - Replaced `window.electronAPI.on('depotdownloader-progress', progressListener)` with `window.electronAPI.onDepotDownloaderProgress(progressListener)`
  - Replaced `window.electronAPI.off('depotdownloader-progress', progressListener)` with `window.electronAPI.removeDepotDownloaderProgressListener()`
- **Simplified download logic**: Removed complex manifest resolution logic from renderer - this is now handled by the main process

## Key Benefits
1. **Correct version directory placement**: Downloads now write to `managed-env/branches/<branchName>/<buildId>/` structure
2. **Delegated orchestration**: Main process handles manifest resolution and method selection
3. **Proper progress API usage**: Uses the dedicated preload helpers instead of direct IPC event listeners
4. **Error handling**: Ensures progress listeners are cleaned up even on errors

## Technical Details
- The main handler `handleDownloadBranchVersion` in `depotdownloaderHandlers.ts` resolves depot manifests via `SteamUpdateService`
- It computes `versionPath` using `getBranchVersionPath` utility
- Falls back to generic download if manifests are unavailable
- Progress tracking uses the proper preload API methods

## Files Modified
- `src/renderer/components/VersionManager/VersionManagerDialog.tsx`

## Files Referenced
- `src/main/ipc/depotdownloaderHandlers.ts` (main handler logic)
- `src/main/utils/pathUtils.ts` (path utilities)
- `src/preload/index.ts` (progress API definitions)
