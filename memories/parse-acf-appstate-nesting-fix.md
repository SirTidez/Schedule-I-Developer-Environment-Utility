# ParseACFContent AppState Nesting Fix

## Overview
Updated the `parseACFContent` function in `SteamService.ts` to properly handle the nested structure of Steam ACF (Application Cache File) manifests where the main data is contained within an `AppState` object.

## Problem
The original `parseACFContent` function was directly accessing properties from the root level of the parsed VDF data (`vdfData.buildid`, `vdfData.StateFlags`, etc.), but Steam ACF files actually have their main data nested under an `AppState` key.

## Solution
Modified the function to:
1. Extract the data from `vdfData.AppState` if it exists, otherwise fall back to `vdfData`
2. Use the extracted data object for all property access
3. Maintain the existing regex fallback mechanism unchanged

## Implementation Details

### Code Changes
```typescript
// Before
private parseACFContent(content: string): AppManifest {
  try {
    const vdfData = this.parseVDF(content);
    
    return {
      buildId: vdfData.buildid ? parseInt(vdfData.buildid) : 0,
      name: vdfData.name || '',
      state: vdfData.StateFlags ? parseInt(vdfData.StateFlags) : 0,
      lastUpdated: vdfData.LastUpdated ? parseInt(vdfData.LastUpdated) : 0,
      installedDepots: this.parseInstalledDepots(vdfData.InstalledDepots)
    };
  } catch (error) {
    console.error('Error parsing ACF content:', error);
    return this.parseACFContentRegex(content);
  }
}

// After
private parseACFContent(content: string): AppManifest {
  try {
    const vdfData = this.parseVDF(content);
    const data = vdfData.AppState ?? vdfData;
    
    return {
      buildId: data.buildid ? parseInt(data.buildid) : 0,
      name: data.name || '',
      state: data.StateFlags ? parseInt(data.StateFlags) : 0,
      lastUpdated: data.LastUpdated ? parseInt(data.LastUpdated) : 0,
      installedDepots: this.parseInstalledDepots(data.InstalledDepots)
    };
  } catch (error) {
    console.error('Error parsing ACF content:', error);
    return this.parseACFContentRegex(content);
  }
}
```

### Key Changes
1. **Data Extraction**: `const data = vdfData.AppState ?? vdfData;`
2. **Property Access**: All properties now accessed via `data` instead of `vdfData`
3. **Backward Compatibility**: Fallback to `vdfData` if `AppState` doesn't exist
4. **Regex Fallback**: Unchanged as requested

## ACF File Structure
Steam ACF files have the following structure:
```
"AppState"
{
    "appid"        "3164500"
    "Universe"     "1"
    "name"         "Schedule I"
    "StateFlags"   "4"
    "installdir"   "Schedule I"
    "buildid"      "1234567"
    "LastUpdated"  "1640995200"
    "InstalledDepots"
    {
        "3164501"  "5895781832173514260"
    }
}
```

## Testing
- Created and ran test script to verify the updated logic works correctly
- Test confirmed that `buildId`, `name`, `state`, and `lastUpdated` are properly extracted
- Verified that the fallback mechanism remains functional
- No linting errors introduced

## Files Modified
- `src/main/services/SteamService.ts`: Updated `parseACFContent` method

## Benefits
1. **Correct Parsing**: ACF files are now parsed according to their actual structure
2. **Backward Compatibility**: Still works with files that don't have AppState nesting
3. **Robust Fallback**: Maintains existing regex fallback for error cases
4. **No Breaking Changes**: Existing functionality preserved

## Status: Complete ✅
The `parseACFContent` function now correctly handles the nested AppState structure in Steam ACF files while maintaining backward compatibility and the existing regex fallback mechanism.
