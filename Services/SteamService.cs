using System.Text.Json;
using Microsoft.Extensions.Logging;
using Schedule_I_Developer_Environment_Utility.Models;
using System.IO;

namespace Schedule_I_Developer_Environment_Utility.Services
{
    /// <summary>
    /// Service for interacting with Steam and managing Steam games
    /// </summary>
    public class SteamService
    {
        private readonly ILogger<SteamService> _logger;
        private const string ScheduleISteamId = "3164500"; // Schedule I Steam App ID
        
        public SteamService(ILogger<SteamService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Gets the Steam installation path
        /// </summary>
        public string? GetSteamInstallPath()
        {
            try
            {
                // Try to find Steam in common installation paths
                var possiblePaths = new[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Steam"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Steam"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Steam")
                };

                foreach (var path in possiblePaths)
                {
                    if (Directory.Exists(path) && File.Exists(Path.Combine(path, "steam.exe")))
                    {
                        _logger.LogInformation("Found Steam installation at: {Path}", path);
                        return path;
                    }
                }

                _logger.LogWarning("Steam installation not found in common paths");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finding Steam installation path");
                return null;
            }
        }

        /// <summary>
        /// Gets all Steam library paths
        /// </summary>
        public List<string> GetSteamLibraryPaths()
        {
            var libraryPaths = new List<string>();
            
            try
            {
                var steamPath = GetSteamInstallPath();
                if (string.IsNullOrEmpty(steamPath))
                {
                    _logger.LogWarning("Steam path not found, cannot determine library paths");
                    return libraryPaths;
                }

                // Default Steam library path
                var defaultLibrary = Path.Combine(steamPath, "steamapps");
                if (Directory.Exists(defaultLibrary))
                {
                    libraryPaths.Add(defaultLibrary);
                }

                // Check for additional library folders
                var libraryFoldersPath = Path.Combine(steamPath, "steamapps", "libraryfolders.vdf");
                if (File.Exists(libraryFoldersPath))
                {
                    var content = File.ReadAllText(libraryFoldersPath);
                    var lines = content.Split('\n');
                    
                    foreach (var line in lines)
                    {
                        if (line.Contains("\"path\""))
                        {
                            var pathMatch = System.Text.RegularExpressions.Regex.Match(line, "\"path\"\\s+\"([^\"]+)\"");
                            if (pathMatch.Success)
                            {
                                var libraryPath = Path.Combine(pathMatch.Groups[1].Value, "steamapps");
                                if (Directory.Exists(libraryPath))
                                {
                                    libraryPaths.Add(libraryPath);
                                }
                            }
                        }
                    }
                }

                // Sort libraries to prioritize C: drive
                libraryPaths = libraryPaths.OrderBy(path => 
                {
                    var drive = Path.GetPathRoot(path);
                    return drive?.ToUpper() == "C:\\" ? 0 : 1;
                }).ToList();

                _logger.LogInformation("Found {Count} Steam library paths", libraryPaths.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Steam library paths");
            }

            return libraryPaths;
        }

        /// <summary>
        /// Gets the default Steam library path (prioritizes C: drive)
        /// </summary>
        public string? GetDefaultSteamLibraryPath()
        {
            var libraryPaths = GetSteamLibraryPaths();
            return libraryPaths.FirstOrDefault();
        }

        /// <summary>
        /// Checks if Schedule I is installed in any of the Steam libraries
        /// </summary>
        public SteamGameInfo? FindScheduleIGameInLibraries()
        {
            try
            {
                var libraryPaths = GetSteamLibraryPaths();
                
                foreach (var libraryPath in libraryPaths)
                {
                    var games = GetSteamGames(libraryPath);
                    var scheduleIGame = games.FirstOrDefault(g => IsScheduleIGame(g));
                    
                    if (scheduleIGame != null)
                    {
                        _logger.LogInformation("Found Schedule I in library: {LibraryPath}", libraryPath);
                        return scheduleIGame;
                    }
                }
                
                _logger.LogWarning("Schedule I not found in any Steam library");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching for Schedule I in Steam libraries");
                return null;
            }
        }

        /// <summary>
        /// Gets all Steam games from a specific library
        /// </summary>
        public List<SteamGameInfo> GetSteamGames(string libraryPath)
        {
            var games = new List<SteamGameInfo>();
            
            try
            {
                if (!Directory.Exists(libraryPath))
                {
                    _logger.LogWarning("Library path does not exist: {Path}", libraryPath);
                    return games;
                }

                var appManifestFiles = Directory.GetFiles(libraryPath, "appmanifest_*.acf");
                
                foreach (var manifestFile in appManifestFiles)
                {
                    try
                    {
                        var gameInfo = ParseAppManifest(manifestFile, libraryPath);
                        if (gameInfo != null)
                        {
                            games.Add(gameInfo);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Error parsing manifest file: {File}", manifestFile);
                    }
                }

                _logger.LogInformation("Found {Count} games in library: {Path}", games.Count, libraryPath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Steam games from library: {Path}", libraryPath);
            }

            return games;
        }

        /// <summary>
        /// Checks if a game is Schedule I
        /// </summary>
        public bool IsScheduleIGame(SteamGameInfo game)
        {
            return game.AppId == ScheduleISteamId || 
                   game.Name.Contains("Schedule I", StringComparison.OrdinalIgnoreCase) ||
                   game.Name.Contains("Schedule One", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Gets the Schedule I Steam ID
        /// </summary>
        public string GetScheduleISteamID()
        {
            return ScheduleISteamId;
        }

        /// <summary>
        /// Detects which branch of Schedule I is currently installed by reading the Steam app manifest
        /// </summary>
        public string? DetectInstalledBranch(string gameInstallPath)
        {
            try
            {
                if (!Directory.Exists(gameInstallPath))
                {
                    _logger.LogWarning("Game install path does not exist: {Path}", gameInstallPath);
                    return null;
                }

                // Navigate to the steamapps directory to find the app manifest
                // Game install path is typically: .../steamapps/common/Schedule I
                // We need to go up two levels to reach steamapps
                var steamAppsPath = Path.GetFullPath(Path.Combine(gameInstallPath, "..", ".."));
                var appManifestPath = Path.Combine(steamAppsPath, $"appmanifest_{ScheduleISteamId}.acf");

                if (!File.Exists(appManifestPath))
                {
                    _logger.LogWarning("App manifest not found at: {Path}", appManifestPath);
                    return null;
                }

                _logger.LogInformation("Reading app manifest from: {Path}", appManifestPath);
                var manifestContent = File.ReadAllText(appManifestPath);

                // Parse the manifest to find the UserConfig section and BetaKey
                var branch = ParseBranchFromManifest(manifestContent);
                
                if (!string.IsNullOrEmpty(branch))
                {
                    _logger.LogInformation("Detected branch from manifest: {Branch}", branch);
                    return branch;
                }

                // Fallback to main branch if no beta key found
                _logger.LogInformation("No beta key found in manifest, defaulting to main-branch");
                return "main-branch";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error detecting installed branch for path: {Path}", gameInstallPath);
                return null;
            }
        }

        /// <summary>
        /// Gets the build ID from the Steam app manifest for a specific game installation
        /// </summary>
        public string? GetBuildIdFromManifest(string gameInstallPath)
        {
            try
            {
                if (!Directory.Exists(gameInstallPath))
                {
                    _logger.LogWarning("Game install path does not exist: {Path}", gameInstallPath);
                    return null;
                }

                // Navigate to the steamapps directory to find the app manifest
                var steamAppsPath = Path.GetFullPath(Path.Combine(gameInstallPath, "..", ".."));
                var appManifestPath = Path.Combine(steamAppsPath, $"appmanifest_{ScheduleISteamId}.acf");

                if (!File.Exists(appManifestPath))
                {
                    _logger.LogWarning("App manifest not found at: {Path}", appManifestPath);
                    return null;
                }

                _logger.LogInformation("Reading app manifest for build ID from: {Path}", appManifestPath);
                var manifestContent = File.ReadAllText(appManifestPath);

                // Parse the manifest to find the BuildID
                var buildId = ParseBuildIdFromManifest(manifestContent);
                
                if (!string.IsNullOrEmpty(buildId))
                {
                    _logger.LogInformation("Extracted build ID from manifest: {BuildId}", buildId);
                    return buildId;
                }

                _logger.LogWarning("No build ID found in manifest");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting build ID from manifest for path: {Path}", gameInstallPath);
                return null;
            }
        }

        /// <summary>
        /// Gets both branch and build ID information from the Steam app manifest
        /// </summary>
        public (string? branch, string? buildId) GetBranchAndBuildIdFromManifest(string gameInstallPath)
        {
            try
            {
                if (!Directory.Exists(gameInstallPath))
                {
                    _logger.LogWarning("Game install path does not exist: {Path}", gameInstallPath);
                    return (null, null);
                }

                // Navigate to the steamapps directory to find the app manifest
                var steamAppsPath = Path.GetFullPath(Path.Combine(gameInstallPath, "..", ".."));
                var appManifestPath = Path.Combine(steamAppsPath, $"appmanifest_{ScheduleISteamId}.acf");

                if (!File.Exists(appManifestPath))
                {
                    _logger.LogWarning("App manifest not found at: {Path}", appManifestPath);
                    return (null, null);
                }

                _logger.LogInformation("Reading app manifest for branch and build ID from: {Path}", appManifestPath);
                var manifestContent = File.ReadAllText(appManifestPath);

                // Parse both branch and build ID from the manifest
                var branch = ParseBranchFromManifest(manifestContent);
                var buildId = ParseBuildIdFromManifest(manifestContent);
                
                _logger.LogInformation("Extracted from manifest - Branch: {Branch}, Build ID: {BuildId}", branch, buildId);
                return (branch, buildId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting branch and build ID from manifest for path: {Path}", gameInstallPath);
                return (null, null);
            }
        }

        /// <summary>
        /// Parses the Steam app manifest to extract the branch information from UserConfig.BetaKey
        /// </summary>
        private string? ParseBranchFromManifest(string manifestContent)
        {
            try
            {
                // The manifest format is similar to JSON but with specific Steam formatting
                // We need to find the UserConfig section and extract the BetaKey value
                
                // Look for UserConfig section
                var userConfigStart = manifestContent.IndexOf("\"UserConfig\"");
                if (userConfigStart == -1)
                {
                    _logger.LogWarning("UserConfig section not found in manifest");
                    return null;
                }

                // Find the opening brace of UserConfig
                var braceStart = manifestContent.IndexOf('{', userConfigStart);
                if (braceStart == -1)
                {
                    _logger.LogWarning("UserConfig opening brace not found");
                    return null;
                }

                // Find the closing brace of UserConfig
                var braceCount = 0;
                var braceEnd = -1;
                for (int i = braceStart; i < manifestContent.Length; i++)
                {
                    if (manifestContent[i] == '{')
                        braceCount++;
                    else if (manifestContent[i] == '}')
                    {
                        braceCount--;
                        if (braceCount == 0)
                        {
                            braceEnd = i;
                            break;
                        }
                    }
                }

                if (braceEnd == -1)
                {
                    _logger.LogWarning("UserConfig closing brace not found");
                    return null;
                }

                // Extract the UserConfig section content
                var userConfigContent = manifestContent.Substring(braceStart, braceEnd - braceStart + 1);
                
                // Look for BetaKey in the UserConfig section
                var betaKeyMatch = System.Text.RegularExpressions.Regex.Match(userConfigContent, "\"BetaKey\"\\s+\"([^\"]+)\"");
                if (betaKeyMatch.Success)
                {
                    var betaKey = betaKeyMatch.Groups[1].Value.Trim().ToLower();
                    _logger.LogInformation("Found BetaKey in manifest: {BetaKey}", betaKey);
                    
                    // Map the beta key to our branch names
                    return MapBetaKeyToBranch(betaKey);
                }

                _logger.LogInformation("No BetaKey found in UserConfig section");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing branch from manifest");
                return null;
            }
        }

        /// <summary>
        /// Maps the Steam beta key to our internal branch names
        /// </summary>
        private string MapBetaKeyToBranch(string betaKey)
        {
            switch (betaKey.ToLower())
            {
                case "beta":
                    return "beta-branch";
                case "alternate":
                    return "alternate-branch";
                case "alternate-beta":
                case "alternatebeta":
                    return "alternate-beta-branch";
                case "main":
                case "stable":
                case "release":
                case "":
                case null:
                default:
                    return "main-branch";
            }
        }

        /// <summary>
        /// Parses the Steam app manifest to extract the buildid
        /// </summary>
        private string? ParseBuildIdFromManifest(string manifestContent)
        {
            try
            {
                // Look for buildid in the manifest (lowercase, no spaces as per Steam's format)
                var buildIdMatch = System.Text.RegularExpressions.Regex.Match(manifestContent, "\"buildid\"\\s+\"([^\"]+)\"");
                if (buildIdMatch.Success)
                {
                    var buildId = buildIdMatch.Groups[1].Value.Trim();
                    _logger.LogInformation("Found buildid in manifest: {BuildId}", buildId);
                    return buildId;
                }

                _logger.LogInformation("No buildid found in manifest");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing buildid from manifest");
                return null;
            }
        }

        /// <summary>
        /// Waits for the user to switch to a specific branch and verifies the change
        /// </summary>
        /// <param name="targetBranch">The branch the user should switch to</param>
        /// <param name="gameInstallPath">The current game installation path</param>
        /// <param name="maxWaitTime">Maximum time to wait for branch switch (default: 5 minutes)</param>
        /// <returns>True if branch was successfully switched, false if timeout or cancelled</returns>
        public async Task<bool> WaitForBranchSwitchAsync(string targetBranch, string gameInstallPath, TimeSpan maxWaitTime = default)
        {
            if (maxWaitTime == default)
                maxWaitTime = TimeSpan.FromMinutes(5);

            var startTime = DateTime.Now;
            var checkInterval = TimeSpan.FromSeconds(5); // Check every 5 seconds

            _logger.LogInformation("Waiting for user to switch to branch: {TargetBranch}", targetBranch);

            while (DateTime.Now - startTime < maxWaitTime)
            {
                try
                {
                    // Get current branch from manifest
                    var currentBranch = GetCurrentBranchFromGamePath(gameInstallPath);
                    
                    if (currentBranch == targetBranch)
                    {
                        _logger.LogInformation("Successfully detected branch switch to: {Branch}", targetBranch);
                        return true;
                    }

                    _logger.LogDebug("Current branch is still: {CurrentBranch}, waiting for: {TargetBranch}", 
                        currentBranch, targetBranch);

                    // Wait before next check
                    await Task.Delay(checkInterval);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error checking branch during wait, continuing...");
                    await Task.Delay(checkInterval);
                }
            }

            _logger.LogWarning("Timeout waiting for branch switch to: {TargetBranch}", targetBranch);
            return false;
        }

        /// <summary>
        /// Gets the current branch from a game installation path
        /// </summary>
        /// <param name="gameInstallPath">The game installation path</param>
        /// <returns>The current branch name or null if not found</returns>
        public string? GetCurrentBranchFromGamePath(string gameInstallPath)
        {
            try
            {
                // Go up two levels from game install path to reach steamapps directory
                var steamAppsPath = Path.GetFullPath(Path.Combine(gameInstallPath, "..", ".."));
                var appManifestPath = Path.Combine(steamAppsPath, $"appmanifest_{ScheduleISteamId}.acf");

                if (!File.Exists(appManifestPath))
                {
                    _logger.LogWarning("App manifest not found at: {Path}", appManifestPath);
                    return null;
                }

                var manifestContent = File.ReadAllText(appManifestPath);
                return ParseBranchFromManifest(manifestContent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current branch from game path: {Path}", gameInstallPath);
                return null;
            }
        }

        /// <summary>
        /// Parses a Steam app manifest file
        /// </summary>
        private SteamGameInfo? ParseAppManifest(string manifestPath, string libraryPath)
        {
            try
            {
                var content = File.ReadAllText(manifestPath);
                var lines = content.Split('\n');
                
                var gameInfo = new SteamGameInfo();
                var appId = "";
                var name = "";
                var installDir = "";

                foreach (var line in lines)
                {
                    var trimmedLine = line.Trim();
                    
                    if (trimmedLine.StartsWith("\"appid\""))
                    {
                        var match = System.Text.RegularExpressions.Regex.Match(trimmedLine, "\"appid\"\\s+\"([^\"]+)\"");
                        if (match.Success)
                        {
                            appId = match.Groups[1].Value;
                        }
                    }
                    else if (trimmedLine.StartsWith("\"name\""))
                    {
                        var match = System.Text.RegularExpressions.Regex.Match(trimmedLine, "\"name\"\\s+\"([^\"]+)\"");
                        if (match.Success)
                        {
                            name = match.Groups[1].Value;
                        }
                    }
                    else if (trimmedLine.StartsWith("\"installdir\""))
                    {
                        var match = System.Text.RegularExpressions.Regex.Match(trimmedLine, "\"installdir\"\\s+\"([^\"]+)\"");
                        if (match.Success)
                        {
                            installDir = match.Groups[1].Value;
                        }
                    }
                }

                if (!string.IsNullOrEmpty(appId) && !string.IsNullOrEmpty(name))
                {
                    gameInfo.AppId = appId;
                    gameInfo.Name = name;
                    gameInfo.InstallPath = Path.Combine(libraryPath, "common", installDir);
                    gameInfo.LibraryPath = libraryPath;
                    return gameInfo;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing app manifest: {Path}", manifestPath);
            }

            return null;
        }
        
        /// <summary>
        /// Gets the current branch from game path asynchronously
        /// </summary>
        public async Task<string?> GetCurrentBranchFromGamePathAsync(string gameInstallPath)
        {
            return await Task.Run(() => GetCurrentBranchFromGamePath(gameInstallPath));
        }
        
        /// <summary>
        /// Gets the current build ID for the installed Schedule I game
        /// </summary>
        public async Task<string?> GetCurrentBuildIdAsync(string gameInstallPath)
        {
            try
            {
                return await Task.Run(() =>
                {
                    // Go up two levels from game install path to reach steamapps directory
                    var steamAppsPath = Path.GetFullPath(Path.Combine(gameInstallPath, "..", ".."));
                    var appManifestPath = Path.Combine(steamAppsPath, $"appmanifest_{ScheduleISteamId}.acf");

                    if (!File.Exists(appManifestPath))
                    {
                        _logger.LogWarning("App manifest not found at: {Path}", appManifestPath);
                        return null;
                    }

                    var manifestContent = File.ReadAllText(appManifestPath);
                    return ParseBuildIdFromManifest(manifestContent);
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current build ID from game path: {Path}", gameInstallPath);
                return null;
            }
        }
        
        /// <summary>
        /// Gets the current Steam build ID for a specific branch by checking Steam servers
        /// This would require Steam Web API in a real implementation, for now returns current build ID
        /// </summary>
        public async Task<string?> GetCurrentBuildIdForBranchAsync(string branchName)
        {
            try
            {
                // In a real implementation, this would query Steam Web API for the latest build ID
                // For now, we'll return the current manifest build ID as a fallback
                // This assumes the user keeps Steam updated
                
                _logger.LogDebug("Getting Steam build ID for branch: {BranchName}", branchName);
                
                // For now, return null to indicate we can't get remote build ID
                // This will cause the status to default to UpToDate
                return await Task.FromResult<string?>(null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Steam build ID for branch: {BranchName}", branchName);
                return null;
            }
        }
        
        /// <summary>
        /// Compares local build ID with Steam build ID to determine if an update is available
        /// </summary>
        public async Task<bool> IsBranchUpdateAvailableAsync(string branchName, string localBuildId)
        {
            try
            {
                var steamBuildId = await GetCurrentBuildIdForBranchAsync(branchName);
                
                // If we can't get Steam build ID, assume no update available
                if (string.IsNullOrEmpty(steamBuildId))
                {
                    return false;
                }
                
                // If we don't have a local build ID, assume update is available
                if (string.IsNullOrEmpty(localBuildId))
                {
                    return true;
                }
                
                // Compare build IDs
                return localBuildId != steamBuildId;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if branch update is available for {BranchName}", branchName);
                return false;
            }
        }
        
        /// <summary>
        /// Gets Steam app information including current build ID
        /// </summary>
        public async Task<(string? branchName, string? buildId)> GetSteamAppInfoAsync(string gameInstallPath)
        {
            try
            {
                return await Task.Run(() =>
                {
                    var steamAppsPath = Path.GetFullPath(Path.Combine(gameInstallPath, "..", ".."));
                    var appManifestPath = Path.Combine(steamAppsPath, $"appmanifest_{ScheduleISteamId}.acf");

                    if (!File.Exists(appManifestPath))
                    {
                        _logger.LogWarning("App manifest not found at: {Path}", appManifestPath);
                        return (null, null);
                    }

                    var manifestContent = File.ReadAllText(appManifestPath);
                    var branchName = ParseBranchFromManifest(manifestContent);
                    var buildId = ParseBuildIdFromManifest(manifestContent);
                    
                    return (branchName, buildId);
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Steam app info from: {Path}", gameInstallPath);
                return (null, null);
            }
        }
        
        /// <summary>
        /// Validates that a branch name is supported by the application
        /// </summary>
        public bool IsValidBranch(string branchName)
        {
            return !string.IsNullOrEmpty(branchName) && 
                   DevEnvironmentConfig.AvailableBranches.Contains(branchName);
        }
        
        /// <summary>
        /// Gets a user-friendly description for a branch name
        /// </summary>
        public string GetBranchDescription(string branchName)
        {
            return branchName switch
            {
                "main-branch" => "Main release branch - stable version",
                "beta-branch" => "Beta testing branch - preview features",
                "alternate-branch" => "Alternative build branch",
                "alternate-beta-branch" => "Alternative beta branch - experimental features",
                _ => $"Unknown branch: {branchName}"
            };
        }
    }
}