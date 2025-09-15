# Managed Environment Manifest Detection Update

**Date**: 2025-01-27  
**Version**: 2.1.1  
**Type**: Feature Enhancement

## Overview
Updated the Managed Environment window to properly detect and display branch versions that use the new manifest-based download paths (`manifest_<manifestId>`) in addition to the existing build-based paths (`build_<buildId>`).

## Changes Made

### Frontend Updates (`src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx`)

#### 1. Enhanced Version Detection Logic
- **File**: `src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx`
- **Lines**: 164-187
- **Change**: Updated executable detection to check for both manifest and build-based active versions
- **Logic**:
  ```typescript
  if (activeManifestId) {
    // Check manifest-based version: manifest_<manifestId>
    const activeVersionPath = `${branchPath}\\manifest_${activeManifestId}`;
    const activeExePath = `${activeVersionPath}\\Schedule I.exe`;
    exeExists = await checkFileExists(activeExePath);
  } else if (activeBuildId) {
    // Check build-based version: build_<buildId>
    const activeVersionPath = `${branchPath}\\build_${activeBuildId}`;
    const activeExePath = `${activeVersionPath}\\Schedule I.exe`;
    exeExists = await checkFileExists(activeExePath);
  }
  ```

#### 2. Updated Active Version Display
- **File**: `src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx`
- **Lines**: 221-231
- **Change**: Prioritize manifest-based active versions over build-based versions
- **Logic**:
  ```typescript
  if (activeManifestId) {
    activeVersion = `manifest_${activeManifestId}`;
  } else if (activeBuildId) {
    activeVersion = `build_${activeBuildId}`;
  }
  ```

#### 3. Enhanced Play and Open Folder Functions
- **File**: `src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx`
- **Lines**: 397-459
- **Change**: Updated to handle both manifest and build prefixed version directories
- **Features**:
  - `handlePlayBranch`: Launches executables from both `manifest_` and `build_` prefixed directories
  - `handleOpenBranchFolder`: Opens both `manifest_` and `build_` prefixed directories

### Backend Updates (`src/main/ipc/steamBranchHandlers.ts`)

#### 1. Enhanced Installed Versions Detection
- **File**: `src/main/ipc/steamBranchHandlers.ts`
- **Lines**: 345-365
- **Change**: Updated `handleGetInstalledVersions` to properly detect active versions for both manifest and build-based installations
- **Logic**:
  ```typescript
  if (activeManifestId && version.manifestId) {
    // Check if this is the active manifest version
    isActive = version.manifestId === activeManifestId;
  } else if (activeBuildId && !activeManifestId) {
    // Fall back to build ID check if no manifest is active
    isActive = version.buildId === activeBuildId;
  }
  ```

## Technical Details

### Path Structure Support
The system now supports both directory naming conventions:
- **Legacy Build-based**: `branches/<branchName>/build_<buildId>/`
- **New Manifest-based**: `branches/<branchName>/manifest_<manifestId>/`

### Active Version Priority
1. **Manifest-based versions** take priority when both are present
2. **Build-based versions** are used as fallback
3. **Legacy flat structure** is still supported for backward compatibility

### Backend Integration
- Uses existing `listBranchVersions` function from `pathUtils.ts` which already supports both naming conventions
- Leverages existing `getActiveManifest` and `getActiveBuild` functions from `ConfigService`
- Maintains backward compatibility with existing installations

## Benefits

1. **Seamless Migration**: Existing build-based installations continue to work
2. **New Feature Support**: New manifest-based downloads are properly detected and displayed
3. **Unified Interface**: Single UI handles both version types transparently
4. **Backward Compatibility**: No breaking changes to existing functionality

## Testing

The updated system should now:
- ✅ Detect manifest-based branch versions in the Managed Environment window
- ✅ Display correct active version information for both build and manifest-based installations
- ✅ Allow launching games from manifest-based version directories
- ✅ Allow opening manifest-based version directories in file explorer
- ✅ Show proper version counts and status information

## Related Files

- `src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx` - Main UI component
- `src/main/ipc/steamBranchHandlers.ts` - Backend version detection logic
- `src/main/utils/pathUtils.ts` - Path utilities (already supported both formats)
- `src/main/services/ConfigService.ts` - Configuration management (already supported manifest IDs)

