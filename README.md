# Schedule I Developer Environment Utility - Electron Edition

This is the Electron-based version of the Schedule I Developer Environment Utility, converted from the original C# WinUI 3 application.

## Features

- **Steam Integration**: Automatically detect Steam libraries and parse app manifests
- **Branch Management**: Copy and manage different game branches for development
- **Mod Management**: Handle runtime-specific mod installations
- **File Operations**: Large file copying with progress tracking
- **Configuration**: Persistent settings management
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Technology Stack

- **Electron**: ^38.0.0 (Desktop app framework)
- **React**: ^18.0.0 (UI library)
- **TypeScript**: ^5.0.0 (Type safety)
- **Tailwind CSS**: ^3.0.0 (Styling framework)
- **Vite**: ^5.0.0 (Build tool)
- **electron-builder**: ^24.0.0 (Packaging)

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
cd Electron
npm install
```

### Development Commands
```bash
# Start development mode (both main and renderer processes)
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package
```

### Project Structure
```
src/
├── main/                 # Electron main process
│   ├── index.ts          # Main process entry
│   ├── services/         # Node.js services
│   │   ├── SteamService.ts
│   │   └── ConfigService.ts
│   └── ipc/              # IPC handlers
│       ├── steamHandlers.ts
│       ├── configHandlers.ts
│       └── fileHandlers.ts
├── renderer/             # React frontend
│   ├── components/        # React components
│   │   ├── SetupWizard/
│   │   └── ManagedEnvironment/
│   ├── hooks/            # Custom React hooks
│   ├── stores/           # State management
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── shared/               # Shared types/utilities
└── preload/              # Preload scripts
```

## Building and Packaging

The application uses electron-builder for packaging:

- **Windows**: NSIS installer
- **macOS**: DMG package
- **Linux**: AppImage

## Migration from C# Version

This Electron version maintains feature parity with the original C# WinUI 3 application while providing:

- Cross-platform compatibility
- Modern web technologies
- Better maintainability
- Improved development experience

## License

MIT License
