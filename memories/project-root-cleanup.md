# Project Root Cleanup

**Date**: Current  
**Type**: Maintenance  
**Scope**: Project root directory cleanup

## Summary
Cleaned up unneeded scripts and configuration files from the project root directory after migration from .NET to Electron architecture.

## Files Removed

### Obsolete .NET Scripts
- `Package-Release.bat` - .NET packaging batch script
- `Package-Release.ps1` - .NET packaging PowerShell script
- `clean-package.ps1` - Custom cleanup script (replaced by `npm run clean`)

### .NET Configuration Files
- `Roots.xml` - .NET linker configuration not needed for Electron

### Documentation
- `PLAN.md` - Migration plan document (completed, documented in memories)

### Empty Directories
- `scripts/` - Empty directory removed

## Current Project Root Structure
```
├── package.json (npm scripts for Electron build)
├── tsconfig.json, tsconfig.main.json (TypeScript config)
├── vite.config.ts, tailwind.config.js, postcss.config.js (build tools)
├── src/ (source code)
├── dist/ (build output)
├── Assets/ (app icons and screenshots)
├── memories/ (project history)
├── depots/ (Steam depot files)
└── Documentation files (README.md, AGENTS.md, etc.)
```

## Benefits
- Cleaner project root with only essential files
- Removed confusion from obsolete .NET scripts
- Streamlined build process using npm scripts
- Better organization with Electron-focused structure

## Build Commands
All build functionality now uses npm scripts:
- `npm run dev` - Development mode
- `npm run build` - Build both main and renderer
- `npm run package` - Package for distribution
- `npm run clean` - Clean build artifacts
