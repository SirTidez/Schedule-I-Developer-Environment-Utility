# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

**Build the application:**
```bash
npm run build
```

**Run the application in development:**
```bash
npm run dev
```

**Run the application (production):**
```bash
npm start
```

**Package the application:**
```bash
npm run package
```

## Architecture Overview

This is an Electron application built with TypeScript and React that manages development environments for the Steam game "Schedule I". The application provides automated branch management, DepotDownloader integration, and comprehensive Steam library detection.

### Core Architecture Patterns

**Electron Multi-Process Architecture**: The application uses Electron's standard architecture:
- **Main Process**: Node.js backend handling system operations and Steam integration
- **Renderer Process**: React frontend with secure IPC communication
- **Preload Script**: Secure bridge between main and renderer processes

**IPC Communication**: All communication between processes uses Electron's IPC system with type-safe interfaces defined in the preload script.

### Key Components

**Main Process Services** (`src/main/services/`):
- `ConfigService`: Manages persistent configuration storage in AppData with DepotDownloader settings
- `LoggingService`: File-based logging implementation
- `CredentialService`: Secure Steam credential storage and encryption
- `UpdateService`: Application update checking and management

**IPC Handlers** (`src/main/ipc/`):
- `steamHandlers.ts`: Steam library detection, manifest parsing, and branch detection
- `depotdownloaderHandlers.ts`: DepotDownloader integration replacing legacy SteamCMD
- `configHandlers.ts`: Configuration management operations
- `fileHandlers.ts`: File operations with progress tracking
- `steamLoginHandlers.ts`: Steam authentication and credential management

**React Components** (`src/renderer/components/`):
- `SetupWizard/`: Multi-step setup process with DepotDownloader configuration
- `ManagedEnvironment/`: Main interface for environment management
- `Settings/`: Configuration and preferences management
- Progress dialogs and confirmation components

**Shared Types** (`src/shared/types.ts`):
- `DevEnvironmentConfig`: Central configuration interface with DepotDownloader integration
- Steam-related interfaces and branch management types

### Application State Management

**Configuration Storage**: Uses JSON serialization to AppData (`%LOCALAPPDATA%\TVGS\Schedule I\Developer Env\config\`)

**Branch Management**: Supports four branch types: main-branch, beta-branch, alternate-branch, alternate-beta-branch

**DepotDownloader Integration Features**:
- Modern Steam depot downloading with simplified command syntax
- Automatic Steam Guard support with QR codes
- Parallel downloads with configurable thread counts
- Better error handling and progress reporting compared to legacy SteamCMD
- Installation via Windows Package Manager (winget) or manual download
- Manifest-based build ID extraction for branch verification

**Steam Integration Features**:
- Automatic Steam library detection with multi-library support
- Steam manifest parsing for build ID extraction
- Branch detection via Steam's appinfo files
- Wait-for-branch-switch functionality for user-initiated Steam branch changes

### UI Design Principles

**Modern Electron Interface**: Dark-themed interface with:
- Custom title bar with window controls
- Progress tracking for file operations
- Multi-step setup wizard
- Responsive layout design

**User Experience**: Prioritizes simplicity and automation:
- Guided setup process with validation
- Real-time progress feedback
- Clear error messaging and recovery options

### Dependencies

**Core Framework**:
- Electron with TypeScript
- React for the renderer process
- Node.js backend services

**Key Dependencies**:
- `electron`: Application framework
- `react`: UI library for renderer process
- Various Node.js packages for Steam integration and file operations

## Development Notes

**DepotDownloader Migration**:
- Migrated from legacy SteamCMD to modern DepotDownloader for improved reliability
- Simplified command syntax: `-app 3164500 -branch beta -username user -password pass -dir path`
- Better Steam Guard support with QR code authentication
- Parallel downloads with configurable thread counts
- Enhanced error handling and progress reporting

**Key Technical Details**:
- **Steam App ID**: Schedule I is hardcoded as "3164500"
- **Branch Mapping**: main-branch → public, beta-branch → beta, etc.
- **Build ID Extraction**: Uses manifest files instead of SteamCMD's app_info_print
- **Configuration**: Stored in `%LOCALAPPDATA%\TVGS\Schedule I\Developer Env\config\`

**Architecture Patterns**:
- IPC handlers in main process for all system operations
- Type-safe API exposure through preload script
- React components with progress tracking and validation
- Secure credential storage with encryption

**Testing Strategy**:
- Manual testing of UI flows and Steam integration
- Validation of DepotDownloader installation and authentication
- Progress tracking verification for file operations
- Configuration persistence testing

**File Operations**: Large file operations (environment copying and downloading) show progress with proper cancellation support through Electron IPC communication.