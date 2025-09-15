# Changelog

All notable changes to the Schedule I Developer Environment Utility are documented in this file.

## [2.2.0] - 2025-01-21

### Added
- **Custom Description Management**: Users can now add custom descriptions when installing branches via setup wizard
- **Version Manager Enhancement**: Added edit functionality to modify custom descriptions for installed builds
- **Persistent Storage**: Custom descriptions are saved in configuration and persist across sessions
- **Enhanced User Experience**: Better version identification with user-friendly custom names

### Changed
- **Setup Wizard Flow**: BranchSelectionStep now includes custom description input fields
- **Version Manager UI**: Added edit icons and inline editing for version descriptions
- **Data Storage**: Enhanced version information storage to include custom descriptions

### Fixed
- **Description Persistence**: Fixed issue where custom descriptions were being overwritten during refresh operations
- **Version Loading**: Improved version loading to properly merge filesystem and configuration data

## [2.1.1] - 2025-09-14

### Highlights

- DepotDownloader command hardening (no shell, masked passwords, input validation)
- Automatic MelonLoader install after DepotDownloader downloads (safe OSS unzip)
- Managed Environment UX: inline login, per-branch progress + cancel, repair status
- Setup Wizard UX: clear Steam login messaging, restored Next on integration step, dedicated MelonLoader prompt
- Version + packaging: v2.2.0, output to `dist-v2.2.0/`, cleaner prepackage

### Security

- Disabled shell execution for all DepotDownloader spawns (uses args arrays only)
- Masked `-password` argument in logs and progress messages
- Added basic input validation for username, password, appId, branchId, and paths

### MelonLoader Integration

- Added installer that downloads MelonLoader.x64.zip to temp and extracts using `extract-zip`
- Integrity check after extraction (requires `MelonLoader/` folder and `version.dll`)
- Auto-install toggled in Settings (default ON) with first-run prompt in Setup Wizard

### Managed Environment

- Steam Session: inline login fields when not logged in; hidden when logged in
- Install/Reinstall: use DepotDownloader directly when enabled + logged in
- Inline per-branch progress bar and Cancel button on cards
- Installed only if `Schedule I.exe` exists; folder-only shows “Needs Repair”
- Shows stored Build ID and live Steam Build; flags Update Available accordingly

### Setup Wizard

- Steam Login step: session-only credential messaging; auto-advance to Copy step on login/skip
- DepotDownloader Integration step: Next button restored (login still owns progression)
- Removed redundant Cancel button; retained inline cancel near progress
- MelonLoader auto-install prompt uses its own dialog (not Low Disk Space)

### Versioning & Packaging

- App version: 2.2.0 (title bar and UI)
- Output directory: `dist-v2.2.0/`
- Added `clean` and `prepackage` scripts to remove previous outputs and rebuild
- Windows dev icon: uses `Assets/icon.ico` (fallback to PNG)
- Log filename: `DD-MM-YYYY-HH-MM.log`

### Developer Notes

- New IPC: `melonloader:install` (main) and preload `electronAPI.melonloader.install`
- `extract-zip` added as dependency

---

## [2.0.3] - 2025-01-10

### 🔧 **PATCH RELEASE: Update System Improvements & Package Organization**

This patch release focuses on improving the update checking system, optimizing package organization, and enhancing the overall user experience with better update management.

---

## ✨ **New Features**

### **🔄 Enhanced Update System**
- **Fresh Version Display**: Current app version is now always displayed fresh (never cached)
- **Optimized Caching**: Latest release information cached for 1 hour instead of 24 hours
- **Manual Update Checks**: Users can trigger update checks via the refresh/sync button
- **Improved Performance**: Balanced approach between freshness and API efficiency

### **📁 Package Organization**
- **Version-Specific Directories**: New `dist-v2.0.3/` directory for v2.0.3 packages
- **Legacy Preservation**: Maintains `dist-v2/` directory for v2.0.0 packages
- **Clean Separation**: Clear organization between different version releases

---

## 🔧 **Improvements**

### **Update Management**
- **Current Version**: Always fetched fresh from application (never cached)
- **Cache Duration**: Reduced from 24 hours to 1 hour for latest release info
- **Update Triggers**: App launch and manual refresh button click
- **User Control**: Manual update checking via refresh button in managed environment

### **Package Structure**
- **New Directory**: `dist-v2.0.3/` for version 2.0.3 packages
- **Legacy Support**: `dist-v2/` preserved for v2.0.0 packages
- **Future-Proof**: Easy to add new version directories as needed

### **Documentation**
- **Comprehensive Updates**: All modified files now have detailed documentation
- **Method Summaries**: JSDoc-style comments for all public methods
- **Interface Documentation**: Complete documentation for all TypeScript interfaces
- **Version Tracking**: Updated version numbers across all source files

---

## 🐛 **Bug Fixes**

### **Update System**
- **Version Accuracy**: Fixed issue where cached current version could be outdated
- **Cache Efficiency**: Optimized caching strategy for better performance
- **User Experience**: Improved update checking frequency and control

---

## 📋 **Technical Changes**

### **Files Modified**
- **UpdateService.ts**: Enhanced update checking logic with fresh version detection
- **UpdateCacheService.ts**: Reduced cache duration and added comprehensive documentation
- **ManagedEnvironment.tsx**: Added update checking to refresh button functionality
- **package.json**: Updated output directory to `dist-v2.0.3`
- **CHANGELOG.md**: Updated directory structure documentation

### **New Directories**
- **dist-v2.0.3/**: New package directory for v2.0.3 releases

### **Documentation Updates**
- **11 source files**: Updated with comprehensive method documentation
- **Memory file**: Added detailed change log for all improvements
- **Version consistency**: All files now reference version 2.0.3

---

## 🚀 **Migration Notes**

### **For Users**
- **No Breaking Changes**: All existing functionality remains the same
- **Improved Updates**: Better update checking and version display
- **Manual Control**: New ability to check for updates via refresh button

### **For Developers**
- **Package Directory**: New builds will go to `dist-v2.0.3/` directory
- **Legacy Support**: Old packages remain in `dist-v2/` directory
- **Documentation**: Comprehensive documentation added to all modified files

---

## 📊 **Version Information**

- **Version**: 2.0.3
- **Release Date**: 2025-01-10
- **Type**: Patch Release
- **Compatibility**: Full backward compatibility with v2.0.0
- **Package Directory**: `dist-v2.0.3/`

---

## [2.0.0] - 2025-01-10

### 🚀 **MAJOR RELEASE: Complete Migration to Electron**

This release represents a complete architectural overhaul, migrating from WinUI3 (.NET 8) to Electron (Node.js + React + TypeScript). This major version bump reflects the significant changes in technology stack, user interface, and application architecture.

---

## 🔄 **Architecture Migration**

### **From WinUI3 (.NET 8) to Electron**
- **Previous**: C# WinUI3 application with XAML-based UI
- **New**: Cross-platform Electron application with React + TypeScript
- **Benefits**: 
  - Cross-platform compatibility (Windows, macOS, Linux)
  - Modern web technologies for UI development
  - Easier maintenance and updates
  - Better developer experience with hot reload

### **Technology Stack Changes**
| Component | Before (v1.x) | After (v2.0) |
|-----------|---------------|--------------|
| **Frontend** | WinUI3 XAML | React + TypeScript |
| **Backend** | C# .NET 8 | Node.js + TypeScript |
| **Styling** | WinUI3 Styles | Tailwind CSS |
| **Build System** | MSBuild | Vite + TypeScript Compiler |
| **Packaging** | MSIX/ClickOnce | electron-builder |
| **Configuration** | JSON + C# Models | electron-store |

---

## ✨ **New Features**

### **🎨 Modern User Interface**
- **Custom Title Bar**: Frameless window with custom draggable title bar
- **Dark Theme**: Consistent dark theme throughout the application
- **Responsive Design**: Modern, clean interface with improved usability
- **Window Controls**: Minimize, maximize/restore, and close buttons
- **Window Dragging**: Click and drag the title bar to move the window

### **🔄 Enhanced Branch Management**
- **Real-time Detection**: Automatically detects currently installed Steam branch
- **Accurate Status**: Shows correct branch status based on Steam's current state
- **Visual Indicators**: Clear visual feedback for installed/uninstalled branches
- **Update Detection**: Identifies when branches need updates

### **📦 Improved File Operations**
- **Progress Tracking**: Real-time progress bars during file operations
- **Terminal Output**: Detailed logging of file discovery and copying
- **Error Handling**: Better error reporting and recovery
- **Branch Verification**: Pauses copying to verify correct Steam branch

### **🛠️ Developer Tools**
- **Default Mods Installation**: Tool to install default mods to selected branches
- **Branch Deletion**: Safe deletion of managed branch instances
- **Configuration Management**: Improved config validation and management
- **Logging System**: Comprehensive logging with daily log files

### **🔄 Update System**
- **Automatic Updates**: Checks for new releases on GitHub
- **Version Display**: Shows current version in title bar and UI
- **Release Notes**: Displays release notes in update notifications
- **Caching**: 24-hour cache to prevent excessive API calls
- **External Downloads**: Opens GitHub release page in default browser

---

## 🔧 **Technical Improvements**

### **Performance**
- **Faster Startup**: Optimized application startup time
- **Memory Efficiency**: Better memory management with Electron
- **Caching**: Intelligent caching for update checks and Steam data

### **Reliability**
- **Error Recovery**: Better error handling and recovery mechanisms
- **Configuration Validation**: Robust config validation and error reporting

### **Security**
- **Context Isolation**: Secure IPC communication between processes
- **Preload Scripts**: Secure API exposure to renderer process
- **Digital Signing**: Applications are digitally signed for security
- **Input Validation**: Enhanced input validation and sanitization

---

## 🐛 **Bug Fixes**

### **Steam Integration**
- **Fixed**: Duplicate Steam library detection
- **Fixed**: Incorrect branch detection and display
- **Fixed**: Double `steamapps` path construction issues
- **Fixed**: Branch verification during copying process

### **File Operations**
- **Fixed**: Progress bar not updating during file copy
- **Fixed**: Terminal output not showing real-time progress
- **Fixed**: Incorrect folder filtering (only root-level Mods/Plugins)
- **Fixed**: Incomplete directory structure creation

### **Configuration**
- **Fixed**: Configuration file not saving to correct location
- **Fixed**: Build ID not being saved for update checking
- **Fixed**: Configuration validation dialog showing unnecessarily
- **Fixed**: Setup wizard navigation issues

### **UI/UX**
- **Fixed**: Window not starting maximized
- **Fixed**: Title bar not draggable
- **Fixed**: Title bar scrolling with content
- **Fixed**: Managed environment not reloading after operations

---

## 📁 **File Structure Changes**

### **New Structure**
```
Schedule I Developer Environment Utility/
├── src/                          # Electron source code
│   ├── main/                     # Main process (Node.js)
│   ├── renderer/                 # Renderer process (React)
│   ├── preload/                  # Preload scripts
│   └── shared/                   # Shared types
├── dist/                         # Built application
├── dist-v2.0.3/                  # Packaged executables (v2.0.3)
├── dist-v2/                      # Packaged executables (legacy v2.0.0)
├── assets/                        # Application assets
├── CSharp/                       # Legacy C# project (archived)
├── package.json                   # Node.js configuration
└── README.md                     # Documentation
```

### **Legacy Files**
- **CSharp/**: Original WinUI3 project (preserved for reference)
- **Assets/**: Original application assets (reused)
- **memories/**: Development documentation

---

## 🚀 **Installation & Distribution**

### **New Distribution Methods**
- **Portable Executable**: `Schedule I Developer Environment 2.0.3.exe`
- **NSIS Installer**: `Schedule I Developer Environment Setup 2.0.3.exe`
- **Digital Signing**: All executables are digitally signed
- **Auto-updates**: Built-in update checking system

### **System Requirements**
- **Storage**: 500MB for application, 2.5GB per branch
- **Network**: Internet connection for updates and Steam integration

---

## 🔄 **Migration Guide**

### **For Existing Users**
1. **Backup**: Your existing managed environments will be preserved
2. **Configuration**: Existing config files will be automatically migrated
3. **Steam Integration**: All Steam library detection will work as before
4. **Branches**: Existing branch installations will be detected and managed

### **Configuration Compatibility**
- **Config Format**: Maintains compatibility with v1.x configuration format
- **Paths**: All existing paths and settings are preserved
- **Branch Data**: Existing branch build IDs and metadata are retained

---

## 🎯 **Future Roadmap**

### **Planned Features**
- **Plugin System**: Extensible plugin architecture
- **Advanced Modding**: Enhanced mod management tools
- **Cloud Sync**: Configuration and branch synchronization
- **Automated branch management**: Automated branch downloading with no steam interaction required

---

## 📝 **Development Notes**

### **Breaking Changes**
- **Technology Stack**: Complete change from .NET to Node.js
- **UI Framework**: Migration from WinUI3 to React
- **Build System**: New build and packaging process
- **Configuration**: Minor changes to configuration file format

### **Deprecated Features**
- **WinUI3 Components**: All WinUI3-specific features removed
- **MSIX Packaging**: Replaced with electron-builder
- **C# Services**: Migrated to TypeScript/Node.js equivalents

---

## 📞 **Support**

For issues, feature requests, or questions about this release:
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check README.md for setup instructions
- **Community**: Join the Schedule I modding community for support

---
