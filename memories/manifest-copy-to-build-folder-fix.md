# Manifest Copy to Build Folder Fix

## Issue
DepotDownloader was installing builds correctly to individual folders but downloading manifests to a different folder (`.DepotDownloader` subdirectory). This caused manifests to be separated from the actual game files in the build folders.

## Solution
Added automatic manifest file copying after successful downloads to ensure manifest files are available in the main build directory alongside the game files.

## Changes Made

### 1. Added Manifest Copy Helper Function
- **File**: `src/main/ipc/depotdownloaderHandlers.ts`
- **Function**: `copyManifestFilesToBuildDirectory(buildDirectory: string)`
- **Purpose**: Copies manifest files from `.DepotDownloader` directory to the main build directory
- **Files Copied**: `.manifest`, `.json`, `.txt` files from `.DepotDownloader` subdirectory

### 2. Updated Download Functions
- **`handleDownloadBranch`**: Added manifest copy after successful download
- **`handleDownloadWithManifest`**: Added manifest copy after successful download  
- **`handleDownloadBranchSequentialDepots`**: Added final manifest copy after all depots complete

### 3. Implementation Details
- Manifest copying happens after successful downloads only
- Errors in manifest copying are logged as warnings but don't fail the download
- Only copies manifest-related files (`.manifest`, `.json`, `.txt`) to avoid overwriting game files
- Preserves existing `.DepotDownloader` directory structure

## Benefits
- Ensures manifest files are always available in the build folder
- Maintains consistency between game files and manifest metadata
- Improves reliability of build identification and version management
- Non-breaking change that enhances existing functionality

## Testing
- Test with various branch downloads to ensure manifests are properly copied
- Verify that game files remain intact after manifest copying
- Check that `.DepotDownloader` directory is preserved for reference

## Date
2024-12-19
