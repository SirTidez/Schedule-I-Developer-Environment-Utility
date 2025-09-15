# Manifest ID Retrieval Fix for Uninstalled Branches (2025-01-10)

## Overview
Fixed the issue where the SetupWizard was saving the same manifest ID for all branches by implementing proper manifest ID retrieval that downloads branches first with DepotDownloader to get the correct manifest IDs for uninstalled branches.

## Problem Identified

**Issue**: The SetupWizard was using the Steam API to get depot manifests for all branches, but this approach only worked for the currently installed branch. For other branches that weren't installed, it would get the same manifest ID, leading to incorrect directory structures.

**Root Cause**: The original approach tried to get depot manifests from the Steam API before downloading branches, but uninstalled branches don't have local manifest data available.

## Solution Implemented

### 1. Hybrid Approach for Branch Processing ✅

**Copy Method Flow**:
- **First Branch (Currently Installed)**: Use Steam API to get depot manifests and extract manifest ID
- **Other Branches**: Download with DepotDownloader first, then extract manifest ID from downloaded files

**DepotDownloader Method Flow**:
- **All Branches**: Download with DepotDownloader first, then extract manifest ID from downloaded files

### 2. Enhanced DepotDownloader Method ✅

**New Process**:
1. Download branch to temporary directory using build ID
2. Extract manifest ID from DepotDownloader's `.DepotDownloader` metadata files
3. Create final directory structure using `manifest_${manifestId}` naming
4. Move downloaded files to final manifest-based directory
5. Clean up temporary directory

**Technical Implementation**:
```typescript
// Download to temporary directory first
const result = await window.electronAPI.depotdownloader.downloadBranch(
  depotDownloaderPath || undefined,
  effectiveCreds.username,
  effectiveCreds.password,
  `${managedEnvironmentPath}/branches/${branch}/temp_${buildId}`,
  appId,
  branchId,
  buildId
);

// Extract manifest ID from downloaded files
const manifestResult = await window.electronAPI.depotdownloader.getBranchBuildId(
  `${managedEnvironmentPath}/branches/${branch}/temp_${buildId}`,
  appId
);

// Use extracted manifest ID for final directory structure
const manifestId = manifestResult.manifestIds[0];
const branchVersionPath = `${managedEnvironmentPath}/branches/${branch}/manifest_${manifestId}`;

// Move files to final location
await window.electronAPI.file.copyDirectory(
  `${managedEnvironmentPath}/branches/${branch}/temp_${buildId}`,
  branchVersionPath
);
```

### 3. Updated Copy Method Flow ✅

**Modified Logic**:
- **First Branch**: Continue using Steam API manifest retrieval (works for installed branch)
- **Other Branches**: Switch to DepotDownloader method to get proper manifest IDs

**Implementation**:
```typescript
// Copy-based flow
if (i === 0) {
  // First branch: use Steam API manifest retrieval
  await copyBranchFiles(branch);
} else {
  // Other branches: download with DepotDownloader to get manifest ID
  await downloadBranchWithDepotDownloader(branch);
}
```

## Key Benefits Achieved

### 1. Correct Manifest ID Retrieval ✅
- Each branch now gets its own unique manifest ID
- No more duplicate manifest IDs across different branches
- Proper version-specific directory structures

### 2. Robust Download Process ✅
- Downloads branches first to get accurate manifest data
- Uses DepotDownloader's metadata extraction capabilities
- Handles both installed and uninstalled branches correctly

### 3. Proper Directory Structure ✅
- Uses `manifest_${manifestId}` naming convention consistently
- Each branch gets its own unique directory based on actual manifest ID
- Maintains compatibility with existing version management system

### 4. Error Handling ✅
- Comprehensive error handling for manifest extraction failures
- Graceful fallback and user feedback
- Proper cleanup of temporary directories

## Technical Details

### File Operations Used
- `file:copy-directory`: Copy downloaded files to final location
- `file:delete-directory`: Clean up temporary directories
- `depotdownloader:get-branch-buildid`: Extract manifest IDs from downloaded files

### Directory Structure
**Before**: `branches/{branch}/{buildId}/` (same buildId for all branches)
**After**: `branches/{branch}/manifest_{manifestId}/` (unique manifestId per branch)

### Process Flow
1. **First Branch**: Steam API → Extract manifest ID → Copy files
2. **Other Branches**: DepotDownloader → Extract manifest ID → Move files
3. **All Branches**: Save build ID and manifest ID to configuration

## Files Modified

### `src/renderer/components/SetupWizard/steps/CopyProgressStep.tsx`
- **Updated `downloadBranchWithDepotDownloader`**: Now downloads first, then extracts manifest ID
- **Modified copy flow logic**: Different approach for first vs. other branches
- **Enhanced error handling**: Better error messages and cleanup
- **Added temporary directory management**: Proper cleanup of temp files

## Testing Results

### Manifest ID Uniqueness ✅
- Each branch now gets its own unique manifest ID
- No more duplicate manifest IDs across branches
- Proper directory structure with `manifest_` prefix

### Download Process ✅
- DepotDownloader downloads work correctly for all branches
- Manifest ID extraction from downloaded files works reliably
- File operations (copy, delete) work as expected

### Error Handling ✅
- Proper error messages when manifest extraction fails
- Graceful cleanup of temporary directories
- User-friendly error feedback

## Status: Complete ✅

The manifest ID retrieval issue has been successfully resolved. The SetupWizard now properly downloads branches first with DepotDownloader to get accurate manifest IDs for uninstalled branches, ensuring each branch gets its own unique manifest ID and proper directory structure.

## Future Considerations

### Potential Optimizations
- Cache manifest IDs to avoid re-downloading for verification
- Parallel downloads for multiple branches (with rate limiting)
- Manifest ID validation before directory creation

### Monitoring
- Track manifest ID extraction success rates
- Monitor download performance and error rates
- Validate directory structure consistency

This fix ensures that the SetupWizard creates proper version-specific directory structures with unique manifest IDs for each branch, resolving the issue of duplicate manifest IDs across different branches.

