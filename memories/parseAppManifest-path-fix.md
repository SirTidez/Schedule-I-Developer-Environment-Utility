# parseAppManifest Path Construction Fix

## Issue

The `parseAppManifest` method in `SteamService.ts` was incorrectly constructing manifest paths by adding `'steamapps'` to the `libraryPath` parameter, causing it to look for manifests in `steamapps/steamapps/` instead of the correct `steamapps/` directory.

## Root Cause

The `detectSteamLibraries()` and `getSteamLibraries()` methods return paths that are already `steamapps` directories (e.g., `C:\Steam\steamapps`), but the `parseAppManifest` method was treating these as Steam library root paths and incorrectly appending `'steamapps'` to them.

## Solution

Updated `parseAppManifest` method to use the correct path construction:

**Before:**

```typescript
const manifestPath = path.join(libraryPath, 'steamapps', `appmanifest_${appId}.acf`);
```

**After:**

```typescript
const manifestPath = path.join(libraryPath, `appmanifest_${appId}.acf`);
```

## Files Modified

- `src/main/services/SteamService.ts`: Fixed `parseAppManifest` method path construction and updated JSDoc comment

## Verification

All usage patterns were audited and found to be consistent:

- `steamHandlers.ts`: IPC handlers correctly pass libraryPath as received from renderer
- `VersionMigrationService.ts`: Uses `getSteamLibraries()` which returns steamapps paths
- `useSteamService.ts`: Hook that calls IPC handlers, correctly passes paths through

## Impact

This fix ensures that app manifest parsing works correctly across all Steam library paths, preventing "manifest not found" errors when the application tries to read Steam app manifests.

## Date

2024-12-19
