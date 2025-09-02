using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Schedule_I_Developer_Environment_Utility.Models;
using Schedule_I_Developer_Environment_Utility.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Schedule_I_Developer_Environment_Utility.ViewModels
{
    /// <summary>
    /// ViewModel for the MainWindow - handles initial setup and basic functionality testing
    /// </summary>
    public class MainWindowViewModel : BaseViewModel
    {
        private readonly ILogger<MainWindowViewModel> _logger;
        private readonly SteamService _steamService;
        private readonly ConfigurationService _configService;
        private readonly UiLogService _uiLogService;
        
        private string _statusMessage = "Initializing...";
        private bool _isSteamFound;
        private string _steamPath = string.Empty;
        private ObservableCollection<string> _steamLibraries = new();
        private DevEnvironmentConfig? _config;

        public MainWindowViewModel()
        {
            // Get services from the App's service provider
            _logger = App.Services?.GetRequiredService<ILogger<MainWindowViewModel>>()!;
            _steamService = App.Services?.GetRequiredService<SteamService>()!;
            _configService = App.Services?.GetRequiredService<ConfigurationService>()!;
            _uiLogService = App.Services?.GetRequiredService<UiLogService>()!;

            SteamLibraries = new ObservableCollection<string>();
            
            // Initialize asynchronously
            _ = InitializeAsync();
        }

        public string StatusMessage
        {
            get => _statusMessage;
            set => SetProperty(ref _statusMessage, value);
        }

        public bool IsSteamFound
        {
            get => _isSteamFound;
            set => SetProperty(ref _isSteamFound, value);
        }

        public string SteamPath
        {
            get => _steamPath;
            set => SetProperty(ref _steamPath, value);
        }

        public ObservableCollection<string> SteamLibraries
        {
            get => _steamLibraries;
            set => SetProperty(ref _steamLibraries, value);
        }

        public DevEnvironmentConfig? Config
        {
            get => _config;
            set => SetProperty(ref _config, value);
        }

        public ObservableCollection<string> UiLogs => _uiLogService.Logs;

        private async Task InitializeAsync()
        {
            try
            {
                _logger.LogInformation("MainWindowViewModel initializing...");
                _uiLogService.Add("Initializing view model...");
                
                StatusMessage = "Detecting Steam installation...";
                
                // Check for Steam
                var steamPath = _steamService.GetSteamInstallPath();
                if (!string.IsNullOrEmpty(steamPath))
                {
                    IsSteamFound = true;
                    SteamPath = steamPath;
                    StatusMessage = $"Steam found: {steamPath}";
                    
                    // Get Steam libraries
                    StatusMessage = "Loading Steam libraries...";
                    var libraries = _steamService.GetSteamLibraryPaths();
                    SteamLibraries.Clear();
                    foreach (var library in libraries)
                    {
                        SteamLibraries.Add(library);
                    }
                    
                    StatusMessage = $"Found {libraries.Count} Steam libraries";
                    _logger.LogInformation("Found {Count} Steam libraries", libraries.Count);
                    
                    // Look for Schedule I
                    StatusMessage = "Searching for Schedule I...";
                    var scheduleIGame = _steamService.FindScheduleIGameInLibraries();
                    if (scheduleIGame != null)
                    {
                        StatusMessage = $"Schedule I found: {scheduleIGame.InstallPath}";
                        _logger.LogInformation("Schedule I found: {Path}", scheduleIGame.InstallPath);
                    }
                    else
                    {
                        StatusMessage = "Schedule I not found in Steam libraries";
                        _logger.LogWarning("Schedule I not found in Steam libraries");
                    }
                }
                else
                {
                    IsSteamFound = false;
                    StatusMessage = "Steam installation not found";
                    _logger.LogWarning("Steam installation not found");
                }
                
                // Try to load configuration
                StatusMessage = "Loading configuration...";
                Config = await _configService.LoadConfigurationAsync();
                
                if (Config != null)
                {
                    StatusMessage = $"Configuration loaded - Version: {Config.ConfigVersion}";
                    _logger.LogInformation("Configuration loaded: v{Version}", Config.ConfigVersion);
                }
                
                _logger.LogInformation("MainWindowViewModel initialization complete");
                _uiLogService.Add("Initialization complete.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during MainWindowViewModel initialization");
                StatusMessage = $"Initialization error: {ex.Message}";
                _uiLogService.Add($"Error: {ex.Message}");
            }
        }
        
        public async Task RefreshAsync()
        {
            await InitializeAsync();
        }
    }
}
