using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Schedule_I_Developer_Environment_Utility.Models;
using Schedule_I_Developer_Environment_Utility.Services;
using Microsoft.Windows.AppNotifications;

namespace Schedule_I_Developer_Environment_Utility.ViewModels
{
    public class SetupWizardViewModel : BaseViewModel
    {
        private readonly ILogger<SetupWizardViewModel> _logger;
        private readonly SteamService _steamService;
        private readonly ConfigurationService _configService;
        private readonly UiLogService _uiLogService;
        private readonly FileLoggingServiceFactory _fileLoggerFactory;

        private int _stepIndex = 0;
        private string _steamPath = string.Empty;
        private string _gameInstallPath = string.Empty;
        private string _managedEnvironmentPath = string.Empty;
        private bool _step1ErrorOpen;
        private string _step1ErrorMessage = string.Empty;
        private bool _step2ErrorOpen;
        private string _step2ErrorMessage = string.Empty;
        private bool _branchSwitchErrorOpen;
        private string _branchSwitchErrorMessage = string.Empty;
        private int _currentBranchIndex = 0;
        private double _copyProgress;
        private bool _copyIndeterminate;
        private string _copyStatus = string.Empty;
        private bool _copyErrorOpen;
        private string _copyErrorMessage = string.Empty;
        private bool _copyCompleted;
        public bool AutoCloseOnFinish { get; set; }

        public int StepIndex { get => _stepIndex; set { if (SetProperty(ref _stepIndex, value)) OnPropertyChanged(nameof(StepTitle)); } }
        public string StepTitle => $"Step {StepIndex + 1} of 6: " + (StepIndex switch
        {
            0 => "Select Library & Game",
            1 => "Pick Managed Environment",
            2 => "Select Branches",
            3 => "Switch Branch",
            4 => "Copy Files",
            5 => "Summary",
            _ => string.Empty
        });

        public ObservableCollection<string> Libraries { get; } = new();
        public ObservableCollection<FolderItem> GameFolders { get; } = new();
        public ObservableCollection<BranchChoice> BranchChoices { get; } = new();
        public ObservableCollection<string> ManagedPathSuggestions { get; } = new();
        public ObservableCollection<string> CopyLogs { get; } = new();
        private string _selectedLibrary = string.Empty;
        private string _detectedBranchDisplay = string.Empty;
        private string _detectedBranchName = string.Empty;
        private List<string> _copyPlan = new();

        public string SteamPath { get => _steamPath; set => SetProperty(ref _steamPath, value); }
        public string GameInstallPath
        {
            get => _gameInstallPath;
            set
            {
                if (SetProperty(ref _gameInstallPath, value))
                {
                    TryDetectBranchFromManifest();
                }
            }
        }
        public string ManagedEnvironmentPath { get => _managedEnvironmentPath; set => SetProperty(ref _managedEnvironmentPath, value); }
        public bool Step1ErrorOpen { get => _step1ErrorOpen; set => SetProperty(ref _step1ErrorOpen, value); }
        public string Step1ErrorMessage { get => _step1ErrorMessage; set => SetProperty(ref _step1ErrorMessage, value); }
        public bool Step2ErrorOpen { get => _step2ErrorOpen; set => SetProperty(ref _step2ErrorOpen, value); }
        public string Step2ErrorMessage { get => _step2ErrorMessage; set => SetProperty(ref _step2ErrorMessage, value); }
        public bool BranchSwitchErrorOpen { get => _branchSwitchErrorOpen; set => SetProperty(ref _branchSwitchErrorOpen, value); }
        public string BranchSwitchErrorMessage { get => _branchSwitchErrorMessage; set => SetProperty(ref _branchSwitchErrorMessage, value); }
        public int CurrentBranchIndex { get => _currentBranchIndex; set { if (SetProperty(ref _currentBranchIndex, value)) { OnPropertyChanged(nameof(CurrentTargetBranch)); OnPropertyChanged(nameof(CurrentTargetBranchDisplay)); } } }
        public string CurrentTargetBranch => _copyPlan.ElementAtOrDefault(CurrentBranchIndex) ?? string.Empty;
        public string CurrentTargetBranchDisplay => string.IsNullOrWhiteSpace(CurrentTargetBranch) ? string.Empty : BranchInfo.GetDisplayName(CurrentTargetBranch);
        public double CopyProgress { get => _copyProgress; set => SetProperty(ref _copyProgress, value); }
        public bool CopyIndeterminate { get => _copyIndeterminate; set => SetProperty(ref _copyIndeterminate, value); }
        public string CopyStatus { get => _copyStatus; set => SetProperty(ref _copyStatus, value); }
        public bool CopyErrorOpen { get => _copyErrorOpen; set => SetProperty(ref _copyErrorOpen, value); }
        public string CopyErrorMessage { get => _copyErrorMessage; set => SetProperty(ref _copyErrorMessage, value); }
        public bool CopyCompleted { get => _copyCompleted; set => SetProperty(ref _copyCompleted, value); }
        public string SelectedLibrary
        {
            get => _selectedLibrary;
            set
            {
                if (SetProperty(ref _selectedLibrary, value) && !string.IsNullOrWhiteSpace(value))
                {
                    OnLibrarySelected(value);
                }
            }
        }
        public string DetectedBranchDisplay
        {
            get => _detectedBranchDisplay;
            set
            {
                if (SetProperty(ref _detectedBranchDisplay, value))
                {
                    OnPropertyChanged(nameof(HasDetectedBranch));
                }
            }
        }
        public bool HasDetectedBranch => !string.IsNullOrWhiteSpace(_detectedBranchDisplay);

        public SetupWizardViewModel()
        {
            _logger = App.Services?.GetRequiredService<ILogger<SetupWizardViewModel>>()!;
            _steamService = App.Services?.GetRequiredService<SteamService>()!;
            _configService = App.Services?.GetRequiredService<ConfigurationService>()!;
            _uiLogService = App.Services?.GetRequiredService<UiLogService>()!;
            _fileLoggerFactory = App.Services?.GetRequiredService<FileLoggingServiceFactory>()!;

            LoadBranches();
            // Default managed path: running program location
            try { ManagedEnvironmentPath = AppContext.BaseDirectory; } catch { }
            LoadManagedSuggestions();
            // Auto-detect libraries and default to C: prioritized
            DetectSteam();
            if (Libraries.Count > 0)
            {
                SelectedLibrary = Libraries.First();
            }
        }

        private void LoadBranches()
        {
            BranchChoices.Clear();
            foreach (var b in DevEnvironmentConfig.AvailableBranches)
            {
                BranchChoices.Add(new BranchChoice { Name = b, DisplayName = BranchInfo.GetDisplayName(b), IsSelected = true });
            }
        }

        public void PreselectBranch(string branch)
        {
            if (string.IsNullOrWhiteSpace(branch)) return;
            if (BranchChoices.Count == 0) LoadBranches();
            foreach (var choice in BranchChoices)
            {
                choice.IsSelected = string.Equals(choice.Name, branch, StringComparison.OrdinalIgnoreCase);
            }
        }

        public Task StartHeadlessInstallAsync(string branch, string gamePath, string managedPath, bool autoClose)
        {
            AutoCloseOnFinish = autoClose;
            // Set paths directly
            GameInstallPath = gamePath;
            ManagedEnvironmentPath = managedPath;
            // Select branch only
            PreselectBranch(branch);
            // Build copy plan with this single branch
            _copyPlan = new List<string> { branch };
            CurrentBranchIndex = 0;

            // Decide if we need to switch
            var installed = _steamService.DetectInstalledBranch(GameInstallPath);
            if (!string.IsNullOrWhiteSpace(installed) && string.Equals(installed, branch, StringComparison.OrdinalIgnoreCase))
            {
                StepIndex = 4;
                _ = StartCopyForCurrentBranchAsync();
            }
            else
            {
                StepIndex = 3;
                BranchSwitchErrorOpen = true;
                BranchSwitchErrorMessage = $"Please switch to '{BranchInfo.GetDisplayName(branch)}' in Steam, then Recheck.";
            }
            return Task.CompletedTask;
        }

        private void TryDetectBranchFromManifest()
        {
            try
            {
                if (string.IsNullOrWhiteSpace(GameInstallPath) || !Directory.Exists(GameInstallPath))
                    return;

                var detected = _steamService.DetectInstalledBranch(GameInstallPath);
                if (string.IsNullOrWhiteSpace(detected))
                    return;

                // Ensure branch choices are available
                if (BranchChoices.Count == 0)
                {
                    LoadBranches();
                }

                foreach (var choice in BranchChoices)
                {
                    choice.IsSelected = string.Equals(choice.Name, detected, StringComparison.OrdinalIgnoreCase);
                }
                _detectedBranchName = detected;
                DetectedBranchDisplay = BranchInfo.GetDisplayName(detected);
                _uiLogService.Add($"Detected current Steam branch: {DetectedBranchDisplay}. Preselecting it.");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to detect current Steam branch from manifest");
            }
        }

        private void PrepareCopyPlan()
        {
            _copyPlan.Clear();
            var selected = SelectedBranches;
            var detected = _steamService.DetectInstalledBranch(GameInstallPath) ?? _detectedBranchName;
            if (!string.IsNullOrWhiteSpace(detected))
            {
                var match = selected.FirstOrDefault(b => string.Equals(b, detected, StringComparison.OrdinalIgnoreCase));
                if (!string.IsNullOrEmpty(match))
                {
                    _copyPlan.Add(match);
                }
            }
            foreach (var b in selected)
            {
                if (!_copyPlan.Any(x => string.Equals(x, b, StringComparison.OrdinalIgnoreCase)))
                {
                    _copyPlan.Add(b);
                }
            }
            CurrentBranchIndex = 0;
        }

        public void DetectSteam()
        {
            _uiLogService.Add("Detecting Steam...");
            var steamPath = _steamService.GetSteamInstallPath();
            SteamPath = steamPath ?? string.Empty;
            Libraries.Clear();
            foreach (var lib in _steamService.GetSteamLibraryPaths())
            {
                Libraries.Add(lib);
            }
            _uiLogService.Add($"Detected {Libraries.Count} libraries.");
            Step1ErrorOpen = false;
            Step1ErrorMessage = string.Empty;
        }

        private string? _selectedLibraryPath;
        public void OnLibrarySelected(string libraryPath)
        {
            _selectedLibraryPath = libraryPath;
            // Auto-detect game within selected library
            var games = _steamService.GetSteamGames(libraryPath);
            var found = games.FirstOrDefault(g => _steamService.IsScheduleIGame(g));
            if (found != null)
            {
                GameInstallPath = found.InstallPath;
                _uiLogService.Add($"Detected Schedule I in selected library: {found.InstallPath}");
                Step1ErrorOpen = false;
                Step1ErrorMessage = string.Empty;
            }
            else
            {
                _uiLogService.Add("Schedule I not found in selected library. You can browse manually.");
                Step1ErrorOpen = true;
                Step1ErrorMessage = "Schedule I not found in the selected library. Browse to the game folder manually.";
            }

            // Populate inline game folder list from steamapps\common
            try
            {
                GameFolders.Clear();
                var commonPath = Path.Combine(libraryPath, "common");
                if (Directory.Exists(commonPath))
                {
                    foreach (var dir in Directory.GetDirectories(commonPath))
                    {
                        GameFolders.Add(new FolderItem { Name = Path.GetFileName(dir), Path = dir });
                    }
                }
            }
            catch { }

            LoadManagedSuggestions();
        }

        public void Back()
        {
            if (StepIndex > 0) StepIndex--;
        }

        public bool Next()
        {
            if (!ValidateStep()) return false;
            // Transition logic
            if (StepIndex == 2)
            {
                PrepareCopyPlan();
                if (_copyPlan.Count == 0)
                {
                    StepIndex = 5; // summary if nothing to copy
                    return true;
                }
                var installed = _steamService.DetectInstalledBranch(GameInstallPath);
                if (!string.IsNullOrWhiteSpace(installed) && string.Equals(installed, _copyPlan[0], StringComparison.OrdinalIgnoreCase))
                {
                    // Copy currently installed branch first
                    StepIndex = 4;
                    _ = StartCopyForCurrentBranchAsync();
                }
                else
                {
                    // Need to switch first
                    BranchSwitchErrorOpen = true;
                    BranchSwitchErrorMessage = $"Please switch to '{CurrentTargetBranchDisplay}' in Steam, then Recheck.";
                    StepIndex = 3;
                }
                return true;
            }
            if (StepIndex == 3)
            {
                // Move to copy step and start copying current branch
                StepIndex = 4;
                _ = StartCopyForCurrentBranchAsync();
                return true;
            }
            if (StepIndex == 4)
            {
                // After copy, either loop to next branch or go to summary
                if (CurrentBranchIndex + 1 < _copyPlan.Count)
                {
                    CurrentBranchIndex++;
                    var installedNow = _steamService.DetectInstalledBranch(GameInstallPath);
                    if (!string.IsNullOrWhiteSpace(installedNow) && string.Equals(installedNow, CurrentTargetBranch, StringComparison.OrdinalIgnoreCase))
                    {
                        // Already on required branch; start next copy immediately
                        StepIndex = 4;
                        _ = StartCopyForCurrentBranchAsync();
                    }
                    else
                    {
                        BranchSwitchErrorOpen = true;
                        BranchSwitchErrorMessage = $"Please switch to '{CurrentTargetBranchDisplay}' in Steam, then Recheck.";
                        StepIndex = 3;
                    }
                }
                else
                {
                    StepIndex = 5; // summary
                }
                return true;
            }
            if (StepIndex < 5) StepIndex++;
            return true;
        }

        private bool ValidateStep()
        {
            switch (StepIndex)
            {
                case 0:
                    if (string.IsNullOrWhiteSpace(GameInstallPath) || !Directory.Exists(GameInstallPath))
                    {
                        Step1ErrorMessage = "Please select a valid game install folder.";
                        Step1ErrorOpen = true;
                        return false;
                    }
                    var exePath = Path.Combine(GameInstallPath, "Schedule I.exe");
                    if (!File.Exists(exePath))
                    {
                        Step1ErrorMessage = "Schedule I.exe not found in the selected folder. Please choose the game's install directory.";
                        Step1ErrorOpen = true;
                        return false;
                    }
                    Step1ErrorOpen = false;
                    Step1ErrorMessage = string.Empty;
                    break;
                case 1:
                    if (string.IsNullOrWhiteSpace(ManagedEnvironmentPath))
                    {
                        Step2ErrorMessage = "Please choose a managed environment folder.";
                        Step2ErrorOpen = true;
                        return false;
                    }
                    try
                    {
                        if (!Directory.Exists(ManagedEnvironmentPath))
                        {
                            Directory.CreateDirectory(ManagedEnvironmentPath);
                            _uiLogService.Add("Created managed environment folder.");
                        }
                        // Write permission test
                        var probe = Path.Combine(ManagedEnvironmentPath, ".write-test.tmp");
                        File.WriteAllText(probe, "ok");
                        File.Delete(probe);
                    }
                    catch (System.Exception ex)
                    {
                        Step2ErrorMessage = $"Cannot use managed environment folder: {ex.Message}";
                        Step2ErrorOpen = true;
                        return false;
                    }
                    Step2ErrorOpen = false;
                    Step2ErrorMessage = string.Empty;
                    break;
                case 2:
                    if (!BranchChoices.Any(b => b.IsSelected))
                    {
                        _uiLogService.Add("Select at least one branch.");
                        return false;
                    }
                    break;
                case 3:
                    // Require detected branch to match current target branch
                    var detected = _steamService.DetectInstalledBranch(GameInstallPath);
                    if (string.IsNullOrWhiteSpace(detected) || !string.Equals(detected, CurrentTargetBranch, StringComparison.OrdinalIgnoreCase))
                    {
                        BranchSwitchErrorMessage = $"Detected '{(string.IsNullOrWhiteSpace(detected) ? "Unknown" : detected)}'. Expected '{CurrentTargetBranch}'.";
                        BranchSwitchErrorOpen = true;
                        return false;
                    }
                    BranchSwitchErrorOpen = false;
                    BranchSwitchErrorMessage = string.Empty;
                    break;
                case 4:
                    // Block Next while copying
                    if (!CopyCompleted)
                    {
                        return false;
                    }
                    break;
            }
            return true;
        }

        public void RecheckInstalledBranch()
        {
            // Trigger validation and update UI message
            var ok = ValidateStep();
            if (ok)
            {
                _uiLogService.Add("Branch validated. Starting copy...");
                StepIndex = 4;
                _ = StartCopyForCurrentBranchAsync();
            }
        }

        private async Task StartCopyForCurrentBranchAsync()
        {
            try
            {
                CopyCompleted = false;
                CopyErrorOpen = false;
                CopyErrorMessage = string.Empty;
                CopyIndeterminate = true;
                CopyStatus = $"Preparing copy for {CurrentTargetBranchDisplay}...";
                CopyLogs.Clear();
                CopyLogs.Add($"Starting copy for {CurrentTargetBranchDisplay}");

                var source = GameInstallPath;
                var dest = Path.Combine(ManagedEnvironmentPath, "branches", CurrentTargetBranch);
                Directory.CreateDirectory(dest);

                // Gather files to copy, excluding Mods and Plugins directories
                var files = new List<string>();
                await Task.Run(() => EnumerateFilesExcluding(source, files));
                CopyLogs.Add($"Discovered {files.Count} files to copy.");

                // Perform copy on a background thread to keep UI responsive
                var copyResult = await Task.Run(() =>
                {
                    var logs = new List<string>();
                    int copied = 0;
                    int total = files.Count;
                    foreach (var file in files)
                    {
                        try
                        {
                            var rel = Path.GetRelativePath(source, file);
                            var targetFile = Path.Combine(dest, rel);
                            var dirName = Path.GetDirectoryName(targetFile);
                            Directory.CreateDirectory(string.IsNullOrEmpty(dirName) ? dest : dirName!);
                            File.Copy(file, targetFile, true);
                            logs.Add($"Copied: {rel}");
                            copied++;
                        }
                        catch (Exception ex)
                        {
                            logs.Add($"Skip copy (error): {ex.Message}");
                        }
                    }
                    // Copy appmanifest into branch folder (used later for stored build ID)
                    try
                    {
                        var steamAppsPath = Path.GetFullPath(Path.Combine(GameInstallPath, "..", ".."));
                        var manifestName = $"appmanifest_{_steamService.GetScheduleISteamID()}.acf";
                        var manifestSrc = Path.Combine(steamAppsPath, manifestName);
                        if (File.Exists(manifestSrc))
                        {
                            var manifestDest = Path.Combine(dest, manifestName);
                            Directory.CreateDirectory(dest);
                            File.Copy(manifestSrc, manifestDest, true);
                            logs.Add("Copied manifest to branch folder.");
                        }
                    }
                    catch (Exception mex)
                    {
                        logs.Add($"Warning copying manifest: {mex.Message}");
                    }
                    return (logs, copied, total);
                });

                // Update UI after copy completes
                foreach (var line in copyResult.logs)
                {
                    CopyLogs.Add(line);
                }
                CopyProgress = 100;
                CopyStatus = $"Copy completed for {CurrentTargetBranchDisplay}. Files: {copyResult.copied}/{copyResult.total}";
                CopyCompleted = true;

                // Toast notification for copy completion
                try
                {
                    var title = "Copy Complete";
                    var message = $"{CurrentTargetBranchDisplay} copied ({copyResult.copied}/{copyResult.total})";
                    var payload = $"<toast><visual><binding template=\"ToastGeneric\"><text>{title}</text><text>{message}</text></binding></visual></toast>";
                    var toast = new AppNotification(payload);
                    AppNotificationManager.Default.Show(toast);
                }
                catch { }
            }
            catch (Exception ex)
            {
                CopyErrorOpen = true;
                CopyErrorMessage = ex.Message;
                _logger.LogError(ex, "Error copying files");
            }
        }

        private void EnumerateFilesExcluding(string root, List<string> acc)
        {
            try
            {
                foreach (var file in Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories))
                {
                    var norm = file.Replace('/', '\\');
                    if (norm.IndexOf("\\Mods\\", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        norm.IndexOf("\\Plugins\\", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        continue;
                    }
                    acc.Add(file);
                }
                // Ensure root-level files included
                foreach (var rootFile in Directory.EnumerateFiles(root, "*", SearchOption.TopDirectoryOnly))
                {
                    if (!acc.Contains(rootFile)) acc.Add(rootFile);
                }
            }
            catch
            {
                // Swallow individual enumeration issues to avoid cross-thread UI exceptions
            }
        }

        private List<string> SelectedBranches => BranchChoices.Where(b => b.IsSelected).Select(b => b.Name).ToList();

        public async Task<bool> SaveAsync()
        {
            try
            {
                _uiLogService.Add("Saving configuration...");

                var selectedBranches = BranchChoices.Where(b => b.IsSelected).Select(b => b.Name).ToList();
                var config = new DevEnvironmentConfig
                {
                    SteamLibraryPath = Libraries.FirstOrDefault() ?? string.Empty,
                    GameInstallPath = GameInstallPath ?? string.Empty,
                    ManagedEnvironmentPath = ManagedEnvironmentPath ?? string.Empty,
                    SelectedBranches = selectedBranches,
                };

                _configService.SetManagedEnvironmentPath(ManagedEnvironmentPath ?? string.Empty);
                _fileLoggerFactory.SetManagedEnvironmentPath(ManagedEnvironmentPath ?? string.Empty);

                await _configService.SaveConfigurationAsync(config);
                _uiLogService.Add("Configuration saved.");

                // Create standard managed folder structure
                try
                {
                    var root = ManagedEnvironmentPath ?? string.Empty;
                    var branchesRoot = Path.Combine(root, "branches");
                    Directory.CreateDirectory(branchesRoot);
                    foreach (var b in DevEnvironmentConfig.AvailableBranches)
                    {
                        Directory.CreateDirectory(Path.Combine(branchesRoot, b));
                    }
                    Directory.CreateDirectory(Path.Combine(root, "logs"));
                    Directory.CreateDirectory(Path.Combine(root, "temp"));
                    // Default Mods runtime-specific structure
                    var defaultMods = Path.Combine(root, "Default Mods");
                    Directory.CreateDirectory(defaultMods);
                    Directory.CreateDirectory(Path.Combine(defaultMods, "Il2Cpp", "Mods"));
                    Directory.CreateDirectory(Path.Combine(defaultMods, "Il2Cpp", "Plugins"));
                    Directory.CreateDirectory(Path.Combine(defaultMods, "Mono", "Mods"));
                    Directory.CreateDirectory(Path.Combine(defaultMods, "Mono", "Plugins"));
                    _uiLogService.Add("Managed folder structure created (branches/logs/temp/default mods).");
                }
                catch (System.Exception ex)
                {
                    _logger.LogWarning(ex, "Could not fully create managed folder structure");
                    _uiLogService.Add($"Warning: Could not fully create folder structure: {ex.Message}");
                    // Continue; config was saved
                }
                return true;
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error saving configuration");
                _uiLogService.Add($"Error saving configuration: {ex.Message}");
                return false;
            }
        }

        private void LoadManagedSuggestions()
        {
            ManagedPathSuggestions.Clear();
            try
            {
                var baseDir = AppContext.BaseDirectory;
                var localAppData = System.Environment.GetFolderPath(System.Environment.SpecialFolder.LocalApplicationData);
                var docs = System.Environment.GetFolderPath(System.Environment.SpecialFolder.MyDocuments);
                var desktop = System.Environment.GetFolderPath(System.Environment.SpecialFolder.DesktopDirectory);

                var suggestions = new List<string>();
                suggestions.Add(baseDir);
                suggestions.Add(Path.Combine(baseDir, "ManagedEnv"));
                suggestions.Add(Path.Combine(localAppData, "TVGS", "Schedule I", "Developer Env", "managed"));
                suggestions.Add(Path.Combine(docs, "ScheduleI", "ManagedEnv"));
                suggestions.Add(Path.Combine(desktop, "ScheduleI-Managed"));

                if (!string.IsNullOrWhiteSpace(_selectedLibraryPath))
                {
                    suggestions.Add(Path.Combine(_selectedLibraryPath, "ScheduleI-Managed"));
                }

                if (!string.IsNullOrWhiteSpace(GameInstallPath))
                {
                    try
                    {
                        var parent = Directory.GetParent(GameInstallPath)?.FullName;
                        if (!string.IsNullOrEmpty(parent))
                        {
                            suggestions.Add(Path.Combine(parent, "ScheduleI-Managed"));
                        }
                    }
                    catch { }
                }

                foreach (var s in suggestions.Distinct().Where(p => !string.IsNullOrWhiteSpace(p)))
                {
                    ManagedPathSuggestions.Add(s);
                }
            }
            catch { }
        }

        public class FolderItem
        {
            public string Name { get; set; } = string.Empty;
            public string Path { get; set; } = string.Empty;
        }
    }

    public class BranchChoice : BaseViewModel
    {
        private string _name = string.Empty;
        private string _displayName = string.Empty;
        private bool _isSelected;

        public string Name { get => _name; set => SetProperty(ref _name, value); }
        public string DisplayName { get => _displayName; set => SetProperty(ref _displayName, value); }
        public bool IsSelected { get => _isSelected; set => SetProperty(ref _isSelected, value); }
    }
}
