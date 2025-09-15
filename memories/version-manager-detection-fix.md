# Version Manager Detection Fix

## Issue
The Version Manager was not detecting installed versions correctly and was showing 0 versions for all branches. The logs showed "Found 0 installed versions for branch Alternate Beta" which indicated a branch name mapping issue.

## Root Cause
The VersionManagerDialog was receiving the display name (e.g., "Alternate Beta") instead of the folder name (e.g., "alternate-beta-branch") that the `getInstalledVersions` function expected.

## Changes Made

### 1. Fixed Branch Name Mapping
**File**: `src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx`

- **Added `folderName` property** to `BranchInfo` interface
- **Updated branch creation** to include `folderName: branch.folderName`
- **Fixed VersionManagerDialog call** to pass `selectedBranchForVersionManager.folderName` instead of `selectedBranchForVersionManager.name`

### 2. Added Debugging Logs
**File**: `src/main/utils/pathUtils.ts`

- **Enhanced `listBranchVersions` function** with detailed debugging output
- **Added path existence checks** and directory listing information
- **Added version directory processing logs** to help diagnose issues

## Technical Details

### Before Fix
```typescript
// VersionManagerDialog received display name
branchName={selectedBranchForVersionManager.name} // "Alternate Beta"

// getInstalledVersions expected folder name
const branchBasePath = getBranchBasePath(managedEnvironmentPath, "Alternate Beta");
// This would look for: D:\...\branches\Alternate Beta\ (doesn't exist)
```

### After Fix
```typescript
// VersionManagerDialog now receives folder name
branchName={selectedBranchForVersionManager.folderName} // "alternate-beta-branch"

// getInstalledVersions gets correct folder name
const branchBasePath = getBranchBasePath(managedEnvironmentPath, "alternate-beta-branch");
// This looks for: D:\...\branches\alternate-beta-branch\ (exists)
```

## Verification
The debugging logs now show:
- ✅ Correct branch folder names being passed
- ✅ Version directories being found (e.g., "19748444 (dir)")
- ✅ Proper version detection working
- ✅ "Found 1 installed versions for branch alternate-beta-branch"

## Impact
- Version Manager now correctly detects installed versions
- Users can see and manage their installed game versions
- Branch repair detection works with the correct directory structure
- Debugging information helps troubleshoot future issues
