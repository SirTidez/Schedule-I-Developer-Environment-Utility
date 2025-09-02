using System.Text.Json;
using Microsoft.Extensions.Logging;
using Schedule_I_Developer_Environment_Utility.Models;
using System.IO;

namespace Schedule_I_Developer_Environment_Utility.Services
{
    /// <summary>
    /// Service for managing application configuration persistence
    /// </summary>
    public class ConfigurationService
    {
        private readonly ILogger<ConfigurationService> _logger;
        private string _configDirectory;
        private string _configFilePath;
        private const string ConfigFileName = "config.json";

        public ConfigurationService(ILogger<ConfigurationService> logger)
        {
            _logger = logger;
            // Default config storage: same vendor tree as the game uses
            // C:\Users\{Username}\AppData\LocalLow\TVGS\Development Environment Manager
            var userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            var localLow = Path.Combine(userProfile, "AppData", "LocalLow");
            var vendorDir = Path.Combine(localLow, "TVGS");
            _configDirectory = Path.Combine(vendorDir, "Development Environment Manager");
            _configFilePath = Path.Combine(_configDirectory, ConfigFileName);

            _logger.LogInformation("Configuration service initialized. Config directory: {ConfigDir}", _configDirectory);
        }

        /// <summary>
        /// Sets the managed environment path for downstream services (does not change config storage location)
        /// </summary>
        public void SetManagedEnvironmentPath(string managedEnvironmentPath)
        {
            // Intentionally left as a no-op for config storage.
            // Config persists under LocalLow\TVGS\Development Environment Manager.
            if (!string.IsNullOrEmpty(managedEnvironmentPath))
            {
                _logger.LogInformation("Managed environment path set to: {ManagedPath}", managedEnvironmentPath);
            }
        }

        /// <summary>
        /// Saves the development environment configuration to file
        /// </summary>
        public async Task SaveConfigurationAsync(DevEnvironmentConfig config)
        {
            try
            {
                // Ensure the configuration directory exists
                if (!Directory.Exists(_configDirectory))
                {
                    Directory.CreateDirectory(_configDirectory);
                    _logger.LogInformation("Created configuration directory: {ConfigDir}", _configDirectory);
                }

                // Serialize configuration to JSON
                var jsonOptions = new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                var jsonString = JsonSerializer.Serialize(config, jsonOptions);
                
                // Write to file
                await File.WriteAllTextAsync(_configFilePath, jsonString);
                
                _logger.LogInformation("Configuration saved successfully to: {ConfigFile}", _configFilePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving configuration to: {ConfigFile}", _configFilePath);
                throw;
            }
        }

        /// <summary>
        /// Loads the development environment configuration from file
        /// </summary>
        public async Task<DevEnvironmentConfig?> LoadConfigurationAsync()
        {
            try
            {
                if (!File.Exists(_configFilePath))
                {
                    _logger.LogInformation("Configuration file not found, returning default configuration");
                    return new DevEnvironmentConfig();
                }

                var jsonString = await File.ReadAllTextAsync(_configFilePath);
                
                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                // First, try to load as v2.0 format
                try
                {
                    var config = JsonSerializer.Deserialize<DevEnvironmentConfig>(jsonString, jsonOptions);
                    
                    if (config != null)
                    {
                        // Check if this is actually a v1.0 config that needs migration
                        if (string.IsNullOrEmpty(config.ConfigVersion) || config.ConfigVersion == "1.0")
                        {
                            _logger.LogInformation("Detected v1.0 configuration format, migrating to v2.0");
                            return await MigrateConfigurationFromV1Async(jsonString, jsonOptions);
                        }
                        
                        _logger.LogInformation("Configuration v{Version} loaded successfully from: {ConfigFile}", 
                            config.ConfigVersion, _configFilePath);
                        return config;
                    }
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "Failed to deserialize as v2.0 format, attempting v1.0 migration");
                    return await MigrateConfigurationFromV1Async(jsonString, jsonOptions);
                }

                _logger.LogWarning("Failed to deserialize configuration, returning default");
                return new DevEnvironmentConfig();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading configuration from: {ConfigFile}", _configFilePath);
                return new DevEnvironmentConfig();
            }
        }

        /// <summary>
        /// Checks if a configuration file exists
        /// </summary>
        public bool ConfigurationExists()
        {
            return File.Exists(_configFilePath);
        }
        
        /// <summary>
        /// Migrates v1.0 configuration format to v2.0 format
        /// </summary>
        private async Task<DevEnvironmentConfig> MigrateConfigurationFromV1Async(string jsonString, JsonSerializerOptions jsonOptions)
        {
            try
            {
                _logger.LogInformation("Starting migration from v1.0 to v2.0 configuration format");
                
                // Deserialize as v1.0 format
                var oldConfig = JsonSerializer.Deserialize<DevEnvironmentConfigV1>(jsonString, jsonOptions);
                
                if (oldConfig == null)
                {
                    _logger.LogError("Failed to deserialize v1.0 configuration, returning default v2.0 config");
                    return new DevEnvironmentConfig();
                }
                
                // Migrate to v2.0 format
                var newConfig = DevEnvironmentConfig.MigrateFromV1(oldConfig);
                
                _logger.LogInformation("Successfully migrated configuration from v1.0 to v2.0");
                _logger.LogInformation("Migrated {Count} build IDs with timestamps", newConfig.BranchBuildIds.Count);
                
                // Save the migrated configuration
                await SaveConfigurationAsync(newConfig);
                _logger.LogInformation("Migrated configuration saved to disk");
                
                return newConfig;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during configuration migration from v1.0 to v2.0");
                return new DevEnvironmentConfig();
            }
        }

        /// <summary>
        /// Gets the configuration file path
        /// </summary>
        public string GetConfigFilePath()
        {
            return _configFilePath;
        }

        /// <summary>
        /// Gets the configuration directory path
        /// </summary>
        public string GetConfigDirectory()
        {
            return _configDirectory;
        }

        /// <summary>
        /// Validates a specific branch installation and returns detailed status
        /// </summary>
        public BranchInfo ValidateBranchInstallation(string branchName, DevEnvironmentConfig config)
        {
            _logger.LogInformation("Starting branch validation for: {BranchName}", branchName);
            
            var branchInfo = new BranchInfo
            {
                BranchName = branchName,
                DisplayName = BranchInfo.GetDisplayName(branchName)
            };

            try
            {
                // Check if managed environment path is valid
                if (string.IsNullOrEmpty(config.ManagedEnvironmentPath) || !Directory.Exists(config.ManagedEnvironmentPath))
                {
                    _logger.LogWarning("Branch {BranchName}: Managed environment path is invalid: {Path}", 
                        branchName, config.ManagedEnvironmentPath ?? "null");
                    branchInfo.Status = BranchStatus.Error;
                    return branchInfo;
                }

                // Set up paths (branches live under ManagedEnvironmentPath\branches\<branch>)
                branchInfo.FolderPath = Path.Combine(config.ManagedEnvironmentPath, "branches", branchName);
                branchInfo.ExecutablePath = Path.Combine(branchInfo.FolderPath, "Schedule I.exe");

                // Check if branch directory exists
                if (!Directory.Exists(branchInfo.FolderPath))
                {
                    _logger.LogInformation("Branch {BranchName}: Directory does not exist: {Path}", 
                        branchName, branchInfo.FolderPath);
                    branchInfo.Status = BranchStatus.NotInstalled;
                    return branchInfo;
                }

                // Check if executable exists
                if (!File.Exists(branchInfo.ExecutablePath))
                {
                    _logger.LogWarning("Branch {BranchName}: Executable missing: {ExePath}", 
                        branchName, branchInfo.ExecutablePath);
                    branchInfo.Status = BranchStatus.Error;
                    return branchInfo;
                }

                // Get directory information
                var directoryInfo = new DirectoryInfo(branchInfo.FolderPath);
                branchInfo.LastModified = directoryInfo.LastWriteTime;
                
                // Calculate directory size and file count
                CalculateDirectoryMetrics(branchInfo.FolderPath, out long totalSize, out int fileCount);
                branchInfo.DirectorySize = totalSize;
                branchInfo.FileCount = fileCount;

                // Count top-level DLL mods in Mods folder
                try
                {
                    var modsPath = Path.Combine(branchInfo.FolderPath, "Mods");
                    if (Directory.Exists(modsPath))
                    {
                        var dlls = Directory.EnumerateFiles(modsPath, "*.dll", SearchOption.TopDirectoryOnly);
                        branchInfo.ModsDllCount = dlls.Count();
                    }
                    else
                    {
                        branchInfo.ModsDllCount = 0;
                    }
                }
                catch
                {
                    branchInfo.ModsDllCount = 0;
                }

                // Get local (stored) build ID from config
                branchInfo.LocalBuildId = config.GetBuildIdForBranch(branchName);

                // Determine status based on stored build ID (live comparison handled in UI layer)
                if (string.IsNullOrEmpty(branchInfo.LocalBuildId))
                {
                    _logger.LogInformation("Branch {BranchName}: No stored build ID tracked", branchName);
                    branchInfo.Status = BranchStatus.UpdateAvailable;
                }
                else
                {
                    _logger.LogInformation("Branch {BranchName}: Stored build ID: {BuildId}", branchName, branchInfo.LocalBuildId);
                    branchInfo.Status = BranchStatus.UpToDate;
                }

                _logger.LogInformation("Branch {BranchName} validation complete: Status={Status}, Size={Size}, Files={Files}", 
                    branchName, branchInfo.StatusDisplay, branchInfo.FormattedSize, branchInfo.FileCount);

                return branchInfo;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating branch {BranchName}", branchName);
                branchInfo.Status = BranchStatus.Error;
                return branchInfo;
            }
        }

        /// <summary>
        /// Validates all selected branches in the configuration
        /// </summary>
        public List<BranchInfo> ValidateAllBranches(DevEnvironmentConfig config)
        {
            _logger.LogInformation("Starting validation of all selected branches: {Count} branches", 
                config.SelectedBranches.Count);

            var results = new List<BranchInfo>();

            foreach (var branchName in config.SelectedBranches)
            {
                var branchInfo = ValidateBranchInstallation(branchName, config);
                results.Add(branchInfo);
            }

            // Log summary
            var statusSummary = results.GroupBy(b => b.Status)
                .ToDictionary(g => g.Key, g => g.Count());
            
            _logger.LogInformation("Branch validation summary: {Summary}", 
                string.Join(", ", statusSummary.Select(kvp => $"{kvp.Key}: {kvp.Value}")));

            return results;
        }

        /// <summary>
        /// Auto-heals configuration by removing invalid branches and fixing recoverable issues
        /// </summary>
        public async Task<DevEnvironmentConfig> AutoHealConfiguration(DevEnvironmentConfig config)
        {
            _logger.LogInformation("Starting auto-healing process for configuration");
            
            bool configChanged = false;
            var healedConfig = config;
            var originalBranchCount = config.SelectedBranches.Count;

            // Validate all branches and collect results
            var branchValidations = ValidateAllBranches(config);
            
            // Track branches to remove
            var branchesToRemove = new List<string>();
            
            foreach (var branchValidation in branchValidations)
            {
                switch (branchValidation.Status)
                {
                    case BranchStatus.Error:
                        _logger.LogWarning("Auto-heal: Removing invalid branch {BranchName} (Status: Error)", 
                            branchValidation.BranchName);
                        branchesToRemove.Add(branchValidation.BranchName);
                        configChanged = true;
                        break;
                        
                    case BranchStatus.NotInstalled:
                        _logger.LogWarning("Auto-heal: Removing uninstalled branch {BranchName} (Status: NotInstalled)", 
                            branchValidation.BranchName);
                        branchesToRemove.Add(branchValidation.BranchName);
                        configChanged = true;
                        break;
                        
                    case BranchStatus.UpdateAvailable:
                        // For branches missing build IDs, we could potentially scan and rebuild metadata
                        // For now, just log but don't remove - this is recoverable
                        _logger.LogInformation("Auto-heal: Branch {BranchName} needs build ID update but is otherwise valid", 
                            branchValidation.BranchName);
                        break;
                        
                    case BranchStatus.UpToDate:
                        _logger.LogDebug("Auto-heal: Branch {BranchName} is valid and up to date", 
                            branchValidation.BranchName);
                        break;
                }
            }
            
            // Remove invalid branches from configuration
            if (branchesToRemove.Any())
            {
                var originalBranches = new List<string>(healedConfig.SelectedBranches);
                healedConfig.SelectedBranches.RemoveAll(branchesToRemove.Contains);
                
                // Also remove build IDs for removed branches
                foreach (var branchName in branchesToRemove)
                {
                    if (healedConfig.BranchBuildIds.ContainsKey(branchName))
                    {
                        healedConfig.BranchBuildIds.Remove(branchName);
                        _logger.LogInformation("Auto-heal: Removed build ID for invalid branch {BranchName}", branchName);
                    }
                }
                
                _logger.LogInformation("Auto-heal: Removed {Count} invalid branches: {Branches}", 
                    branchesToRemove.Count, string.Join(", ", branchesToRemove));
            }
            
            // Clear installed branch if it was removed
            if (!string.IsNullOrEmpty(healedConfig.InstalledBranch) && 
                branchesToRemove.Contains(healedConfig.InstalledBranch))
            {
                _logger.LogInformation("Auto-heal: Clearing installed branch {BranchName} as it was removed", 
                    healedConfig.InstalledBranch);
                healedConfig.InstalledBranch = null;
                configChanged = true;
            }
            
            // Update timestamp if config changed
            if (configChanged)
            {
                healedConfig.LastUpdated = DateTime.Now;
                
                // Save healed configuration
                await SaveConfigurationAsync(healedConfig);
                
                _logger.LogInformation("Auto-heal complete: Original branches: {Original}, Healed branches: {Final}, Changes saved", 
                    originalBranchCount, healedConfig.SelectedBranches.Count);
            }
            else
            {
                _logger.LogInformation("Auto-heal complete: No changes needed, configuration is healthy");
            }
            
            return healedConfig;
        }

        /// <summary>
        /// Performs enhanced configuration validation with auto-healing
        /// Returns a tuple of (isValid, healedConfig)
        /// </summary>
        public async Task<(bool isValid, DevEnvironmentConfig config)> ValidateAndHealConfiguration(DevEnvironmentConfig config)
        {
            _logger.LogInformation("Starting enhanced configuration validation with auto-healing");
            
            // Auto-heal the configuration first
            var healedConfig = await AutoHealConfiguration(config);
            
            // After healing, check if we still have a valid configuration
            bool hasValidPaths = !string.IsNullOrEmpty(healedConfig.ManagedEnvironmentPath) && 
                                Directory.Exists(healedConfig.ManagedEnvironmentPath) &&
                                !string.IsNullOrEmpty(healedConfig.GameInstallPath) && 
                                Directory.Exists(healedConfig.GameInstallPath);
            
            bool hasValidBranches = healedConfig.SelectedBranches.Count > 0;
            
            if (!hasValidPaths)
            {
                _logger.LogWarning("Enhanced validation failed: Invalid or missing paths");
                return (false, healedConfig);
            }
            
            if (!hasValidBranches)
            {
                _logger.LogWarning("Enhanced validation failed: No valid branches remaining after auto-healing");
                return (false, healedConfig);
            }
            
            // Final validation: ensure at least one branch is actually installed and working
            var finalBranchValidations = ValidateAllBranches(healedConfig);
            bool hasInstalledBranch = finalBranchValidations.Any(b => b.Status == BranchStatus.UpToDate || b.Status == BranchStatus.UpdateAvailable);
            
            if (!hasInstalledBranch)
            {
                _logger.LogWarning("Enhanced validation failed: No properly installed branches found");
                return (false, healedConfig);
            }
            
            _logger.LogInformation("Enhanced configuration validation passed: {BranchCount} valid branches", 
                healedConfig.SelectedBranches.Count);
            return (true, healedConfig);
        }

        /// <summary>
        /// Calculates total size and file count for a directory
        /// </summary>
        private void CalculateDirectoryMetrics(string directoryPath, out long totalSize, out int fileCount)
        {
            totalSize = 0;
            fileCount = 0;

            try
            {
                var files = Directory.GetFiles(directoryPath, "*", SearchOption.AllDirectories);
                fileCount = files.Length;

                foreach (var file in files)
                {
                    try
                    {
                        var fileInfo = new FileInfo(file);
                        totalSize += fileInfo.Length;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Could not get size for file: {FilePath}", file);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not calculate metrics for directory: {DirectoryPath}", directoryPath);
            }
        }
    }
}
