# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

**Build the solution:**
```bash
dotnet build "Schedule I Developer Environment Utility.sln"
```

**Run the application:**
```bash
dotnet run --project "Schedule I Developer Environment Utility.csproj"
```

**Test the application (packaged):**
```bash
dotnet publish -c Release -r win-x64 --self-contained
```

## Architecture Overview

This is a WinUI3 application that manages development environments for the Steam game "Schedule I". It is a complete refactor from the original Windows Forms application to provide a modern, fluent UI experience while maintaining all core functionality.

### Original Project Reference
The original Windows Forms application is available in the `references/Schedule I Development Environment Manager` directory and serves as the functional specification for this WinUI3 refactor.

### Core Architecture Patterns

**WinUI3 + MVVM Pattern**: The application uses WinUI3 with Model-View-ViewModel pattern for clean separation of concerns and data binding.

**Dependency Injection**: Uses Microsoft.Extensions.DependencyInjection throughout the application with services registered in App.xaml.cs.

**Multi-Window Application Flow**:
- `MainWindow` handles initial setup when no managed environment exists
- `ManagedEnvironmentWindow` serves as the main interface when an environment is configured
- Windows transition using proper WinUI3 lifecycle patterns

### Key Components to be Refactored

**Services Layer** (to be migrated from original):
- `SteamService`: Handles Steam integration, game detection, branch detection, and manifest parsing
- `ConfigurationService`: Manages persistent configuration storage in AppData
- `FileLoggingService`: Custom logging implementation with file-based output
- `BranchManagementService`: Handles branch switching and management
- `FileOperationsService`: Manages large file operations with progress tracking

**Models Layer** (to be migrated from original):
- `DevEnvironmentConfig`: Central configuration model with branch management and build ID tracking
- `SteamGameInfo`: Represents Steam game metadata and installation details
- `BranchInfo`: Represents branch information and build details

**ViewModels Layer** (new for WinUI3):
- `MainWindowViewModel`: Handles initial setup logic
- `ManagedEnvironmentViewModel`: Main environment management logic
- `BranchManagementViewModel`: Branch operations and data binding

**Views Layer** (WinUI3 XAML):
- `MainWindow`: Modern setup interface with Steam library selection
- `ManagedEnvironmentWindow`: Primary interface for managing existing environments
- User controls for progress tracking, branch switching prompts, etc.

### Application State Management

**Configuration Storage**: Uses JSON serialization to AppData (`%LOCALAPPDATA%\TVGS\Schedule I\Developer Env\config\`)

**Branch Management**: Supports four branch types: main-branch, beta-branch, alternate-branch, alternate-beta-branch

**Steam Integration Features**:
- Automatic Steam library detection with multi-library support
- Steam manifest parsing for build ID extraction
- Branch detection via Steam's appinfo files
- Wait-for-branch-switch functionality for user-initiated Steam branch changes

### UI Design Principles

**WinUI3 Fluent Design**: Implements Windows 11 design language with:
- Mica material backdrop
- Modern typography scale
- Consistent spacing and elevation
- Adaptive layouts for different window sizes

**Dark/Light Theme**: Automatic theme detection with system preference integration

**Accessibility**: Full accessibility support with proper automation names and keyboard navigation

### Dependencies

**Core Framework**:
- .NET 8.0 Windows target framework
- WinUI3 (Microsoft.WindowsAppSDK)
- Microsoft.Extensions.Logging and DependencyInjection

**Migrated Dependencies**:
- Microsoft.Extensions.Logging for consistent logging
- Newtonsoft.Json for configuration serialization (consider System.Text.Json migration)

## Development Notes

**Migration Strategy**:
- Services layer can be directly ported with minimal changes
- Models layer requires no changes
- UI layer is completely rewritten using WinUI3 XAML and MVVM
- Form-based dialogs become ContentDialog or separate Windows

**Key Refactor Points**:
- Replace Windows Forms controls with WinUI3 equivalents
- Convert form events to MVVM commands and data binding
- Implement proper async/await patterns for file operations
- Use WinUI3 progress reporting for long-running operations

**Steam App ID**: Schedule I is hardcoded as "3164500" in SteamService

**Testing**: This WinUI3 app requires visual testing since automated UI testing is complex. Focus on functional testing of services layer and manual UI testing.

**File Operations**: Large file operations (environment copying) must show progress in WinUI3 progress controls with proper cancellation support.