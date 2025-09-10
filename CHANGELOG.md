# Changelog

All notable changes to the Schedule I Developer Environment Utility are documented in this file.

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
├── dist-v2/                      # Packaged executables
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
- **Portable Executable**: `Schedule I Developer Environment 2.0.0.exe`
- **NSIS Installer**: `Schedule I Developer Environment Setup 2.0.0.exe`
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
