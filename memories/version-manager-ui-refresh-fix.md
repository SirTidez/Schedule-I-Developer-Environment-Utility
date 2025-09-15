# Version Manager UI Refresh Fix

## Issue
Switching active versions in the version manager dialog didn't update the UI without closing and reopening the window. The build ID, action buttons, and other UI elements weren't reflecting the new active branch.

## Root Cause
The VersionManagerDialog was calling the config service to update the active version but wasn't refreshing its own display to show the changes. Additionally, there was redundant code in ManagedEnvironment that was setting the active version twice.

## Solution
1. **VersionManagerDialog.tsx**: Added `await loadVersions()` calls in both `handleSetActive` and `handleSetActiveManifest` functions to refresh the dialog's display after setting the active version.

2. **ManagedEnvironment.tsx**: Simplified the `handleVersionChange` function to only refresh the branches list, removing redundant config updates since the VersionManagerDialog already handles them.

## Files Modified
- `src/renderer/components/VersionManager/VersionManagerDialog.tsx`
- `src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx`

## Testing
The version switching should now properly update:
- Active version indicators in the version manager dialog
- Build ID display in the main interface
- Action buttons for the selected branch
- All UI elements should reflect the new active branch without requiring a dialog restart

## Date
2024-12-19
