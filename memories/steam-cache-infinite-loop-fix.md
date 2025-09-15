# Steam Cache Infinite Loop Fix

## Problem
The Steam game info caching system was stuck in an infinite loop of fetching fresh Steam game info due to a circular dependency issue during initialization.

## Root Cause
The `SteamGameInfoCache` constructor was trying to pass `this` (the SteamUpdateService) to itself before the SteamUpdateService was fully constructed, creating a circular dependency and initialization loop.

## Solution
Fixed the circular dependency by:

### 1. Modified SteamGameInfoCache Constructor
- **Before**: Required `SteamUpdateService` in constructor
- **After**: Constructor only takes `LoggingService` and optional config
- **Added**: `setSteamUpdateService()` method to set the service reference after construction

### 2. Updated SteamUpdateService Initialization
- **Before**: `new SteamGameInfoCache(loggingService, this, config)`
- **After**: `new SteamGameInfoCache(loggingService, config)` then `cache.setSteamUpdateService(this)`

### 3. Added Safety Checks
- **Service Availability**: Check if `steamUpdateService` is available before using it
- **Update State Check**: Prevent infinite loops by checking if cache is already updating
- **Graceful Fallback**: Fall back to direct API calls if cache is unavailable

## Code Changes

### SteamGameInfoCache.ts
```typescript
// Before
constructor(loggingService: LoggingService, steamUpdateService: any, config?: Partial<CacheConfig>)

// After  
constructor(loggingService: LoggingService, config?: Partial<CacheConfig>)
public setSteamUpdateService(steamUpdateService: any): void
```

### SteamUpdateService.ts
```typescript
// Before
this.gameInfoCache = new SteamGameInfoCache(loggingService, this, config);

// After
this.gameInfoCache = new SteamGameInfoCache(loggingService, config);
this.gameInfoCache.setSteamUpdateService(this);
```

### Added Safety Checks
```typescript
// Check if Steam Update Service is available
if (!this.steamUpdateService) {
  throw new Error('Steam Update Service not available');
}

// Check if we're already in a cache update to prevent infinite loops
if (this.gameInfoCache && this.gameInfoCache.getCacheStats().isUpdating) {
  return await this.fetchAllBranchBuildIdsFromSteam();
}
```

## Benefits
- **Eliminates Infinite Loop**: No more circular dependency during initialization
- **Proper Initialization Order**: Services are constructed in the correct sequence
- **Better Error Handling**: Graceful fallback when cache is unavailable
- **Maintains Performance**: Still provides caching benefits without the loop issue

## Testing
- ✅ Build compiles successfully
- ✅ No circular dependency errors
- ✅ Cache initialization works properly
- ✅ Fallback to direct API calls when needed

## Files Modified
- `src/main/services/SteamGameInfoCache.ts`
- `src/main/services/SteamUpdateService.ts`

The caching system now works correctly without infinite loops while maintaining the performance benefits of reduced Steam API calls.
