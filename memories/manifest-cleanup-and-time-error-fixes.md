# Manifest Cleanup and Time Error Fixes

## Issues Fixed

### 1. RangeError: Invalid time value in Managed Environment
- **Error**: `RangeError: Invalid time value` at `Date.toISOString()` in steamBranchHandlers
- **Root Cause**: `build.timeUpdated` values from Steam API could be undefined, null, or invalid
- **Solution**: Added proper validation and error handling for timestamp conversion
- **File**: `src/main/ipc/steamBranchHandlers.ts`

### 2. Manifest Directory Not Being Deleted
- **Issue**: Both `manifest_<manifest_id>` and `build_<manifest_id>` folders had full game installs
- **Root Cause**: Cleanup function only removed directories if they were empty, but we want to remove them after copying regardless
- **Solution**: Updated cleanup function to always remove manifest directory after copying contents
- **File**: `src/main/ipc/depotdownloaderHandlers.ts`

## Changes Made

### 1. Fixed Time Value Error
- **Function**: `handleListBranchBuilds` in `steamBranchHandlers.ts`
- **Added**: Validation for `build.timeUpdated` values before creating Date objects
- **Added**: Try-catch block around Date conversion with fallback to current time
- **Added**: Warning logs for invalid timestamps
- **Impact**: Prevents crashes when Steam API returns invalid timestamp data

### 2. Fixed Manifest Directory Cleanup
- **Function**: Renamed `cleanupEmptyManifestDirectory` to `cleanupManifestDirectory`
- **Changed**: Always removes manifest directory after copying, regardless of contents
- **Updated**: All function calls to use new function name
- **Impact**: Ensures manifest directories are properly cleaned up after copy operation

## Code Changes

### Time Error Fix
```typescript
// Before
date: new Date(build.timeUpdated * 1000).toISOString(),

// After
let date: string;
if (build.timeUpdated && typeof build.timeUpdated === 'number' && build.timeUpdated > 0) {
  try {
    date = new Date(build.timeUpdated * 1000).toISOString();
  } catch (error) {
    console.warn(`Invalid timestamp for build ${build.buildId}: ${build.timeUpdated}`);
    date = new Date().toISOString(); // Fallback to current time
  }
} else {
  console.warn(`Missing or invalid timeUpdated for build ${build.buildId}: ${build.timeUpdated}`);
  date = new Date().toISOString(); // Fallback to current time
}
```

### Manifest Cleanup Fix
```typescript
// Before
async function cleanupEmptyManifestDirectory(manifestDirectory: string): Promise<void> {
  // Check if directory is empty
  const contents = await fs.readdir(manifestDirectory);
  if (contents.length === 0) {
    await fs.remove(manifestDirectory);
  }
}

// After
async function cleanupManifestDirectory(manifestDirectory: string): Promise<void> {
  // Always remove the manifest directory after copying contents to build directory
  await fs.remove(manifestDirectory);
}
```

## Benefits
- ✅ Prevents crashes in Managed Environment window
- ✅ Properly cleans up manifest directories after copy
- ✅ Robust error handling for invalid Steam API data
- ✅ Maintains application stability with fallback values
- ✅ Ensures only build directories remain after downloads

## Testing
- ✅ Build completed successfully with no compilation errors
- ✅ Time error handling prevents crashes from invalid timestamps
- ✅ Manifest directories are now properly removed after copy

## Files Modified
- `src/main/ipc/steamBranchHandlers.ts` - Fixed time value error
- `src/main/ipc/depotdownloaderHandlers.ts` - Fixed manifest cleanup

## Date
2024-12-19
