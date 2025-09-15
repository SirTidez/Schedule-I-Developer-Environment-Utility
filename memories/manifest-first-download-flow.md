# Manifest-First Download Flow Implementation (2025-01-10)

## Overview
Implemented a new manifest-first download flow for the SetupWizard that downloads manifests for all selected branches first using `-manifest-only`, then uses those manifest IDs to create proper directory structures and download the actual game files.

## Problem Solved
The previous approach was saving the same manifest ID for all branches because it was trying to get depot manifests from the Steam API before downloading branches, which only worked for the currently installed branch. For other branches that weren't installed, it would get the same manifest ID, leading to incorrect directory structures.

## Solution Implemented

### 1. New Manifest Download Method ✅
**File**: `src/main/ipc/depotdownloaderHandlers.ts`
- Added `handleDownloadManifests` function that downloads manifests for multiple branches using `-manifest-only`
- Downloads manifests to temporary directories and extracts manifest IDs and build IDs
- Cleans up temporary directories after extraction
- Returns manifest information for each branch

### 2. Enhanced SetupWizard Flow ✅
**File**: `src/renderer/components/SetupWizard/steps/CopyProgressStep.tsx`
- Added `downloadManifestsForBranches` function to download manifests for all selected branches
- Modified `startCopyProcess` to download manifests first for DepotDownloader method
- Updated `downloadBranchWithDepotDownloader` to use pre-downloaded manifest information
- Added `branchManifests` state to store manifest information

### 3. New DepotDownloader Method ✅
**File**: `src/main/ipc/depotdownloaderHandlers.ts`
- Added `handleDownloadBranchVersionByManifest` function
- Uses specific manifest ID with `-manifest` parameter
- Creates proper directory structure using manifest ID
- Downloads directly to final destination

### 4. Updated Type Definitions ✅
**File**: `src/shared/types.ts`
- Added `ManifestInfo` interface for manifest information
- Added `DownloadManifestsResult` interface for manifest download results

### 5. Enhanced Preload API ✅
**File**: `src/preload/index.ts`
- Added `downloadManifests` method to depotdownloader API
- Exposed new method to renderer process

## New Flow Process

### For DepotDownloader Method:
1. **Pre-download Phase**: Download manifests for all selected branches using `-manifest-only`
2. **Extract Information**: Extract manifest IDs and build IDs from downloaded manifests
3. **Store Information**: Store manifest information in component state
4. **Download Phase**: For each branch, use the pre-downloaded manifest ID to download the actual game files
5. **Directory Structure**: Create proper directory structure using manifest IDs instead of build IDs

### For Copy Method:
- Continues to use Steam API for manifest retrieval (only works for currently installed branch)
- Other branches use the manifest-first approach

## Benefits

1. **Correct Manifest IDs**: Each branch gets its proper manifest ID, not the same one
2. **Proper Directory Structure**: Uses manifest IDs for version directories instead of build IDs
3. **Efficient Downloads**: Downloads manifests first to get correct information, then downloads actual files
4. **Better Error Handling**: Clear error messages if manifest download fails
5. **Consistent Approach**: All branches use the same manifest-based approach

## Technical Details

### Manifest Download Commands:
```bash
# For main-branch:
DepotDownloader.exe -app 3164500 -depot 3164501 -username <user> -password <pass> -branch public -dir <temp_dir> -manifest-only

# For other branches (beta, alternate, alternate-beta):
DepotDownloader.exe -app 3164500 -depot 3164501 -username <user> -password <pass> -beta <branch_id> -dir <temp_dir> -manifest-only
```

### Branch Download Command:
```bash
DepotDownloader.exe -app 3164500 -depot 3164501 -username <user> -password <pass> -beta <branch_id> -dir <final_dir> -manifest <manifest_id>
```

### Directory Structure:
```
managedEnvironmentPath/
├── branches/
│   ├── main-branch/
│   │   └── <manifest_id>/
│   ├── beta-branch/
│   │   └── <manifest_id>/
│   └── alternate-branch/
│       └── <manifest_id>/
```

## Files Modified
- `src/main/ipc/depotdownloaderHandlers.ts` - Added manifest download and branch download by manifest methods
- `src/preload/index.ts` - Added new API method
- `src/shared/types.ts` - Added new type definitions
- `src/renderer/components/SetupWizard/steps/CopyProgressStep.tsx` - Updated flow to use manifest-first approach

## Testing
The new flow should be tested with:
1. Multiple branches selected in SetupWizard
2. Both copy and DepotDownloader methods
3. Verification that each branch gets its correct manifest ID
4. Verification that directory structure uses manifest IDs
5. Verification that downloads complete successfully

## Status
✅ **COMPLETED** - All components implemented and ready for testing

## Fixes Applied (2025-01-10)

### Fix 1: Missing Depot ID
**Issue**: Manifest download command was missing depot ID, causing downloads to fail.
**Solution**: Added `-depot 3164501` parameter to the manifest download command.

### Fix 2: Incorrect Branch Parameter
**Issue**: Using `-branch` for all branches instead of `-beta` for non-main branches.
**Solution**: Updated command to use `-beta` for all branches except main-branch (which uses `-branch`).

### Fix 3: Manifest ID Extraction
**Issue**: Trying to extract manifest ID from downloaded files instead of DepotDownloader output.
**Solution**: Updated logic to parse manifest ID from DepotDownloader stdout output using regex pattern.
**Pattern**: `Got manifest request code for depot \d+ from app \d+, manifest (\d+), result: \d+`

### Fix 4: Missing Output Field in Return Type
**Issue**: `handleDownloadBranchVersionByManifest` and `handleDownloadWithManifest` functions were missing `output` field in return type, causing UI to show failure dialog even on success.
**Solution**: Updated return types to include `output?: string` field and added output to success responses.

### Fix 5: Password Masking in Logs
**Issue**: User passwords were being logged in plain text in console output, creating security risk.
**Solution**: Added password masking logic to replace passwords with `***` in log output.

**Files Modified**: `src/main/ipc/depotdownloaderHandlers.ts` - Updated `handleDownloadManifests` function
