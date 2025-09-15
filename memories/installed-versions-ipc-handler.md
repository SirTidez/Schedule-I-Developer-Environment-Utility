# Installed Versions IPC Handler Implementation

## Overview
Implemented the missing `steam:get-installed-versions` IPC handler to provide proper data alignment between the main process and renderer for the VersionManagerDialog component.

## Changes Made

### 1. IPC Handler Implementation (`src/main/ipc/steamBranchHandlers.ts`)
- Added `handleGetInstalledVersions` function that:
  - Reads `managedEnvironmentPath` and `activeBuildPerBranch` via `ConfigService`
  - Uses `listBranchVersions(managedEnvironmentPath, branchName)` from `pathUtils.ts` to scan directories
  - Sets `isActive` flag by comparing with `configService.getActiveBuild(branchName)`
  - Returns array with `{ buildId, path, isActive, downloadDate, sizeBytes }`
- Registered handler in `setupSteamBranchHandlers` function
- Added proper error handling and logging

### 2. Preload Types (`src/preload/index.ts`)
- Verified existing type definition already matched handler return format
- No changes needed as types were already correctly aligned

### 3. VersionManagerDialog Updates (`src/renderer/components/VersionManager/VersionManagerDialog.tsx`)
- Fixed data mapping to use actual `downloadDate` and `sizeBytes` from installed versions
- Previously was setting empty values and relying on merge with available versions
- Now properly displays real download dates and file sizes for installed builds

## Key Features
- **Accurate Data**: Installed versions now show real download dates and file sizes
- **Active Build Detection**: Correctly identifies and marks the currently active build
- **Error Handling**: Graceful fallback to empty arrays on errors
- **Type Safety**: Full TypeScript alignment between handler and renderer

## Testing
- Handler properly scans managed environment directory structure
- Active build marking works correctly with config service
- VersionManagerDialog displays installed builds with proper metadata
- No linting errors introduced

## Files Modified
- `src/main/ipc/steamBranchHandlers.ts` - Added handler implementation
- `src/renderer/components/VersionManager/VersionManagerDialog.tsx` - Fixed data mapping

## Dependencies
- Uses existing `ConfigService` for configuration access
- Leverages `pathUtils.listBranchVersions` for directory scanning
- Integrates with existing IPC handler registration system
