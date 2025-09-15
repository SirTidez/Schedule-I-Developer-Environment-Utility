# Steam Game Info Caching Optimization

## Overview
Implemented intelligent caching for Steam game information to reduce resource usage and improve performance. The optimization addresses the issue where Steam API calls were being made repeatedly every time branch information was loaded.

## Problem
- `getAllBranchBuildIds()` was being called every time `loadBranches()` was executed in ManagedEnvironment component
- This resulted in expensive Steam API calls being made multiple times unnecessarily
- Resource usage was high due to repeated network requests to Steam servers

## Solution
Created a comprehensive caching system with the following components:

### 1. SteamGameInfoCache Service (`src/main/services/SteamGameInfoCache.ts`)
- **Purpose**: Manages intelligent caching of Steam game information
- **Features**:
  - In-memory caching with configurable TTL (default: 5 minutes)
  - Automatic cache invalidation based on time and data freshness
  - Thread-safe operations for concurrent access
  - Background refresh when cache is 80% expired
  - Cache statistics for monitoring

### 2. Enhanced SteamUpdateService (`src/main/services/SteamUpdateService.ts`)
- **Integration**: Added SteamGameInfoCache as a dependency
- **Modified Methods**:
  - `getAllBranchBuildIds()`: Now uses cached data instead of direct API calls
  - `handleAppUpdate()`: Automatically invalidates cache when Steam data changes
- **New Methods**:
  - `getCacheStats()`: Returns cache statistics for monitoring
  - `invalidateGameInfoCache()`: Manual cache invalidation
  - `fetchAllBranchBuildIdsFromSteam()`: Direct API call method (private)

### 3. Updated ManagedEnvironment Component
- **Location**: `src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx`
- **Changes**: Added documentation comments explaining the caching optimization
- **Behavior**: Now benefits from cached data without code changes

## Technical Details

### Cache Configuration
```typescript
{
  ttlMs: 5 * 60 * 1000,        // 5 minutes cache TTL
  enableAutoRefresh: true,      // Enable background refresh
  refreshThreshold: 0.8         // Refresh when 80% of TTL has passed
}
```

### Cache Invalidation Triggers
1. **Automatic**: When Steam update events are detected
2. **Time-based**: When cache TTL expires
3. **Manual**: Via `invalidateGameInfoCache()` method

### Performance Benefits
- **Reduced API Calls**: Steam API calls reduced from multiple per session to once per 5 minutes
- **Faster Loading**: Cached data returns immediately instead of waiting for API response
- **Resource Efficiency**: Lower CPU and network usage
- **Better UX**: Faster branch loading and reduced loading times

## Implementation Notes

### Cache Lifecycle
1. **First Request**: Cache is empty, fetches data from Steam API
2. **Subsequent Requests**: Returns cached data if valid
3. **Background Refresh**: Automatically refreshes when 80% of TTL has passed
4. **Steam Updates**: Cache is invalidated when Steam data changes
5. **Manual Invalidation**: Can be manually invalidated if needed

### Error Handling
- Graceful fallback to direct API calls if cache fails
- Comprehensive error logging for debugging
- Cache statistics for monitoring health

## Files Modified
- `src/main/services/SteamGameInfoCache.ts` (new)
- `src/main/services/SteamUpdateService.ts` (modified)
- `src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx` (documentation)
- `src/main/ipc/steamHandlers.ts` (cache invalidation handler)

## Testing Recommendations
1. Verify cache works correctly on first load
2. Confirm cached data is returned on subsequent loads
3. Test cache invalidation when Steam data changes
4. Monitor cache statistics to ensure proper operation
5. Verify fallback behavior when cache fails

## Future Enhancements
- Persistent cache storage across application restarts
- Configurable cache TTL per data type
- Cache warming strategies
- Advanced cache eviction policies
