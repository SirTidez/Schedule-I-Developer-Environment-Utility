# Manifest to Build Directory Copy Fix

## Issue
DepotDownloader was downloading builds to `manifest_<manifest_id>` folders, but the application expected builds to be in `build_<manifest_id>` folders. This caused:
- MelonLoader to install to the wrong directory
- Inconsistent path references throughout the application
- Manifest folders remaining after downloads instead of being cleaned up

## Solution
Implemented automatic copying of contents from `manifest_<manifest_id>` to `build_<manifest_id>` after successful downloads, with proper cleanup of empty manifest folders.

## Changes Made

### 1. Updated DepotDownloader Handlers
- **File**: `src/main/ipc/depotdownloaderHandlers.ts`
- **Functions Updated**:
  - `handleDownloadBranch`: Added logic to detect manifest directories and copy to build directories
  - `handleDownloadWithManifest`: Added manifest-to-build copy after download
  - `handleDownloadBranchSequentialDepots`: Added final manifest-to-build copy after all depots complete

### 2. Added Helper Functions
- **`copyManifestContentsToBuildDirectory(manifestDirectory, buildDirectory)`**: Copies all contents from manifest directory to build directory
- **`cleanupEmptyManifestDirectory(manifestDirectory)`**: Removes empty manifest directory after copy
- **`copyManifestFilesToBuildDirectory(buildDirectory)`**: Preserved for regular downloads (copies .DepotDownloader files)

### 3. Updated MelonLoader Installation
- **File**: `src/renderer/components/SetupWizard/steps/CopyProgressStep.tsx`
- **Change**: Updated MelonLoader installation to use build directory instead of manifest directory
- **Before**: `window.electronAPI.melonloader.install(branchVersionPath)` (manifest directory)
- **After**: `window.electronAPI.melonloader.install(buildVersionPath)` (build directory)

### 4. Implementation Details
- **Download Flow**: DepotDownloader downloads to `manifest_<manifest_id>` → Copy contents to `build_<manifest_id>` → Clean up empty manifest folder
- **Path Detection**: Uses regex to detect manifest directories (`manifest_(\d+)$`) and convert to build directories (`build_$1`)
- **Error Handling**: Manifest copy errors are logged as warnings but don't fail the download
- **Directory Cleanup**: Only removes manifest directories if they're completely empty

## Benefits
- ✅ Ensures all builds are in `build_<manifest_id>` directories for consistency
- ✅ MelonLoader installs to the correct build directory
- ✅ Automatic cleanup of empty manifest folders
- ✅ Maintains backward compatibility with existing downloads
- ✅ Non-breaking enhancement that improves directory organization

## Testing
- ✅ Build completed successfully with no compilation errors
- ✅ All download functions now include manifest-to-build copy logic
- ✅ MelonLoader installation uses correct build directory path
- ✅ Proper error handling ensures downloads don't fail if copy has issues

## Files Modified
- `src/main/ipc/depotdownloaderHandlers.ts` - Added copy and cleanup functions
- `src/renderer/components/SetupWizard/steps/CopyProgressStep.tsx` - Updated MelonLoader path

## Date
2024-12-19
