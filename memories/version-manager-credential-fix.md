# Version Manager Credential Fix (2025-01-10) ✅

## Problem
Users were getting an error when trying to add a new version saying they need to enter Steam credentials, even though they were already logged in. The issue was that the Version Manager dialog was trying to retrieve Steam credentials from the config file instead of using the cached credentials.

## Root Cause
The application has two separate credential systems:
1. **Persistent Storage**: `CredentialService` stores encrypted credentials on disk
2. **In-Memory Cache**: `credentialCacheHandlers.ts` stores credentials temporarily in memory

The `handleAddVersion` function in `VersionManagerDialog.tsx` was incorrectly trying to get credentials from the config:
```typescript
// WRONG - trying to get from config
const config = await window.electronAPI.config.get();
const username = config.steamUsername || '';
const password = config.steamPassword || '';
```

## Solution
Updated `handleAddVersion` to use cached credentials instead:
```typescript
// CORRECT - using cached credentials
const credResult = await window.electronAPI.credCache.get();
if (!credResult.success || !credResult.credentials) {
  setError('Steam credentials not found. Please login to Steam first or use the Steam login section to authenticate.');
  return;
}
const { username, password } = credResult.credentials;
```

## Changes Made
- **VersionManagerDialog.tsx**: Fixed `handleAddVersion` function to use `window.electronAPI.credCache.get()` instead of config
- **Error Handling**: Added proper error message directing users to login first
- **Debugging**: Added console logging to help troubleshoot credential issues

## Files Modified
- `src/renderer/components/VersionManager/VersionManagerDialog.tsx`

## Testing
- Users should now be able to add new versions without re-entering Steam credentials
- If no cached credentials are available, users get a clear error message
- The fix maintains consistency with other parts of the app that already use cached credentials

## Status: Complete ✅
The Version Manager now properly uses cached Steam credentials for adding new versions, eliminating the need for users to re-enter credentials when they're already logged in.
