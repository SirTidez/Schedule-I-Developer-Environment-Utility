# Steam Version Manifest Display Implementation

## Summary
Changed the branch display in ManagedEnvironment component from showing "Active Version" to "Steam Version" and populated it with the latest manifest ID from Steam API.

## Changes Made

### 1. Updated BranchInfo Interface
- Added `steamManifestId?: string` field to store the latest manifest ID from Steam API

### 2. Modified loadBranches Function
- Added logic to fetch manifest IDs from Steam API using `window.electronAPI.steamBranch.getDepotManifestsForBranch()`
- Prioritizes depot 3164501 as the primary depot, falls back to first available depot
- Handles errors gracefully with console warnings

### 3. Updated UI Display
- Changed label from "Active Version" to "Steam Version"
- Display `branch.steamManifestId` instead of `branch.activeVersion`
- Shows "Unknown" when manifest ID is not available

## Technical Details
- Uses existing Steam Branch IPC handlers (`steamBranch.getDepotManifestsForBranch`)
- Maintains backward compatibility with existing active version tracking
- Provides real-time Steam version information to users
- Error handling prevents UI crashes if Steam API is unavailable

## Benefits
- Users can always see the latest available version from Steam
- Clear distinction between installed active version and latest Steam version
- Better visibility into Steam update availability
- Consistent with Steam's manifest-based versioning system

## Error Handling & Fallbacks
- Added fallback to build ID when depot manifests are not available
- Improved error messages to show available branches when branch not found
- Graceful handling of branches that don't have depot information (e.g., alternate-beta)
- UI shows "Not Available" instead of "Unknown" for better user experience

## Critical Fix: Correct Data Structure Access
- **Issue**: `getDepotManifestsForBranch` was looking in wrong location for manifest data
- **Root Cause**: Looking in `branchInfo.depots` instead of `app.appinfo.depots[depotId].manifests[branchKey].gid`
- **Fix**: Updated method to use same structure as `getDepotManifestsForBuild`
- **Result**: Now correctly retrieves manifest IDs for all branches including alternate-beta

## Files Modified
- `src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx`
- `src/main/services/SteamUpdateService.ts`

## Unified DepotDownloader Approach
- **Issue**: ManagedEnvironment was using `downloadBranch` instead of manifest-based approach
- **Fix**: Updated to use `downloadBranchVersionByManifest` like setup wizard
- **Benefits**: Consistent manifest-based downloads across all components
- **Implementation**: Fetches latest manifest ID from Steam API before download

## Complete Manifest Download Integration
- **Added**: `downloadBranchManifest()` function to download latest manifests
- **Process**: Downloads manifests → Gets manifest ID → Downloads branch with specific manifest
- **Config**: Sets active manifest after successful download
- **MelonLoader**: Installs into version-specific directory (manifest_* folder)
- **Error Handling**: Comprehensive error handling throughout the process
- **Unified Flow**: Now matches setup wizard's manifest-based approach exactly

## Bug Fix: Correct Branch Folder Names
- **Issue**: Installing main branch was creating folder named "public" instead of "main-branch"
- **Root Cause**: `downloadBranchManifest()` was receiving Steam branch key ("public") but manifest download expects folder names ("main-branch")
- **Fix**: Pass `branchInfo.folderName` directly to manifest download instead of Steam branch key
- **Result**: Now correctly creates "main-branch", "beta-branch", etc. folders

## Bug Fix: Correct DepotDownloader Arguments for Public Branch
- **Issue**: Public branch manifest download was using incorrect `-branch` flag
- **Root Cause**: Public branch in Steam doesn't need any branch flag, only beta branches need `-beta`
- **Fix**: Remove branch flag entirely for public branch, use `-beta` only for beta branches
- **Result**: Public branch manifest download now works correctly without fallback to alternate-beta

## Bug Fix: Version Manager Folder Name Mapping
- **Issue**: Version manager was downloading to "public" folder instead of "main-branch"
- **Root Cause**: Version manager was passing Steam branch key ("public") as folder name to download functions
- **Fix**: Added branch mapping in VersionManagerDialog to convert Steam keys to folder names
- **Result**: Version manager now downloads to correct folders (main-branch, beta-branch, etc.)

## Date
2024-12-19
