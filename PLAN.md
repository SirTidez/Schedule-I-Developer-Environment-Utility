# Schedule I Developer Environment Utility - Electron Conversion Plan

## Project Overview
This document outlines the detailed plan for converting the C# WinUI 3 application "Schedule I Developer Environment Utility" to an Electron-based web UI application. The original application manages game development environments, handles Steam integration, and provides mod management for the game Schedule I.

## Original Application Analysis

### Current Architecture (C# WinUI 3)
- **Framework**: WinUI 3 + MVVM pattern
- **Services**: SteamService, ConfigurationService, UiLogService
- **Models**: DevEnvironmentConfig, BranchInfo
- **ViewModels**: SetupWizardViewModel, ManagedEnvironmentViewModel
- **Views**: SetupWizardWindow, ManagedEnvironmentWindow
- **Configuration**: JSON config files in AppData
- **Notifications**: Windows toast notifications
- **File Operations**: C# System.IO operations

### Key Features to Convert
1. **Setup Wizard**: Guided configuration flow
2. **Steam Integration**: Library detection, appmanifest parsing
3. **Branch Management**: Copying game files, build tracking
4. **Mod Management**: Runtime-specific mod handling
5. **File Operations**: Large file copying with progress
6. **Notifications**: Completion notifications
7. **Logging**: In-app and file logging
8. **Configuration**: Persistent settings management

## Technology Stack for Electron Conversion

### Core Technologies
- **Electron**: ^38.0.0 (Desktop app framework)
- **React**: ^18.0.0 (UI library)
- **Tailwind CSS**: ^3.0.0 (Styling framework)
- **TypeScript**: ^5.0.0 (Type safety)
- **Node.js**: Built-in (Backend services)

### Key Dependencies
- **fs-extra**: ^11.0.0 (Advanced file operations)
- **electron-store**: ^8.0.0 (Configuration management)
- **electron-log**: ^5.0.0 (Logging)
- **electron-builder**: ^24.0.0 (Packaging)
- **react-router-dom**: ^6.0.0 (Routing)
- **zustand**: ^4.0.0 (State management)

## Detailed Conversion Plan

### Phase 1: Project Setup and Architecture

#### 1.1 Project Structure
```
schedule-i-electron/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts          # Main process entry
│   │   ├── services/         # Node.js services
│   │   │   ├── SteamService.ts
│   │   │   ├── ConfigService.ts
│   │   │   ├── FileService.ts
│   │   │   └── LogService.ts
│   │   └── ipc/              # IPC handlers
│   │       ├── steamHandlers.ts
│   │       ├── configHandlers.ts
│   │       └── fileHandlers.ts
│   ├── renderer/             # React frontend
│   │   ├── components/        # React components
│   │   │   ├── SetupWizard/
│   │   │   ├── ManagedEnvironment/
│   │   │   └── common/
│   │   ├── hooks/            # Custom React hooks
│   │   ├── stores/           # Zustand stores
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Utility functions
│   └── shared/               # Shared types/utilities
├── public/                   # Static assets
├── dist/                     # Build output
└── package.json
```

#### 1.2 Package.json Configuration
```json
{
  "name": "schedule-i-dev-environment",
  "version": "1.0.0",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:main\" \"npm run dev:renderer\"",
    "dev:main": "tsc -p tsconfig.main.json && electron dist/main/index.js",
    "dev:renderer": "vite",
    "build": "npm run build:main && npm run build:renderer",
    "build:main": "tsc -p tsconfig.main.json",
    "build:renderer": "vite build",
    "package": "electron-builder"
  },
  "dependencies": {
    "electron": "^38.0.0",
    "fs-extra": "^11.0.0",
    "electron-store": "^8.0.0",
    "electron-log": "^5.0.0"
  },
  "devDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.0.0",
    "vite": "^5.0.0",
    "electron-builder": "^24.0.0"
  }
}
```

### Phase 2: Core Services Conversion

#### 2.1 SteamService Conversion
**Original C# SteamService** → **Node.js SteamService**

**Key Functions to Convert:**
- Steam library detection
- Appmanifest parsing
- Branch detection
- Build ID extraction

**Implementation Approach:**
```typescript
// src/main/services/SteamService.ts
import * as fs from 'fs-extra';
import * as path from 'path';

export class SteamService {
  private steamPaths: string[] = [];
  
  async detectSteamLibraries(): Promise<string[]> {
    // Windows: Check common Steam installation paths
    const commonPaths = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      'D:\\Steam'
    ];
    
    for (const steamPath of commonPaths) {
      if (await fs.pathExists(path.join(steamPath, 'steam.exe'))) {
        this.steamPaths.push(steamPath);
      }
    }
    
    return this.steamPaths;
  }
  
  async parseAppManifest(appId: string, libraryPath: string): Promise<AppManifest> {
    const manifestPath = path.join(libraryPath, 'steamapps', `appmanifest_${appId}.acf`);
    const content = await fs.readFile(manifestPath, 'utf-8');
    
    // Parse ACF format (similar to original C# implementation)
    return this.parseACFContent(content);
  }
  
  private parseACFContent(content: string): AppManifest {
    // Implementation similar to original C# ACF parser
    // Extract buildid, name, state, etc.
  }
}
```

#### 2.2 ConfigurationService Conversion
**Original C# ConfigurationService** → **Node.js ConfigService with electron-store**

```typescript
// src/main/services/ConfigService.ts
import Store from 'electron-store';

export class ConfigService {
  private store: Store;
  
  constructor() {
    this.store = new Store({
      name: 'config',
      defaults: {
        steamLibraryPath: '',
        managedEnvironmentPath: '',
        selectedBranches: [],
        lastUsedBranch: ''
      }
    });
  }
  
  getConfig(): DevEnvironmentConfig {
    return this.store.store;
  }
  
  updateConfig(updates: Partial<DevEnvironmentConfig>): void {
    this.store.set(updates);
  }
  
  getManagedEnvironmentPath(): string {
    return this.store.get('managedEnvironmentPath', '');
  }
}
```

#### 2.3 FileService Conversion
**Original C# File Operations** → **Node.js FileService with fs-extra**

```typescript
// src/main/services/FileService.ts
import * as fs from 'fs-extra';
import * as path from 'path';

export class FileService {
  async copyGameFiles(
    sourcePath: string, 
    destinationPath: string, 
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // Use fs-extra copy with progress tracking
    await fs.copy(sourcePath, destinationPath, {
      filter: (src, dest) => {
        // Exclude Mods and Plugins folders like original
        return !src.includes('Mods') && !src.includes('Plugins');
      }
    });
  }
  
  async copyAppManifest(
    appId: string, 
    steamPath: string, 
    branchPath: string
  ): Promise<void> {
    const sourcePath = path.join(steamPath, 'steamapps', `appmanifest_${appId}.acf`);
    const destPath = path.join(branchPath, `appmanifest_${appId}.acf`);
    await fs.copy(sourcePath, destPath);
  }
}
```

### Phase 3: Frontend Conversion

#### 3.1 React Component Structure
**Original XAML Windows** → **React Components**

**SetupWizardWindow** → **SetupWizard Component**
```typescript
// src/renderer/components/SetupWizard/SetupWizard.tsx
import React, { useState } from 'react';
import { useSteamService } from '../../hooks/useSteamService';
import { useConfigService } from '../../hooks/useConfigService';

export const SetupWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [steamLibraries, setSteamLibraries] = useState<string[]>([]);
  const { detectSteamLibraries } = useSteamService();
  const { updateConfig } = useConfigService();
  
  const steps = [
    { component: LibrarySelectionStep, title: 'Select Steam Library' },
    { component: EnvironmentPathStep, title: 'Choose Environment Path' },
    { component: BranchSelectionStep, title: 'Select Branches' },
    { component: CopyProgressStep, title: 'Copying Files' },
    { component: SummaryStep, title: 'Setup Complete' }
  ];
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Schedule I Development Environment Setup</h1>
        
        {/* Step indicator */}
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => (
            <div key={index} className={`flex-1 text-center ${
              index < currentStep ? 'text-blue-400' : 'text-gray-500'
            }`}>
              {step.title}
            </div>
          ))}
        </div>
        
        {/* Current step component */}
        {React.createElement(steps[currentStep - 1].component)}
      </div>
    </div>
  );
};
```

**ManagedEnvironmentWindow** → **ManagedEnvironment Component**
```typescript
// src/renderer/components/ManagedEnvironment/ManagedEnvironment.tsx
import React from 'react';
import { BranchCard } from './BranchCard';
import { useBranchService } from '../../hooks/useBranchService';

export const ManagedEnvironment: React.FC = () => {
  const { branches, installBranch, playBranch, openBranchFolder } = useBranchService();
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Managed Environment</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map(branch => (
            <BranchCard
              key={branch.name}
              branch={branch}
              onInstall={() => installBranch(branch.name)}
              onPlay={() => playBranch(branch.name)}
              onOpen={() => openBranchFolder(branch.name)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

#### 3.2 Styling with Tailwind CSS
**Original WinUI 3 Styling** → **Tailwind CSS Classes**

```css
/* src/renderer/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-900 text-white;
  }
}

@layer components {
  .btn-primary {
    @apply bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors;
  }
  
  .btn-secondary {
    @apply bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors;
  }
  
  .card {
    @apply bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700;
  }
  
  .input-field {
    @apply bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500;
  }
}
```

### Phase 4: IPC Communication

#### 4.1 Main Process IPC Handlers
```typescript
// src/main/ipc/steamHandlers.ts
import { ipcMain } from 'electron';
import { SteamService } from '../services/SteamService';

const steamService = new SteamService();

export function setupSteamHandlers() {
  ipcMain.handle('steam:detect-libraries', async () => {
    return await steamService.detectSteamLibraries();
  });
  
  ipcMain.handle('steam:parse-manifest', async (event, appId: string, libraryPath: string) => {
    return await steamService.parseAppManifest(appId, libraryPath);
  });
}
```

#### 4.2 Renderer Process IPC Wrapper
```typescript
// src/renderer/utils/ipc.ts
import { ipcRenderer } from 'electron';

export const steamAPI = {
  detectLibraries: () => ipcRenderer.invoke('steam:detect-libraries'),
  parseManifest: (appId: string, libraryPath: string) => 
    ipcRenderer.invoke('steam:parse-manifest', appId, libraryPath)
};

export const configAPI = {
  getConfig: () => ipcRenderer.invoke('config:get'),
  updateConfig: (updates: any) => ipcRenderer.invoke('config:update', updates)
};

export const fileAPI = {
  copyGameFiles: (source: string, dest: string) => 
    ipcRenderer.invoke('file:copy-game', source, dest),
  copyAppManifest: (appId: string, steamPath: string, branchPath: string) =>
    ipcRenderer.invoke('file:copy-manifest', appId, steamPath, branchPath)
};
```

### Phase 5: State Management

#### 5.1 Zustand Stores
```typescript
// src/renderer/stores/configStore.ts
import { create } from 'zustand';
import { configAPI } from '../utils/ipc';

interface ConfigState {
  config: DevEnvironmentConfig | null;
  loading: boolean;
  loadConfig: () => Promise<void>;
  updateConfig: (updates: Partial<DevEnvironmentConfig>) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  loading: false,
  
  loadConfig: async () => {
    set({ loading: true });
    try {
      const config = await configAPI.getConfig();
      set({ config, loading: false });
    } catch (error) {
      console.error('Failed to load config:', error);
      set({ loading: false });
    }
  },
  
  updateConfig: async (updates) => {
    const { config } = get();
    if (!config) return;
    
    const newConfig = { ...config, ...updates };
    await configAPI.updateConfig(newConfig);
    set({ config: newConfig });
  }
}));
```

### Phase 6: Notifications and Logging

#### 6.1 Electron Notifications
```typescript
// src/main/services/NotificationService.ts
import { Notification } from 'electron';

export class NotificationService {
  static showCopyComplete(branchName: string): void {
    new Notification({
      title: 'Copy Complete',
      body: `Successfully copied ${branchName} branch`,
      icon: 'path/to/icon.png'
    }).show();
  }
  
  static showError(message: string): void {
    new Notification({
      title: 'Error',
      body: message,
      icon: 'path/to/error-icon.png'
    }).show();
  }
}
```

#### 6.2 Logging with electron-log
```typescript
// src/main/services/LogService.ts
import log from 'electron-log';

export class LogService {
  static info(message: string, ...args: any[]): void {
    log.info(message, ...args);
  }
  
  static error(message: string, error?: Error): void {
    log.error(message, error);
  }
  
  static warn(message: string, ...args: any[]): void {
    log.warn(message, ...args);
  }
}
```

### Phase 7: Build and Packaging

#### 7.1 Electron Builder Configuration
```json
// package.json build configuration
{
  "build": {
    "appId": "com.schedulei.dev-environment",
    "productName": "Schedule I Developer Environment",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png"
    }
  }
}
```

## Implementation Timeline

### Week 1-2: Project Setup
- [ ] Initialize Electron project structure
- [ ] Set up TypeScript configuration
- [ ] Configure build tools (Vite, electron-builder)
- [ ] Set up Tailwind CSS

### Week 3-4: Core Services
- [ ] Implement SteamService
- [ ] Implement ConfigService with electron-store
- [ ] Implement FileService with fs-extra
- [ ] Set up IPC communication

### Week 5-6: Frontend Components
- [ ] Create SetupWizard React components
- [ ] Create ManagedEnvironment React components
- [ ] Implement responsive design with Tailwind CSS
- [ ] Set up routing with React Router

### Week 7-8: Integration and Testing
- [ ] Integrate all services with frontend
- [ ] Implement notifications and logging
- [ ] Add error handling and validation
- [ ] Test file operations and Steam integration

### Week 9-10: Polish and Packaging
- [ ] Add progress indicators for file operations
- [ ] Implement proper error messages
- [ ] Configure electron-builder for distribution
- [ ] Create installer packages

## Key Considerations

### Performance
- Use React.memo for expensive components
- Implement virtual scrolling for large file lists
- Use Web Workers for heavy file operations if needed

### Security
- Validate all file paths to prevent directory traversal
- Sanitize user inputs
- Use contextBridge for secure IPC communication

### User Experience
- Maintain the original dark theme
- Implement smooth transitions and animations
- Add keyboard shortcuts for common actions
- Provide clear error messages and recovery options

### Cross-Platform Compatibility
- Test on Windows, macOS, and Linux
- Handle different Steam installation paths
- Adapt file path separators for different OS

## Migration Strategy

### Data Migration
- Read existing C# config files
- Convert to electron-store format
- Preserve user settings and preferences

### Feature Parity
- Ensure all original features are implemented
- Maintain the same workflow and user experience
- Keep the same configuration options

### Testing
- Test with actual Schedule I game installations
- Verify Steam integration works correctly
- Test file operations with large game files
- Validate mod management functionality

## Technical Challenges and Solutions

### Steam Integration Challenges
**Challenge**: Steam appmanifest parsing and branch detection
**Solution**: Implement ACF parser in Node.js using regex patterns and string manipulation
```typescript
// ACF Parser Implementation
private parseACFContent(content: string): AppManifest {
  const buildIdMatch = content.match(/"buildid"\s+"(\d+)"/);
  const nameMatch = content.match(/"name"\s+"([^"]+)"/);
  const stateMatch = content.match(/"StateFlags"\s+"(\d+)"/);
  
  return {
    buildId: buildIdMatch ? parseInt(buildIdMatch[1]) : 0,
    name: nameMatch ? nameMatch[1] : '',
    state: stateMatch ? parseInt(stateMatch[1]) : 0
  };
}
```

### File Operations Performance
**Challenge**: Large file copying with progress tracking
**Solution**: Use fs-extra with custom progress tracking
```typescript
async copyWithProgress(src: string, dest: string, onProgress: (progress: number) => void) {
  const stats = await fs.stat(src);
  const totalSize = stats.size;
  let copiedSize = 0;
  
  // Implement streaming copy with progress updates
  const readStream = fs.createReadStream(src);
  const writeStream = fs.createWriteStream(dest);
  
  readStream.on('data', (chunk) => {
    copiedSize += chunk.length;
    onProgress((copiedSize / totalSize) * 100);
  });
}
```

### Cross-Platform Compatibility
**Challenge**: Different Steam installation paths across OS
**Solution**: OS-specific path detection
```typescript
private getSteamPaths(): string[] {
  const platform = process.platform;
  
  switch (platform) {
    case 'win32':
      return [
        'C:\\Program Files (x86)\\Steam',
        'C:\\Program Files\\Steam',
        'D:\\Steam'
      ];
    case 'darwin':
      return ['~/Library/Application Support/Steam'];
    case 'linux':
      return ['~/.steam/steam', '~/.local/share/Steam'];
    default:
      return [];
  }
}
```

## Development Environment Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git
- Visual Studio Code (recommended)

### Setup Steps
1. **Clone and Initialize**
   ```bash
   git clone <repository-url>
   cd schedule-i-electron
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Development Commands**
   ```bash
   npm run dev          # Start development mode
   npm run build        # Build for production
   npm run package      # Create distributable packages
   ```

4. **Debugging Setup**
   - Main process: Use VS Code debugger with launch.json
   - Renderer process: Use Chrome DevTools
   - IPC debugging: Use electron-devtools-installer

## Testing Strategy

### Unit Tests
- **Services**: Test SteamService, ConfigService, FileService
- **Utilities**: Test ACF parser, path utilities
- **Components**: Test React components with React Testing Library

### Integration Tests
- **IPC Communication**: Test main ↔ renderer communication
- **File Operations**: Test file copying and manifest handling
- **Steam Integration**: Test with mock Steam installations

### End-to-End Tests
- **Setup Wizard**: Test complete setup flow
- **Branch Management**: Test branch installation and management
- **Mod Management**: Test mod installation and removal

### Test Configuration
```json
// jest.config.js
{
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/src/test/setup.ts"],
  "moduleNameMapping": {
    "^@/(.*)$": "<rootDir>/src/$1"
  }
}
```

## Deployment and Distribution

### Build Configuration
```json
// electron-builder configuration
{
  "build": {
    "appId": "com.schedulei.dev-environment",
    "productName": "Schedule I Developer Environment",
    "directories": {
      "output": "dist-electron"
    },
    "win": {
      "target": [
        { "target": "nsis", "arch": ["x64"] },
        { "target": "portable", "arch": ["x64"] }
      ],
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns",
      "category": "public.app-category.developer-tools"
    },
    "linux": {
      "target": [
        { "target": "AppImage", "arch": ["x64"] },
        { "target": "deb", "arch": ["x64"] }
      ],
      "icon": "assets/icon.png",
      "category": "Development"
    }
  }
}
```

### Auto-Updater Integration
```typescript
// Auto-updater implementation
import { autoUpdater } from 'electron-updater';

export class UpdateService {
  static checkForUpdates(): void {
    autoUpdater.checkForUpdatesAndNotify();
  }
  
  static setupUpdateHandlers(): void {
    autoUpdater.on('update-available', () => {
      // Show update notification
    });
    
    autoUpdater.on('update-downloaded', () => {
      // Show restart prompt
    });
  }
}
```

## Risk Assessment and Mitigation

### Technical Risks
1. **Performance Degradation**
   - **Risk**: Electron apps may be slower than native apps
   - **Mitigation**: Optimize file operations, use Web Workers for heavy tasks

2. **Memory Usage**
   - **Risk**: Large file operations may consume excessive memory
   - **Mitigation**: Implement streaming operations, monitor memory usage

3. **Steam Integration Complexity**
   - **Risk**: Steam API changes or detection issues
   - **Mitigation**: Implement fallback detection methods, comprehensive testing

### User Experience Risks
1. **Learning Curve**
   - **Risk**: Users familiar with original app may find new UI confusing
   - **Mitigation**: Maintain similar workflow, provide migration guide

2. **Feature Parity**
   - **Risk**: Missing features from original application
   - **Mitigation**: Comprehensive feature comparison, user feedback integration

## Future Enhancements

### Short-term Improvements
- **Auto-updater**: Implement automatic updates
- **Better Error Handling**: More detailed error messages and recovery options
- **Performance Monitoring**: Add performance metrics and optimization
- **Accessibility**: Improve accessibility features

### Long-term Features
- **Plugin System**: Allow third-party plugins
- **Cloud Sync**: Sync configurations across devices
- **Advanced Mod Management**: Mod conflict detection and resolution
- **Multi-game Support**: Extend to support other games

### Technical Debt
- **Code Splitting**: Implement lazy loading for better performance
- **Type Safety**: Improve TypeScript coverage
- **Documentation**: Add comprehensive API documentation
- **Testing Coverage**: Increase test coverage to 90%+

## Conclusion

This conversion plan provides a comprehensive roadmap for transforming the C# WinUI 3 application into a modern Electron-based web application. The new architecture will maintain all original functionality while providing better cross-platform support, modern development tools, and improved maintainability.

The use of React and Tailwind CSS will provide a modern, responsive UI that can be easily customized and extended. The Node.js backend services will handle all the complex file operations and Steam integration, while the Electron framework provides the desktop application capabilities.

The modular architecture will make the application easier to maintain and extend, while the modern tooling will improve the development experience and application performance.

### Key Benefits of Conversion
1. **Cross-platform Compatibility**: Works on Windows, macOS, and Linux
2. **Modern Development Stack**: React, TypeScript, modern tooling
3. **Better Maintainability**: Modular architecture, modern patterns
4. **Improved User Experience**: Responsive design, better error handling
5. **Future-proof**: Easier to add new features and maintain

### Success Metrics
- **Feature Parity**: 100% of original features implemented
- **Performance**: File operations within 10% of original speed
- **User Adoption**: Smooth migration for existing users
- **Cross-platform**: Successful deployment on all target platforms
- **Maintainability**: Reduced development time for new features

This plan provides a solid foundation for the conversion project while addressing potential challenges and risks. The phased approach ensures manageable development cycles while maintaining quality and feature completeness.
