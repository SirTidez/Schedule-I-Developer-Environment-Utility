# Steam Cache Infinite Loop Fix v2

## Problem
The Steam game info caching system was still stuck in an infinite loop even after the initial circular dependency fix. The issue was that the cache was calling `getAllBranchBuildIds()` which then called the cache again, creating a circular call pattern.

## Root Cause Analysis
The circular call pattern was:
1. `getAllBranchBuildIds()` calls `gameInfoCache.getBranchBuildIds()`
2. `getBranchBuildIds()` calls `getGameInfo()`
3. `getGameInfo()` calls `updateCache()` when cache is empty
4. `updateCache()` calls `steamUpdateService.getAllBranchBuildIds()` 
5. This creates an infinite loop: `getAllBranchBuildIds()` → cache → `getAllBranchBuildIds()` → cache → ...

## Solution
Fixed the circular call by making the cache use the direct Steam API method instead of the cached method:

### Key Changes

#### 1. SteamGameInfoCache.ts
```typescript
// Before (causing circular call)
const [branchBuildIds, currentBranchKey] = await Promise.all([
  this.steamUpdateService.getAllBranchBuildIds(), // This calls the cache again!
  this.getCurrentBranchKeyFromSteam()
]);

// After (fixed)
const [branchBuildIds, currentBranchKey] = await Promise.all([
  this.steamUpdateService.fetchAllBranchBuildIdsFromSteam(), // Direct API call
  this.getCurrentBranchKeyFromSteam()
]);
```

#### 2. SteamUpdateService.ts
```typescript
// Made the direct API method public so cache can access it
public async fetchAllBranchBuildIdsFromSteam(): Promise<Record<string, string>> {
  // Direct Steam API call without cache
}
```

#### 3. Added Debugging and Safety Features
- **Console Logging**: Added detailed logging to track call flow
- **Bypass Mechanism**: Added environment variable bypass for testing
- **Update State Checks**: Prevent concurrent cache updates

### Call Flow (Fixed)
1. `getAllBranchBuildIds()` calls `gameInfoCache.getBranchBuildIds()`
2. `getBranchBuildIds()` calls `getGameInfo()`
3. `getGameInfo()` calls `updateCache()` when cache is empty
4. `updateCache()` calls `steamUpdateService.fetchAllBranchBuildIdsFromSteam()` (direct API)
5. Cache stores the result and returns it
6. Subsequent calls return cached data

### Testing Features Added
```typescript
// Environment variable to bypass cache for testing
const BYPASS_CACHE = process.env.NODE_ENV === 'development' && process.env.BYPASS_STEAM_CACHE === 'true';
if (BYPASS_CACHE) {
  return await this.fetchAllBranchBuildIdsFromSteam();
}
```

## Debugging Output
The fix includes comprehensive logging to track the call flow:
- `[SteamUpdateService] getAllBranchBuildIds called`
- `[SteamGameInfoCache] Starting cache update...`
- `[SteamGameInfoCache] Fetching fresh data from Steam...`
- `[SteamGameInfoCache] Fresh data fetched: [branch names]`

## Benefits
- **Eliminates Infinite Loop**: No more circular calls between cache and service
- **Maintains Performance**: Still provides 5-minute caching benefits
- **Better Debugging**: Comprehensive logging for troubleshooting
- **Testing Support**: Environment variable bypass for testing
- **Graceful Fallback**: Falls back to direct API calls when needed

## Files Modified
- `src/main/services/SteamGameInfoCache.ts`
- `src/main/services/SteamUpdateService.ts`

## Testing
To test the fix:
1. Run the application normally (cache enabled)
2. Set `BYPASS_STEAM_CACHE=true` in development to test without cache
3. Check console logs to verify no infinite loops
4. Confirm Steam API calls are reduced after initial load

The caching system now works correctly without infinite loops while maintaining the performance benefits of reduced Steam API calls.
