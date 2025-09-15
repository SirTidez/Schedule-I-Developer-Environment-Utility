# Branch Path Construction Fix

## Issue
The setup wizard was creating incorrect directory structures when downloading branches using DepotDownloader. Instead of creating the expected structure:
```
Dev Env/branches/alternate-beta-branch/
```

It was creating a nested structure:
```
Dev Env/branches/branches/alternate-beta-branch/
```

## Root Cause
The CopyProgressStep component was manually constructing branch paths using string concatenation instead of using the centralized path utility functions. This led to inconsistent path construction and the creation of nested `branches` directories.

## Solution
1. **Created pathUtils IPC handlers** - Added `src/main/ipc/pathUtilsHandlers.ts` to expose path utility functions to the renderer process
2. **Updated preload API** - Added `pathUtils` section to `src/preload/index.ts` with proper TypeScript definitions
3. **Registered handlers** - Added `setupPathUtilsHandlers()` call to `src/main/index.ts`
4. **Fixed CopyProgressStep** - Updated `downloadBranchWithDepotDownloader()` to use `window.electronAPI.pathUtils.getBranchVersionPath()` instead of manual string concatenation
5. **Fixed other components** - Updated all components that were manually constructing branch paths:
   - `ManagedEnvironment.tsx`
   - `CopyProgress.tsx` 
   - `DefaultModsProgress.tsx`

## Key Changes
- **Before**: `${managedEnvironmentPath}/branches/${branch}/${manifestId}`
- **After**: `await window.electronAPI.pathUtils.getBranchVersionPath(managedEnvironmentPath, branch, manifestId, 'manifest')`

## Benefits
- Consistent path construction across all components
- Proper use of centralized utility functions
- Eliminates the nested `branches` directory issue
- Better maintainability and error handling
- Cross-platform path compatibility

## Files Modified
- `src/main/ipc/pathUtilsHandlers.ts` (new)
- `src/preload/index.ts`
- `src/main/index.ts`
- `src/renderer/components/SetupWizard/steps/CopyProgressStep.tsx`
- `src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx`
- `src/renderer/components/CopyProgress/CopyProgress.tsx`
- `src/renderer/components/DefaultModsProgress/DefaultModsProgress.tsx`

## Testing
The fix ensures that branch downloads now create the correct directory structure:
```
Dev Env/
├── branches/
│   ├── alternate-beta-branch/
│   │   └── manifest_941591400057088607/
│   │       ├── Schedule I.exe
│   │       ├── Schedule I_Data/
│   │       └── ...
│   └── beta-branch/
│       └── manifest_5895781832173514260/
│           ├── Schedule I.exe
│           ├── Schedule I_Data/
│           └── ...
```

