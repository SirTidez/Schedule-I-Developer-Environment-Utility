# AGENTS.md Migration - December 2024

## Overview
Successfully migrated all content from `CLAUDE.md` into `AGENTS.md` and corrected the architecture information to accurately reflect the current Electron-based application.

## Key Changes Made

### Architecture Correction
- **Before**: Incorrectly described as WinUI3 + MVVM on .NET 8
- **After**: Correctly identified as Electron + TypeScript + React application

### Project Structure Updates
- Updated all file paths to reflect actual Electron structure (`src/main/`, `src/renderer/`, `src/preload/`)
- Corrected service names and locations
- Updated component organization for React-based UI

### Build Commands Migration
- **Before**: .NET commands (`dotnet restore`, `dotnet build`, `dotnet run`)
- **After**: npm commands (`npm run dev`, `npm run build`, `npm run package`)

### Coding Conventions Update
- **Before**: C#/.NET conventions (PascalCase, Allman braces, nullable aware)
- **After**: TypeScript/JavaScript conventions (camelCase, 2-space indent, JSDoc comments)

### Content Consolidation
- Merged all technical details from CLAUDE.md
- Preserved DepotDownloader integration information
- Maintained Steam integration features documentation
- Kept security guidelines and development workflow

## Structure Verification
The final `AGENTS.md` now contains:
1. **Project Structure & Module Organization** - Accurate Electron architecture
2. **Build, Test, and Development Commands** - Correct npm-based commands
3. **Architecture Overview** - Complete Electron multi-process description
4. **Coding Style & Naming Conventions** - TypeScript/JavaScript standards
5. **Testing Guidelines** - Updated for Electron application testing
6. **Dependencies** - Accurate package.json dependencies
7. **Development Notes** - All technical details preserved
8. **Security & Configuration Tips** - Maintained security guidelines

## Impact
- Eliminates confusion between documentation and actual codebase
- Provides accurate guidance for contributors working on the Electron application
- Maintains all technical knowledge while correcting architectural assumptions
- Creates single source of truth for development guidelines
