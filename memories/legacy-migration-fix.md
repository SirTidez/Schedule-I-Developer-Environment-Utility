# Legacy Migration Fix Implementation

**Date**: 2024-12-19  
**Version**: 2.2.0  
**Type**: Bug Fix / Feature Enhancement

## Problem Description

The migration system was not properly handling the old config structure where branches were installed directly to `<branchid>` directories with files directly inside them. The old migration logic was disabled and designed for a different scenario (build_* to manifest_* migration).

## Root Cause

1. **Old Structure**: Branches were installed directly to `branches/<branchid>/` with game files directly inside
2. **New Structure**: Branches should be in `build_<manifest_id>` subdirectories (e.g., `branches/main-branch/build_12345678/`)
3. **Migration Logic**: The existing migration was disabled and designed for build_* to manifest_* migration, not flat structure migration

## Solution Implemented

### 1. Updated Legacy Detection (`VersionMigrationService.ts`)

- **New Detection Logic**: Detects legacy flat structure by checking if branch directories contain files directly (not subdirectories)
- **Manifest Extraction**: Reads `appmanifest_*.acf` files from branch directories to extract manifest IDs
- **Primary Depot Priority**: Prefers depot 3164501 (primary depot) for manifest ID extraction

### 2. Updated Migration Process

- **Directory Structure**: Moves files from flat structure to `build_<manifest_id>` directories
- **Config Updates**: Updates configuration with manifest ID as both build ID and manifest ID
- **Active Build Setting**: Sets the migrated version as the active build for the branch

### 3. Updated Validation and Rollback

- **Validation**: Checks for remaining flat structures and empty build directories
- **Rollback**: Restores build directories back to flat structure if needed

### 4. Updated UI (`MigrationDialog.tsx`)

- **Clear Messaging**: Updated dialog text to reflect the new migration process
- **User Guidance**: Explains that files will be moved to `build_<manifest_id>` directories

## Key Changes

### Files Modified

1. **`src/main/services/VersionMigrationService.ts`**
   - Completely rewrote `detectLegacyInstallations()` method
   - Added `detectLegacyBranchStructure()` helper method
   - Added `extractManifestIdFromBranch()` method
   - Added `parseManifestIdFromContent()` method
   - Updated `migrateInstallationToManifestId()` for new structure
   - Updated validation and rollback logic

2. **`src/renderer/components/MigrationDialog.tsx`**
   - Updated UI text to reflect new migration process
   - Changed messaging from "manifest ID versioning" to "build directory structure"
   - Added explanation of `build_<manifest_id>` structure

## Technical Details

### Legacy Detection Algorithm

```typescript
// Check if branch has files directly in it (legacy) vs subdirectories (new)
const hasDirectFiles = entries.some(entry => entry.isFile());
const hasSubdirectories = entries.some(entry => entry.isDirectory());
return hasDirectFiles && !hasSubdirectories;
```

### Manifest ID Extraction

```typescript
// Look for InstalledDepots section in appmanifest
const installedDepotsMatch = content.match(/"InstalledDepots"\s*\{([^}]+)\}/);
// Extract manifest ID from depot blocks, preferring depot 3164501
```

### Migration Process

1. Detect legacy flat structure in branch directories
2. Extract manifest ID from `appmanifest_*.acf` files
3. Create new `build_<manifest_id>` directory
4. Move all files from flat structure to new directory
5. Update configuration with manifest ID as build ID
6. Set as active build for the branch

## Additional Improvements (v2.2.0 Update)

### Selective Migration Detection

- **Precise Detection**: Only shows migration dialog for branches that actually need migration
- **Smart Logic**: Checks if branch has files directly in it AND no build_/manifest_ subdirectories
- **No False Positives**: Branches already using new structure are ignored
- **Per-Branch Analysis**: Each branch is evaluated individually

### Updated Detection Algorithm

```typescript
// A branch needs migration if:
// 1. It has files directly in the branch directory (legacy flat structure)
// 2. It does NOT have any build_ or manifest_ subdirectories
const needsMigration = hasDirectFiles && !hasVersionSubdirs;
```

### UI Improvements

- **Clearer Messaging**: Updated dialog text to reflect selective migration
- **Branch-Specific**: Shows only branches that actually need migration
- **Better User Experience**: No unnecessary migration dialogs

## Testing

- [ ] Test with actual legacy installations
- [ ] Verify manifest ID extraction works correctly
- [ ] Test migration process with various branch structures
- [ ] Test rollback functionality
- [ ] Verify configuration updates correctly
- [ ] Test that migration dialog only shows when needed
- [ ] Test that already-migrated branches are ignored

## Impact

- **Backward Compatibility**: Users with old flat structure can now migrate properly
- **Data Preservation**: All files are moved (not copied) to maintain data integrity
- **Configuration Accuracy**: Manifest IDs are properly extracted and stored
- **User Experience**: Clear migration process with progress tracking

## Notes

- The migration uses `build_<manifest_id>` naming as requested by the user
- Manifest ID is used as both build ID and manifest ID in the configuration
- The migration preserves all files and directory structure within the branch
- Rollback functionality allows users to restore the flat structure if needed
