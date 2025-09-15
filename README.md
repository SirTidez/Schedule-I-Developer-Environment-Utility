# Schedule I Developer Environment Utility - Electron Edition

**Version 2.2.0** - Custom Description Management & Enhanced Version Control

## 🎮 What is Schedule I Developer Environment?

The Schedule I Developer Environment Utility is a specialized tool designed for **Schedule I** game developers and modders who need to manage multiple development branches and mod configurations. This application streamlines the complex process of setting up and switching between different game versions, making it easier to develop, test, and maintain mods across various game branches.

### **Core Purpose**
Schedule I is a complex game with multiple development branches (stable, beta, experimental, etc.), each potentially requiring different mod configurations and file setups. Manually managing these environments is time-consuming and error-prone. This utility automates the entire process, allowing developers to:

- **Quickly switch between game branches** without manual file copying
- **Maintain separate mod configurations** for each development branch
- **Automatically detect and manage Steam installations** across different library locations
- **Track branch updates** and ensure you're always working with the latest versions
- **Organize development environments** with proper file structure and mod management

### **Who Should Use This Tool**
- **Game Modders**: Developers creating mods for Schedule I who need to test across multiple game versions
- **Content Creators**: YouTubers, streamers, and content creators who switch between different game builds
- **QA Testers**: Quality assurance teams testing mods and content across various game branches
- **Development Teams**: Teams working on Schedule I projects that require multiple environment setups
- **Power Users**: Advanced players who want to maintain multiple game configurations

### **Key Benefits**
- **Time Saving**: Eliminates hours of manual file management and configuration
- **Error Prevention**: Automated processes reduce human error in environment setup
- **Organization**: Keeps different game versions and mods properly separated
- **Efficiency**: Quick switching between development environments
- **Reliability**: Built-in verification and status checking ensures environments are properly configured

This is the Electron-based version of the Schedule I Developer Environment Utility, converted from the original C# WinUI 3 application. The application provides a modern, cross-platform solution for managing Schedule I development environments with Steam integration and comprehensive branch management.

## ✨ Features

### 🎮 **Steam Integration**
- **Automatic Detection**: Automatically detect Steam libraries and parse app manifests
- **Branch Discovery**: Find and manage different game branches for development
- **Real-time Status**: Live detection of currently installed Steam branch
- **Build ID Tracking**: Monitor branch updates and changes

### 🔄 **Branch Management**
- **Multi-branch Support**: Copy and manage multiple development branches
- **Progress Tracking**: Real-time progress bars during file operations with cancel support
- **Status Verification**: Accurate branch status detection and display
- **Update Detection**: Identify when branches need updates
- **Repair Status**: Shows "Needs Repair" for incomplete installations

### 🛠️ **Development Tools**
- **Mod Management**: Handle runtime-specific mod installations
- **MelonLoader Integration**: Automatic MelonLoader installation after downloads
- **Default Mods**: Install default mods to selected branches
- **Branch Deletion**: Safe deletion of managed branch instances
- **Configuration Management**: Persistent settings with validation

### 🏷️ **Custom Description Management** (v2.2.0)
- **Setup Wizard Enhancement**: Add custom descriptions when installing branches
- **Version Manager**: Edit custom descriptions for installed builds
- **Persistent Storage**: Descriptions are saved and persist across sessions
- **Enhanced UX**: Better version identification and management

### 📥 **DepotDownloader Integration** (v2.1.1)
- **Modern Steam Downloads**: Direct DepotDownloader integration replacing legacy SteamCMD
- **Secure Execution**: No shell execution, masked passwords, input validation
- **Parallel Downloads**: Configurable thread counts for faster downloads
- **QR Code Authentication**: Steam Guard support with QR codes
- **Build ID Extraction**: Manifest-based branch verification

### 🔄 **Update System**
- **Fresh Version Display**: Current app version always shows fresh (never cached)
- **Optimized Caching**: Latest release info cached for 1 hour for better performance
- **Manual Update Checks**: Trigger update checks via refresh button
- **Automatic Updates**: Checks for new releases on GitHub

## 🚀 Technology Stack

- **Electron**: ^38.0.0 (Desktop app framework)
- **React**: ^19.1.1 (UI library)
- **TypeScript**: ^5.9.2 (Type safety)
- **Tailwind CSS**: ^4.1.13 (Styling framework)
- **Vite**: ^7.1.5 (Build tool)
- **electron-builder**: ^26.0.12 (Packaging)
- **electron-store**: ^10.1.0 (Configuration management)
- **electron-log**: ^5.4.3 (Logging)
- **extract-zip**: ^2.0.1 (MelonLoader extraction)

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: 18+ (recommended: latest LTS)
- **npm**: 9+ (comes with Node.js)
- **Git**: For cloning the repository

### Installation
```bash
# Clone the repository
git clone https://github.com/SirTidez/Schedule-I-Developer-Environment-Utility.git
cd "Schedule I Developer Environment Utility"

# Install dependencies
npm install
```

### Development Commands
```bash
# Start development mode (both main and renderer processes)
npm run dev

# Start individual processes
npm run dev:main      # Main process only
npm run dev:renderer  # Renderer process only

# Build for production
npm run build

# Build individual processes
npm run build:main    # Main process only
npm run build:renderer # Renderer process only

# Package for distribution
npm run package

# Clean previous builds
npm run clean

# Clean and rebuild for packaging
npm run prepackage

# Start built application
npm run start
```

### Build Output
- **Development**: Built files go to `dist/` directory
- **Packaging**: Packaged executables go to `dist-v2.2.0/` directory

### Development Workflow
1. **Start Development**: Run `npm run dev` to start both processes
2. **Hot Reload**: Renderer process supports hot module replacement
3. **TypeScript**: Main process compiles automatically on changes
4. **Debugging**: Use Chrome DevTools for renderer process debugging

## 📁 Project Structure

```
Schedule I Developer Environment Utility/
├── src/                          # Electron source code
│   ├── main/                     # Main process (Node.js)
│   │   ├── index.ts              # Main process entry point
│   │   ├── services/             # Core services
│   │   │   ├── SteamService.ts   # Steam integration
│   │   │   ├── ConfigService.ts  # Configuration management
│   │   │   ├── LoggingService.ts # Logging system
│   │   │   ├── UpdateService.ts  # Update checking
│   │   │   └── CredentialService.ts # Secure Steam credential storage
│   │   └── ipc/                  # IPC handlers
│   │       ├── steamHandlers.ts  # Steam operations
│   │       ├── depotdownloaderHandlers.ts # DepotDownloader integration
│   │       ├── configHandlers.ts # Configuration operations
│   │       ├── fileHandlers.ts   # File operations
│   │       ├── dialogHandlers.ts # Dialog operations
│   │       ├── updateHandlers.ts # Update operations
│   │       ├── steamLoginHandlers.ts # Steam authentication
│   │       ├── shellHandlers.ts  # Shell operations
│   │       └── windowHandlers.ts # Window management
│   ├── renderer/                 # React frontend
│   │   ├── components/           # React components
│   │   │   ├── SetupWizard/      # Setup wizard components
│   │   │   └── ManagedEnvironment/ # Main interface components
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useSteamService.ts # Steam service hook
│   │   │   ├── useConfigService.ts # Config service hook
│   │   │   └── useFileService.ts  # File service hook
│   │   ├── types/                # TypeScript type definitions
│   │   └── utils/                # Utility functions
│   ├── shared/                   # Shared types and utilities
│   │   └── types.ts              # Common type definitions
│   └── preload/                  # Preload scripts
│       └── index.ts              # Secure API exposure
├── dist/                         # Built application
├── dist-v2.2.0/                 # Packaged executables (v2.2.0)
├── dist-v2.0.3/                 # Packaged executables (v2.0.3)
├── dist-v2/                     # Packaged executables (legacy v2.0.0)
├── Assets/                       # Application assets and icons
├── CSharp/                       # Legacy C# project (archived)
├── memories/                     # Development documentation
├── package.json                  # Node.js configuration
├── CHANGELOG.md                  # Version history
└── README.md                     # This file
```

## 📦 Building and Packaging

The application uses electron-builder for packaging with support for multiple platforms:

### **Windows**
- **Portable Executable**: `Schedule I Developer Environment 2.2.0.exe`
- **NSIS Installer**: `Schedule I Developer Environment Setup 2.2.0.exe`
- **Architecture**: x64
- **Digital Signing**: All executables are digitally signed

### **Package Directories**
- **Current Version**: `dist-v2.2.0/` (v2.2.0 packages)
- **Previous Versions**: `dist-v2.0.3/` and `dist-v2/` (legacy packages)

## 🆕 Recent Changes (v2.2.0)

### **🏷️ Custom Description Management**
- **Setup Wizard**: Added custom description input fields for branch installation
- **Version Manager**: Added edit functionality for existing custom descriptions
- **Persistent Storage**: Custom descriptions are saved and persist across sessions
- **Enhanced UX**: Better version identification with user-friendly names

## Previous Changes (v2.1.1)

### **🔒 Security Enhancements**
- **Command Hardening**: Disabled shell execution for DepotDownloader spawns (uses argument arrays only)
- **Password Protection**: Masked `-password` arguments in logs and progress messages
- **Input Validation**: Basic validation for usernames, passwords, app IDs, branch IDs, and file paths

### **🚀 MelonLoader Integration**
- **Automatic Installation**: Downloads and extracts MelonLoader.x64.zip after successful branch downloads
- **Integrity Verification**: Validates installation by checking for `MelonLoader/` folder and `version.dll`
- **User Control**: Toggle auto-install in Settings (default ON) with first-run Setup Wizard prompt
- **Safe Extraction**: Uses trusted `extract-zip` library for secure file extraction

### **💫 Enhanced User Experience**
- **Inline Steam Login**: Steam Session card shows login fields when needed, hidden when authenticated
- **Per-Branch Progress**: Individual progress bars and cancel buttons for each branch operation
- **Repair Detection**: Shows "Needs Repair" status for incomplete installations (missing `Schedule I.exe`)
- **Direct Downloads**: Install/Reinstall uses DepotDownloader directly when configured and logged in
- **Build ID Tracking**: Displays stored and live Steam build IDs with update availability flags

### **🛠️ Setup Wizard Improvements**
- **Clear Messaging**: Steam Login step explains session-only credentials (not stored on disk)
- **Auto-Navigation**: Automatically advances to Copy step after successful login or skip
- **Restored Controls**: Next button restored on DepotDownloader Integration step
- **Dedicated Prompts**: MelonLoader auto-install uses its own dialog with appropriate messaging

## 🔄 Migration from C# Version

This Electron version maintains feature parity with the original C# WinUI 3 application while providing:

- **Cross-platform compatibility**: Windows, macOS, and Linux support
- **Modern web technologies**: React, TypeScript, and modern tooling
- **Better maintainability**: Modular architecture and clear separation of concerns
- **Improved development experience**: Hot reload, TypeScript, and modern build tools
- **Enhanced security**: Context isolation and secure IPC communication

## 📄 License

MIT License - see [LICENSE.txt](LICENSE.txt) for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for more information.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/SirTidez/Schedule-I-Developer-Environment-Utility/issues)
- **Discussions**: [GitHub Discussions](https://github.com/SirTidez/Schedule-I-Developer-Environment-Utility/discussions)
- **Project Board**: [Trello Board](https://trello.com/b/QqiNHMx7/schedule-i-developer-environment-utility) - Track development progress and roadmap
- **Discord**: [Join our Discord](https://discord.gg/schedulei) for community support

---

**Thank you for using Schedule I Developer Environment!** 🎮✨
