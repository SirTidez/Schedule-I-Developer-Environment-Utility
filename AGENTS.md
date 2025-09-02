# Repository Guidelines

This guide helps contributors work effectively in the Schedule I Developer Environment Utility repository (WinUI3 + MVVM on .NET 8).

## Project Structure & Module Organization
- `App.xaml`, `MainWindow.xaml`: Application entry/view. Code-behind in `*.xaml.cs`.
- `ViewModels/`: MVVM logic (e.g., `MainWindowViewModel`).
- `Services/`: Core services (`SteamService`, `ConfigurationService`, `FileLoggingService`).
- `Models/`: Data contracts (`DevEnvironmentConfig`, `SteamGameInfo`, `BranchInfo`).
- `Assets/`: App icons and splash assets used by the package manifest.
- `Properties/PublishProfiles/`: Packaging profiles (`win-x86`, `win-x64`, `win-arm64`).
- `memories/`: Change logs and significant updates.
 - Managed path layout: `<ManagedEnv>/branches/<branch>`, `logs/`, `temp/`.
 - Config path: `%USERPROFILE%/AppData/LocalLow/TVGS/Development Environment Manager/config.json`.

## Build, Test, and Development Commands
- Restore: `dotnet restore`
- Build solution: `dotnet build "Schedule I Developer Environment Utility.sln"`
- Run (dev): `dotnet run --project "Schedule I Developer Environment Utility.csproj"`
- Publish (profile): `dotnet publish -c Release -p:PublishProfile=Properties/PublishProfiles/win-x64.pubxml`
- Publish (self-contained): `dotnet publish -c Release -r win-x64 --self-contained`

## Coding Style & Naming Conventions
- C#/.NET: 4-space indent; Allman braces; nullable aware.
- Names: PascalCase for types/methods; camelCase for locals/fields; `I`-prefix for interfaces; async methods end with `Async`.
- MVVM: `*ViewModel` for view-models; avoid code-behind logic beyond UI wiring. Prefer DI via `App.xaml.cs` for services and `ILogger<T>`.
- XAML: Bind via properties/commands; keep UI strings in XAML resources when practical.
 - Theme: app-wide dark mode (`RequestedTheme="Dark"`), title bar styled via `ThemeService`.

## Testing Guidelines
- No test project currently. Prefer xUnit when adding tests.
- Layout: `Tests/ProjectName.Tests/` with mirrors of `Services/` and `Models/` units.
- Focus: Service logic and Steam/file operations; UI by manual verification.
- Run tests: `dotnet test`

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (e.g., `feat(services): add branch parsing`), imperative mood, scoped when helpful.
- PRs: clear description, linked issues, screenshots/GIFs for UI changes, reproduction/validation steps, and update docs (`CLAUDE.md`, `AGENTS.md`) if architecture or behavior changes.

## Security & Configuration Tips
- Do not commit secrets or local AppData artifacts. Use environment variables or user secrets for tokens/keys.
- File ops should be cancellable and show progress; avoid logging PII. Steam App ID is handled in `SteamService`.
 - Branch build IDs are stored per-branch in config; appmanifest copied to each branch folder on copy for drift checks.

## Documentation & Comments
- Use XML comments for public APIs; summarize purpose, params, returns, exceptions.
- Document complex logic inline with comments.
- After significant changes, update AGENTS.MD and CLAUDE.md as needed.
- Create a detailed and compressed new entry in memory.md for significant changes.

## External Commands & Tools
- Use `dotnet` CLI for builds, tests, publishing.
- Visual Studio or VS Code for development.
