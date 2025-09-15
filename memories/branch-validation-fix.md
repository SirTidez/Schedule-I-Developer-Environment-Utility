# Branch Validation Fix

## Issue
New installs were incorrectly showing as needing repair in the managed environment window. The branch validation logic was not correctly checking the new directory structure for manifest-based and build-based installations.

## Root Cause
1. **Path Construction Bug**: The `getBranchVersionPath` function in `pathUtils.ts` was hardcoded to always use the `'build_'` prefix regardless of the `type` parameter
2. **Manual Path Construction**: The `ManagedEnvironment.tsx` was manually constructing paths instead of using the utility functions, leading to inconsistent path handling

## Changes Made

### 1. Fixed getBranchVersionPath Function
**File**: `src/main/utils/pathUtils.ts:23-26`

**Before**:
```typescript
export function getBranchVersionPath(managedEnvironmentPath: string, branchName: string, versionId: string, type: 'build' | 'manifest' = 'build'): string {
  const prefix = 'build_'; // Always hardcoded!
  return path.join(managedEnvironmentPath, 'branches', branchName, `${prefix}${versionId}`);
}
```

**After**:
```typescript
export function getBranchVersionPath(managedEnvironmentPath: string, branchName: string, versionId: string, type: 'build' | 'manifest' = 'build'): string {
  const prefix = type === 'manifest' ? 'manifest_' : 'build_';
  return path.join(managedEnvironmentPath, 'branches', branchName, `${prefix}${versionId}`);
}
```

### 2. Updated Branch Validation Logic
**File**: `src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx:169-186`

**Before**: Manual path construction
```typescript
const activeVersionPath = `${branchPath}\\manifest_${activeManifestId}`;
const activeVersionPath = `${branchPath}\\build_${activeBuildId}`;
```

**After**: Using utility functions
```typescript
const activeVersionPath = await window.electronAPI.pathUtils.getBranchVersionPath(config.managedEnvironmentPath, branch.folderName, activeManifestId, 'manifest');
const activeVersionPath = await window.electronAPI.pathUtils.getBranchVersionPath(config.managedEnvironmentPath, branch.folderName, activeBuildId, 'build');
```

## Technical Details

### Directory Structure Support
The fix ensures proper validation for:
- **Manifest-based installations** (DepotDownloader): `branches/main-branch/manifest_12345/Schedule I.exe`
- **Build-based installations** (Steam copy): `branches/main-branch/build_67890/Schedule I.exe`
- **Legacy installations**: `branches/main-branch/Schedule I.exe`

### Validation Logic
- `needsRepair = dirExists && !exeExists` only triggers when:
  - The branch directory exists
  - BUT the executable doesn't exist in the expected location
- Now correctly checks the right subdirectory based on installation type

## Impact
- ✅ New installs no longer incorrectly show as needing repair
- ✅ Consistent path handling across the application
- ✅ Proper support for both manifest and build-based installations
- ✅ Legacy installations continue to work correctly
- ✅ Improved code maintainability by using utility functions

## Testing
The fix was validated by building the application and ensuring the branch validation logic properly detects the new directory structure without false positives for repair status.