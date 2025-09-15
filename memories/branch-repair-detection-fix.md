# Branch Repair Detection Fix

## Issue
Branches were showing as needing repair after successful downloads due to incorrect path resolution in the repair detection logic. The system was looking for `Schedule I.exe` directly in the branch folder, but with the new version-specific structure, the executable is located in a subdirectory like `branches/main-branch/123456/Schedule I.exe`.

## Root Cause
The repair detection logic in `ManagedEnvironment.tsx` was using the old flat directory structure:
- **Old logic**: Check for `branches/main-branch/Schedule I.exe`
- **New structure**: Check for `branches/main-branch/123456/Schedule I.exe` (where 123456 is the build ID)

## Changes Made

### 1. Fixed Repair Detection Logic
**File**: `src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx`

- **Updated executable path detection** to check the active version's subdirectory
- **Added support for both new and legacy structures** for backward compatibility
- **Fixed logic flow**:
  1. Check if branch folder exists
  2. Get active build ID from config (`activeBuildPerBranch`)
  3. If active build ID exists, check for exe in `branches/branchName/buildId/Schedule I.exe`
  4. If no active build ID, fall back to legacy check in `branches/branchName/Schedule I.exe`
  5. Set `needsRepair = dirExists && !exeExists`

### 2. Fixed Launch Executable Path
**Updated `handlePlayBranch` function**:
- **New logic**: Use active version's executable path
- **Fallback**: Use legacy path for backward compatibility
- **Path construction**: `branches/branchName/activeVersion/Schedule I.exe`

### 3. Fixed Open Folder Functionality
**Updated `handleOpenBranchFolder` function**:
- **New behavior**: Open the active version folder instead of branch root
- **Fallback**: Open branch root for legacy installations
- **Path construction**: `branches/branchName/activeVersion/` or `branches/branchName/`

## Technical Details

### Version-Specific Structure
The new directory structure is:
```
managed-env/
├── branches/
│   ├── main-branch/
│   │   ├── 123456/          # Build ID subdirectory
│   │   │   ├── Schedule I.exe
│   │   │   └── ... (game files)
│   │   └── 789012/          # Another build ID
│   │       ├── Schedule I.exe
│   │       └── ... (game files)
│   └── beta-branch/
│       └── 345678/
│           ├── Schedule I.exe
│           └── ... (game files)
```

### Active Version Resolution
- **Source**: `config.activeBuildPerBranch[branchName]`
- **Set during**: Setup wizard completion and version downloads
- **Used for**: Executable path resolution, folder opening, repair detection

## Files Modified
- `src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx`

## Benefits
1. **Correct repair detection** - Branches no longer show as needing repair after successful downloads
2. **Proper executable launching** - Games launch from the correct active version directory
3. **Accurate folder opening** - File explorer opens the active version folder
4. **Backward compatibility** - Legacy installations still work
5. **Version-specific support** - Full support for multi-version branch management

## Testing
- Build completed successfully
- No linting errors
- Logic handles both new and legacy directory structures
- Active version resolution works correctly
