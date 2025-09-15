# Steam Connection and Manifest ID Fixes (2025-01-10)

## Overview
Fixed two critical issues in the Schedule I Developer Environment Utility:
1. Steam Update Service connection issue causing "Steam Update Service not connected" errors
2. SetupWizard using buildId instead of manifestId for branch installations

## Issues Fixed

### 1. Steam Update Service Connection Issue ✅

**Problem**: The `getRecentBuildsForBranch` method was being called before the Steam connection was fully established, causing "Steam Update Service not connected" errors.

**Root Cause**: The `connect()` method in `SteamUpdateService.ts` was calling `steamUser.logOn()` but not waiting for the connection to be established. The connection is established asynchronously through the `loggedOn` event handler.

**Solution**: Modified the `connect()` method to wait for the connection to be established using a Promise that resolves when the `loggedOn` event is fired.

**Technical Details**:
- Added a connection promise that waits for the `loggedOn` event
- Added a 30-second timeout to prevent hanging
- Added proper error handling for connection failures
- Ensured the method only resolves when the connection is fully established

**Files Modified**:
- `src/main/services/SteamUpdateService.ts`: Enhanced `connect()` method with proper async waiting

### 2. SetupWizard Manifest ID Usage Fix ✅

**Problem**: The SetupWizard was using buildId for directory structure instead of manifestId, which is the correct approach for version management.

**Root Cause**: Both `copyBranchFiles` and `downloadBranchWithDepotDownloader` functions were using buildId for the directory path structure instead of getting and using manifest IDs.

**Solution**: Modified both functions to:
1. Get depot manifests for the build ID using `getDepotManifestsForBuild`
2. Extract the manifest ID from the first depot
3. Use manifest-based directory structure (`manifest_${manifestId}`)
4. Update DepotDownloader calls to use manifest-specific methods

**Technical Details**:
- Added depot manifest retrieval before directory creation
- Changed directory structure from `build_${buildId}` to `manifest_${manifestId}`
- Updated DepotDownloader calls to use `downloadBranchVersionByManifest`
- Maintained build ID storage for compatibility
- Added proper error handling for manifest retrieval failures

**Files Modified**:
- `src/renderer/components/SetupWizard/steps/CopyProgressStep.tsx`: Updated both copy and download methods to use manifest IDs

## Benefits Achieved

### Steam Connection Fix
1. **Reliability**: Steam Update Service now properly waits for connection before operations
2. **Error Prevention**: Eliminates "Steam Update Service not connected" errors
3. **User Experience**: Branch builds listing now works consistently
4. **Timeout Protection**: 30-second timeout prevents hanging connections

### Manifest ID Usage Fix
1. **Correct Version Management**: Uses manifest IDs for precise version tracking
2. **Consistency**: Aligns with Version Manager and other components
3. **Future-Proof**: Ready for advanced version management features
4. **Directory Structure**: Proper `manifest_${manifestId}` naming convention

## Technical Implementation

### Steam Connection Enhancement
```typescript
// Create a promise that resolves when connection is established
const connectionPromise = new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => {
    this.isConnecting = false;
    reject(new Error('Steam connection timeout'));
  }, 30000); // 30 second timeout

  const onLoggedOn = () => {
    clearTimeout(timeout);
    this.steamUser.off('loggedOn', onLoggedOn);
    this.steamUser.off('error', onError);
    resolve();
  };

  const onError = (error: Error) => {
    clearTimeout(timeout);
    this.steamUser.off('loggedOn', onLoggedOn);
    this.steamUser.off('error', onError);
    this.isConnecting = false;
    reject(error);
  };

  this.steamUser.once('loggedOn', onLoggedOn);
  this.steamUser.once('error', onError);
});

// Login anonymously - no credentials required
this.steamUser.logOn({
  anonymous: true
});

// Wait for connection to be established
await connectionPromise;
```

### Manifest ID Usage
```typescript
// Get depot manifests for this build to get manifest IDs
const depotResult = await window.electronAPI.steamBranch.getDepotManifestsForBuild(buildId);
if (!depotResult.success || !depotResult.depots || depotResult.depots.length === 0) {
  throw new Error(`Could not get depot manifests for build ${buildId}: ${depotResult.error || 'No depots found'}`);
}

// Use the first depot's manifest ID for the directory structure
const manifestId = depotResult.depots[0].manifestId;

// Use manifest-based path structure
const branchVersionPath = `${managedEnvironmentPath}/branches/${branch}/manifest_${manifestId}`;
```

## Testing Results

### Steam Connection Fix
- ✅ Steam Update Service now connects properly before operations
- ✅ Branch builds listing works without connection errors
- ✅ Timeout protection prevents hanging connections
- ✅ Error handling works correctly for connection failures

### Manifest ID Usage Fix
- ✅ SetupWizard now uses manifest IDs for directory structure
- ✅ Both copy and DepotDownloader methods use manifest IDs
- ✅ Directory structure follows `manifest_${manifestId}` convention
- ✅ Maintains compatibility with existing build ID storage

## Status: Complete ✅

Both issues have been successfully resolved. The Steam Update Service now properly waits for connections before operations, and the SetupWizard uses manifest IDs for correct version management. The application should now work correctly without the reported errors.

