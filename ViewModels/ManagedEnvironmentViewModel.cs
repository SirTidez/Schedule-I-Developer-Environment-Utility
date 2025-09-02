using System.Collections.ObjectModel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Schedule_I_Developer_Environment_Utility.Models;
using Schedule_I_Developer_Environment_Utility.Services;

namespace Schedule_I_Developer_Environment_Utility.ViewModels
{
    public class ManagedEnvironmentViewModel : BaseViewModel
    {
        private readonly ILogger<ManagedEnvironmentViewModel> _logger;
        private readonly ConfigurationService _configService;
        private readonly SteamService _steamService;
        private readonly UiLogService _uiLogService;

        public ObservableCollection<BranchInfo> Branches { get; } = new();

        public ManagedEnvironmentViewModel()
        {
            try
            {
                var sp = App.Services;
                _logger = sp?.GetService<ILogger<ManagedEnvironmentViewModel>>() ?? NullLogger<ManagedEnvironmentViewModel>.Instance;
                
                // Try to get services with defensive fallbacks
                try
                {
                    _uiLogService = sp?.GetService<UiLogService>() ?? new UiLogService();
                }
                catch
                {
                    _uiLogService = new UiLogService();
                }
                
                try
                {
                    _configService = sp?.GetService<ConfigurationService>() ?? new ConfigurationService(NullLogger<ConfigurationService>.Instance);
                }
                catch
                {
                    _configService = new ConfigurationService(NullLogger<ConfigurationService>.Instance);
                }
                
                try
                {
                    _steamService = sp?.GetService<SteamService>() ?? new SteamService(NullLogger<SteamService>.Instance);
                }
                catch
                {
                    _steamService = new SteamService(NullLogger<SteamService>.Instance);
                }

                _ = LoadBranchesAsync();
            }
            catch (Exception ex)
            {
                // If we can't initialize properly, create minimal services to prevent crashes
                _logger = NullLogger<ManagedEnvironmentViewModel>.Instance;
                _uiLogService = new UiLogService();
                _configService = new ConfigurationService(NullLogger<ConfigurationService>.Instance);
                _steamService = new SteamService(NullLogger<SteamService>.Instance);
                
                _uiLogService.Add($"Error initializing ViewModel: {ex.Message}");
                _logger.LogError(ex, "Error initializing ManagedEnvironmentViewModel");
            }
        }

        private async Task LoadBranchesAsync()
        {
            try
            {
                _uiLogService.Add("Loading branches...");
                var config = await _configService.LoadConfigurationAsync() ?? new DevEnvironmentConfig();
                // Run the heavy validation off the UI thread
                var results = await Task.Run(() =>
                {
                    var list = new List<BranchInfo>();
                    foreach (var branch in DevEnvironmentConfig.AvailableBranches)
                    {
                        try
                        {
                            var info = _configService.ValidateBranchInstallation(branch, config);
                            list.Add(info);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Validation error for branch {Branch}", branch);
                            list.Add(new BranchInfo { BranchName = branch, DisplayName = BranchInfo.GetDisplayName(branch), Status = BranchStatus.Error });
                        }
                    }
                    return list;
                });

                // Populate live build info
                string? liveBranch = null;
                string? liveBuild = null;
                try
                {
                    var tuple = _steamService.GetBranchAndBuildIdFromManifest(config.GameInstallPath);
                    liveBranch = tuple.branch;
                    liveBuild = tuple.buildId;
                }
                catch { }

                Branches.Clear();
                foreach (var b in results)
                {
                    // Read stored build ID from saved manifest in the branch folder
                    try
                    {
                        var appId = _steamService.GetScheduleISteamID();
                        var savedManifest = System.IO.Path.Combine(b.FolderPath, $"appmanifest_{appId}.acf");
                        var stored = TryReadBuildIdFromManifestFile(savedManifest);
                        if (!string.IsNullOrEmpty(stored))
                        {
                            b.LocalBuildId = stored;
                        }
                    }
                    catch { }

                    // Determine current branch/live build (only for actively installed branch)
                    b.SteamBuildId = string.Empty;
                    b.IsCurrentSteamBranch = !string.IsNullOrEmpty(liveBranch) && string.Equals(liveBranch, b.BranchName, StringComparison.OrdinalIgnoreCase);
                    if (b.IsCurrentSteamBranch && !string.IsNullOrEmpty(liveBuild))
                    {
                        b.SteamBuildId = liveBuild;
                    }

                    // Compute status per requirements
                    if (!b.IsInstalled)
                    {
                        b.Status = BranchStatus.NotInstalled;
                    }
                    else if (b.IsCurrentSteamBranch && !string.IsNullOrEmpty(b.SteamBuildId))
                    {
                        if (long.TryParse(b.LocalBuildId, out var local) && long.TryParse(b.SteamBuildId, out var live))
                        {
                            b.Status = local < live ? BranchStatus.UpdateAvailable : BranchStatus.UpToDate;
                        }
                        else
                        {
                            // Missing or unparsable stored build id: consider error in local installation
                            b.Status = string.IsNullOrEmpty(b.LocalBuildId) ? BranchStatus.Error : BranchStatus.UpToDate;
                        }
                    }
                    else
                    {
                        // Not current branch; assume up to date if no info
                        b.Status = BranchStatus.UpToDate;
                    }

                    // Determine if default mods exist for this branch's runtime (Il2Cpp or Mono)
                    bool canInstallForBranch = false;
                    try
                    {
                        var defaultModsRoot = System.IO.Path.Combine(config.ManagedEnvironmentPath ?? string.Empty, "Default Mods");
                        var runtimeFolder = Models.BranchInfo.GetRuntimeFolder(b.BranchName);
                        var runtimeRoot = System.IO.Path.Combine(defaultModsRoot, runtimeFolder);
                        var modsSrc = System.IO.Path.Combine(runtimeRoot, "Mods");
                        var pluginsSrc = System.IO.Path.Combine(runtimeRoot, "Plugins");
                        bool modsHasFiles = System.IO.Directory.Exists(modsSrc) && System.IO.Directory.EnumerateFileSystemEntries(modsSrc, "*", System.IO.SearchOption.TopDirectoryOnly).Any();
                        bool pluginsHasFiles = System.IO.Directory.Exists(pluginsSrc) && System.IO.Directory.EnumerateFileSystemEntries(pluginsSrc, "*", System.IO.SearchOption.TopDirectoryOnly).Any();
                        canInstallForBranch = modsHasFiles || pluginsHasFiles;
                    }
                    catch { }

                    Branches.Add(b);
                    b.CanInstallDefaultMods = canInstallForBranch;
                }
                _uiLogService.Add($"Loaded {Branches.Count} branches.");
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error loading branches");
                _uiLogService.Add($"Error loading branches: {ex.Message}");
            }
        }

        public async void Refresh()
        {
            await LoadBranchesAsync();
        }

        private string? TryReadBuildIdFromManifestFile(string manifestPath)
        {
            try
            {
                if (!System.IO.File.Exists(manifestPath)) return null;
                var content = System.IO.File.ReadAllText(manifestPath);
                var m = System.Text.RegularExpressions.Regex.Match(content, "\"buildid\"\\s+\"(?<id>\\d+)\"");
                return m.Success ? m.Groups["id"].Value : null;
            }
            catch
            {
                return null;
            }
        }
    }
}
