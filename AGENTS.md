# Repository Guidelines

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
