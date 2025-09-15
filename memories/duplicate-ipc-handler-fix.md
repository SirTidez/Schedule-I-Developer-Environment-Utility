# Duplicate IPC Handler Fix

## Issue
The application was throwing an `UnhandledPromiseRejectionWarning` about attempting to register a second handler for `'steam:get-installed-versions'`. This was caused by having the same IPC handler registered in two different files.

## Root Cause
Two files were registering handlers for the same IPC channel:
1. `src/main/ipc/steamHandlers.ts` - Line 154
2. `src/main/ipc/steamBranchHandlers.ts` - Line 398

## Solution
Removed the duplicate handler from `steamHandlers.ts` since the more comprehensive implementation exists in `steamBranchHandlers.ts`.

## Changes Made
- **Removed duplicate handler** from `src/main/ipc/steamHandlers.ts`
- **Kept the comprehensive handler** in `src/main/ipc/steamBranchHandlers.ts` which includes:
  - Proper error handling
  - Service injection
  - Active version detection
  - Better logging

## Technical Details
The handler in `steamBranchHandlers.ts` is more robust because it:
- Uses injected services (SteamUpdateService, ConfigService, LoggingService)
- Has proper error handling with fallback to empty array
- Includes comprehensive logging
- Handles active version detection correctly

## Files Modified
- `src/main/ipc/steamHandlers.ts` (removed duplicate handler)

## Files Referenced
- `src/main/ipc/steamBranchHandlers.ts` (kept comprehensive handler)
- `src/preload/index.ts` (IPC channel definition)

## Result
The duplicate handler error is resolved and the application should start without warnings.
