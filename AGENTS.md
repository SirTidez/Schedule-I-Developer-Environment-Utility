# Repository Guidelines

<<<<<<< Updated upstream
This guide helps coding agents work effectively in the Schedule I Developer Environment Utility repository (Electron + React + TypeScript).

## Project Structure & Module Organization
- `src/main/`: Electron main process. `services/` house ConfigService, SteamService, SteamUpdateService, UpdateService, VersionMigrationService, CredentialService, LoggingService, SteamGameInfoCache, and supporting utilities. `ipc/` registers all communication channels (steam, depotdownloader, config, file, dialog, migration, pathUtils, update, window, shell, melonLoader, credential cache, system).
- `src/preload/index.ts`: Secure bridge exposing a typed IPC surface. Keep the API minimal and reviewed when adding new channels.
- `src/renderer/`: React UI (Vite + Tailwind). `components/` contains dialogs, Setup Wizard, Managed Environment, Version Manager, etc. `hooks/` wrap IPC calls, caching, and validation logic. `styles/` holds global CSS overrides.
- `src/shared/types.ts`: Shared interfaces for config, branch builds, manifests, and IPC payloads.
- `tests/`: Vitest unit/contract suites (`tests/main`, `tests/preload`, `tests/renderer`) plus Playwright E2E flows in `tests/e2e`. `tests/setup` hosts common fixtures.
- `Assets/`: Icons, splash art, and screenshots referenced by electron-builder.
- `memories/`: Compressed change logs. Add a new entry describing significant behavioral updates.
- `depots/`: Cached DepotDownloader manifests for offline verification. Do not modify unless working on manifest tooling.
- Managed environment layout: `<ManagedEnv>/branches/<branch>/<version>` with sibling `logs/` and `temp/` directories. Config and logs live at `%USERPROFILE%/AppData/LocalLow/TVGS/Development Environment Manager/`.

## Build, Test, and Development Commands
- Install dependencies: `npm install`
- Run dev (Electron main + Vite renderer): `npm run dev`
- Build outputs: `npm run build`
- Launch built app: `npm start`
- Package installers (electron-builder): `npm run package`
- Unit tests: `npm run test` or `npm run test:watch`
- Coverage report: `npm run test:coverage`
- Playwright end-to-end tests: `npm run test:e2e`
- Clean build artifacts: `npm run clean`

## Coding Style & Practices
- TypeScript everywhere. Maintain strict typing, reuse shared interfaces, and avoid `any` unless absolutely necessary.
- Use two-space indentation and match existing file formatting. Prefer named exports.
- React components are functional with hooks. Complex renderer logic should live in `src/renderer/hooks` and surface typed helpers.
- Tailwind utility classes go in JSX; global adjustments belong in `src/renderer/styles/globals.css`.
- Main process logic should be service-driven. Instantiate services once in `src/main/index.ts` and inject them into IPC setup functions.
- All system, filesystem, Steam, and DepotDownloader interactions must flow through main-process services. Never access Node APIs directly from the renderer.
- Leverage `LoggingService` for diagnostics and keep log noise low. Renderer logging routes through the exposed preload APIs.
- Preserve config compatibility. Use `ConfigService` helpers for mutations and bump `configVersion` when schemas change with accompanying migration logic.
- Long-running work (copies, downloads, verifications) must emit progress updates and honor cancel tokens, following existing CopyProgress and DepotDownloader patterns.

## Testing Guidelines
- Co-locate Vitest specs with the relevant layer: `tests/main` for services, `tests/preload` for bridge contracts, `tests/renderer` for hooks/components (Happy DOM).
- Cover new IPC contracts with preload tests and add integration assertions where applicable.
- Exercise Playwright flows (`tests/e2e`) when touching Setup Wizard, Version Manager, or other major UI journeys. Update fixtures when UI text or sequencing changes.
- Use dependency injection or `fs-extra` mocks for filesystem interactions; do not hit real Steam directories or network endpoints in unit tests.

## Documentation & Change Tracking
- Maintain concise JSDoc on public classes/methods and inline comments only where logic is non-obvious.
- Update `README.md`, `CLAUDE.md`, and add a `memories/*.md` entry for significant feature, schema, or workflow changes.
- Document config migrations in `memories/` and ensure `ConfigService` accepts legacy data before bumping versions.
- Refresh screenshots under `Assets/Screenshots/` when UI changes meaningfully.

## Security & Configuration
- Never commit Steam credentials, DepotDownloader binaries, or user-specific AppData artifacts.
- Credentials persist via `CredentialService`; always use provided IPC handlers for secure caching and cleanup.
- Validate paths and input thoroughly before file operations. Respect cancellation and backoff patterns in handlers.
- Config/log locations remain `%USERPROFILE%/AppData/LocalLow/TVGS/Development Environment Manager/`; avoid relocating without migration support.

## Git & Release Workflow
- Use Conventional Commits (e.g., `feat(main): add depot manifest validation`).
- Coordinate version bumps across `package.json`, updater metadata, and user-facing displays.
- Packaging relies on electron-builder; ensure icons and metadata in `Assets/` stay synced across platforms.
- Keep PRs focused with testing notes (Vitest/Playwright results) and reproduction steps for reviewers.

## External Tools
- Primary tooling: Node.js LTS, npm, Electron, Vite, React, Tailwind, Vitest, Playwright, `fs-extra`.
- DepotDownloader is invoked via IPC; install locally for testing but do not commit binaries.
- Preferred IDEs: VS Code, Cursor, or similar with TypeScript support. Run `npm run build` before packaging or distributing artifacts.
=======
This guide helps contributors work effectively in the Schedule I Developer Environment Utility repository (Electron + TypeScript + React).

## Project Structure & Module Organization

**Electron Multi-Process Architecture**:
- `src/main/`: Main process (Node.js backend) handling system operations and Steam integration
- `src/renderer/`: Renderer process (React frontend) with secure IPC communication  
- `src/preload/`: Secure bridge between main and renderer processes
- `src/shared/`: Shared TypeScript types and interfaces

**Main Process Services** (`src/main/services/`):
- `ConfigService.ts`: Manages persistent configuration storage in AppData with DepotDownloader settings
- `LoggingService.ts`: File-based logging implementation
- `CredentialService.ts`: Secure Steam credential storage and encryption
- `UpdateService.ts`: Application update checking and management

**IPC Handlers** (`src/main/ipc/`):
- `steamHandlers.ts`: Steam library detection, manifest parsing, and branch detection
- `depotdownloaderHandlers.ts`: DepotDownloader integration replacing legacy SteamCMD
- `configHandlers.ts`: Configuration management operations
- `fileHandlers.ts`: File operations with progress tracking
- `steamLoginHandlers.ts`: Steam authentication and credential management
- `updateHandlers.ts`: Update operations
- `dialogHandlers.ts`: Dialog operations

**React Components** (`src/renderer/components/`):
- `SetupWizard/`: Multi-step setup process with DepotDownloader configuration
- `ManagedEnvironment/`: Main interface for environment management
- `Settings/`: Configuration and preferences management
- Progress dialogs and confirmation components

**Shared Types** (`src/shared/types.ts`):
- `DevEnvironmentConfig`: Central configuration interface with DepotDownloader integration
- Steam-related interfaces and branch management types

**Assets & Distribution**:
- `Assets/`: App icons and splash assets used by the package manifest
- `dist/`: Built application files
- `dist-v2.2.0b/`: Packaged executables for distribution
- `memories/`: Change logs and significant updates

**Path Layouts**:
- Managed path layout: `<ManagedEnv>/branches/<branch>`, `logs/`, `temp/`
- Config path: `%LOCALAPPDATA%\TVGS\Schedule I\Developer Env\config\`

## Build, Test, and Development Commands

**Development**:
```bash
# Run both processes in development
npm run dev

# Run individual processes
npm run dev:main      # Main process only
npm run dev:renderer  # Renderer process only
```

**Building**:
```bash
# Build both processes
npm run build

# Build individual processes
npm run build:main    # Main process only
npm run build:renderer # Renderer process only
```

**Packaging & Distribution**:
```bash
# Package for distribution
npm run package

# Clean previous builds
npm run clean

# Clean and rebuild for packaging
npm run prepackage

# Start built application
npm run start
```

**Build Output**:
- **Development**: Built files go to `dist/` directory
- **Packaging**: Packaged executables go to `dist-v2.2.0b/` directory

## Architecture Overview

This is an Electron application built with TypeScript and React that manages development environments for the Steam game "Schedule I". The application provides automated branch management, DepotDownloader integration, and comprehensive Steam library detection.

### Core Architecture Patterns

**Electron Multi-Process Architecture**: The application uses Electron's standard architecture:
- **Main Process**: Node.js backend handling system operations and Steam integration
- **Renderer Process**: React frontend with secure IPC communication
- **Preload Script**: Secure bridge between main and renderer processes

**IPC Communication**: All communication between processes uses Electron's IPC system with type-safe interfaces defined in the preload script.

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

## Coding Style & Naming Conventions

**TypeScript/JavaScript**:
- 2-space indent; consistent with ESLint/Prettier configuration
- camelCase for variables, functions, and properties
- PascalCase for classes, interfaces, and types
- async functions should be clearly named and handle errors properly

**React Components**:
- Functional components with hooks
- Props interfaces defined with TypeScript
- Event handlers use descriptive names (e.g., `handleSubmit`, `onClick`)
- Component files use PascalCase naming

**Electron IPC**:
- Handler functions use descriptive names ending with "Handler"
- IPC channel names use kebab-case (e.g., `steam-get-libraries`)
- Type-safe interfaces defined in preload script

**File Organization**:
- Services in `src/main/services/`
- IPC handlers in `src/main/ipc/`
- React components in `src/renderer/components/`
- Shared types in `src/shared/`

## Testing Guidelines

**Current State**: No formal test suite currently implemented

**Recommended Testing Strategy**:
- **Unit Tests**: Focus on service logic and Steam/file operations
- **Integration Tests**: Test IPC communication between main and renderer processes
- **UI Testing**: Manual verification of React components and user flows
- **E2E Testing**: Consider Playwright for full application testing

**Test Structure** (when implemented):
```
tests/
├── unit/
│   ├── services/
│   └── utils/
├── integration/
│   └── ipc/
└── e2e/
```

**Testing Commands** (when implemented):
```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:e2e      # End-to-end tests
```

## Dependencies

**Core Framework**:
- Electron with TypeScript
- React for the renderer process
- Node.js backend services

**Key Dependencies**:
- `electron`: Application framework
- `react`: UI library for renderer process
- `steam-user`: Steam integration
- `electron-store`: Configuration persistence
- `fs-extra`: Enhanced file operations
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

**File Operations**: Large file operations (environment copying and downloading) show progress with proper cancellation support through Electron IPC communication.

## Commit & Pull Request Guidelines

**Commits**: Conventional Commits (e.g., `feat(services): add branch parsing`), imperative mood, scoped when helpful.

**Pull Requests**: Clear description, linked issues, screenshots/GIFs for UI changes, reproduction/validation steps, and update docs (`AGENTS.md`) if architecture or behavior changes.

## Security & Configuration Tips

- Do not commit secrets or local AppData artifacts. Use environment variables or user secrets for tokens/keys.
- File operations should be cancellable and show progress; avoid logging PII. Steam App ID is handled in `SteamService`.
- Branch build IDs are stored per-branch in config; appmanifest copied to each branch folder on copy for drift checks.

## Documentation & Comments

- Use JSDoc comments for public APIs; summarize purpose, params, returns, exceptions.
- Document complex logic inline with comments.
- After significant changes, update `AGENTS.md` as needed.
- Create a detailed and compressed new entry in the Memory MCP Server using MCP_DOCKER for significant changes.

## External Commands & Tools

- Use `npm` CLI for builds, tests, packaging.
- Visual Studio Code or similar TypeScript/React IDE for development.
- Chrome DevTools for renderer process debugging.
>>>>>>> Stashed changes
