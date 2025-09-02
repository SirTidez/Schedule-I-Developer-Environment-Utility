namespace Schedule_I_Developer_Environment_Utility.Models
{
    /// <summary>
    /// Represents the configuration for a managed development environment
    /// </summary>
    public class DevEnvironmentConfig
    {
        public string SteamLibraryPath { get; set; } = string.Empty;
        public string GameInstallPath { get; set; } = string.Empty;
        public string ManagedEnvironmentPath { get; set; } = string.Empty;
        public List<string> SelectedBranches { get; set; } = new List<string>();
        public string? InstalledBranch { get; set; } = null;
        
        /// <summary>
        /// Dictionary mapping branch names to their build information (build ID and timestamp)
        /// </summary>
        public Dictionary<string, BranchBuildInfo> BranchBuildIds { get; set; } = new Dictionary<string, BranchBuildInfo>();
        
        /// <summary>
        /// Dictionary mapping branch names to their custom launch commands
        /// </summary>
        public Dictionary<string, string> CustomLaunchCommands { get; set; } = new Dictionary<string, string>();
        
        /// <summary>
        /// Timestamp when the configuration was last updated
        /// </summary>
        public DateTime LastUpdated { get; set; } = DateTime.Now;
        
        /// <summary>
        /// Version of the configuration format
        /// </summary>
        public string ConfigVersion { get; set; } = "2.0";
        
        public static readonly List<string> AvailableBranches = new List<string>
        {
            "main-branch",
            "beta-branch", 
            "alternate-branch",
            "alternate-beta-branch"
        };
        
        /// <summary>
        /// Gets the build ID for a specific branch
        /// </summary>
        public string GetBuildIdForBranch(string branchName)
        {
            return BranchBuildIds.TryGetValue(branchName, out var buildInfo) ? buildInfo.BuildId : string.Empty;
        }
        
        /// <summary>
        /// Gets the build information (ID and timestamp) for a specific branch
        /// </summary>
        public BranchBuildInfo? GetBuildInfoForBranch(string branchName)
        {
            return BranchBuildIds.TryGetValue(branchName, out var buildInfo) ? buildInfo : null;
        }
        
        /// <summary>
        /// Gets the updated time for a specific branch's build ID
        /// </summary>
        public DateTime? GetBuildUpdatedTimeForBranch(string branchName)
        {
            return BranchBuildIds.TryGetValue(branchName, out var buildInfo) ? buildInfo.UpdatedTime : null;
        }
        
        /// <summary>
        /// Sets the build ID for a specific branch with current timestamp
        /// </summary>
        public void SetBuildIdForBranch(string branchName, string buildId)
        {
            var buildInfo = new BranchBuildInfo(buildId);
            BranchBuildIds[branchName] = buildInfo;
            LastUpdated = DateTime.Now;
        }
        
        /// <summary>
        /// Sets the build ID for a specific branch with specific timestamp
        /// </summary>
        public void SetBuildIdForBranch(string branchName, string buildId, DateTime updatedTime)
        {
            var buildInfo = new BranchBuildInfo(buildId, updatedTime);
            BranchBuildIds[branchName] = buildInfo;
            LastUpdated = DateTime.Now;
        }
        
        /// <summary>
        /// Gets the custom launch command for a specific branch
        /// </summary>
        public string GetCustomLaunchCommand(string branchName)
        {
            return CustomLaunchCommands.TryGetValue(branchName, out var command) ? command : string.Empty;
        }
        
        /// <summary>
        /// Sets the custom launch command for a specific branch
        /// </summary>
        public void SetCustomLaunchCommand(string branchName, string command)
        {
            if (string.IsNullOrWhiteSpace(command))
            {
                CustomLaunchCommands.Remove(branchName);
            }
            else
            {
                CustomLaunchCommands[branchName] = command.Trim();
            }
            LastUpdated = DateTime.Now;
        }
        
        /// <summary>
        /// Checks if a branch has a custom launch command set
        /// </summary>
        public bool HasCustomLaunchCommand(string branchName)
        {
            return CustomLaunchCommands.ContainsKey(branchName) && !string.IsNullOrWhiteSpace(CustomLaunchCommands[branchName]);
        }
        
        /// <summary>
        /// Updates the configuration with new values
        /// </summary>
        public void UpdateConfiguration(string steamLibraryPath, string gameInstallPath, string managedEnvironmentPath, List<string> selectedBranches)
        {
            SteamLibraryPath = steamLibraryPath;
            GameInstallPath = gameInstallPath;
            ManagedEnvironmentPath = managedEnvironmentPath;
            SelectedBranches = selectedBranches ?? new List<string>();
            LastUpdated = DateTime.Now;
        }
        
        /// <summary>
        /// Migrates old v1.0 configuration format to new v2.0 format
        /// </summary>
        public static DevEnvironmentConfig MigrateFromV1(DevEnvironmentConfigV1 oldConfig)
        {
            var newConfig = new DevEnvironmentConfig
            {
                SteamLibraryPath = oldConfig.SteamLibraryPath,
                GameInstallPath = oldConfig.GameInstallPath,
                ManagedEnvironmentPath = oldConfig.ManagedEnvironmentPath,
                SelectedBranches = oldConfig.SelectedBranches ?? new List<string>(),
                InstalledBranch = oldConfig.InstalledBranch,
                LastUpdated = oldConfig.LastUpdated,
                ConfigVersion = "2.0",
                CustomLaunchCommands = new Dictionary<string, string>() // Initialize empty for v1.0 configs
            };
            
            // Migrate old build IDs to new structure with current timestamp
            if (oldConfig.BranchBuildIds != null)
            {
                foreach (var kvp in oldConfig.BranchBuildIds)
                {
                    if (!string.IsNullOrEmpty(kvp.Value))
                    {
                        // Use the old LastUpdated time as the build ID timestamp for migration
                        newConfig.SetBuildIdForBranch(kvp.Key, kvp.Value, oldConfig.LastUpdated);
                    }
                }
            }
            
            return newConfig;
        }
    }
    
    /// <summary>
    /// Legacy v1.0 configuration format for migration purposes
    /// </summary>
    public class DevEnvironmentConfigV1
    {
        public string SteamLibraryPath { get; set; } = string.Empty;
        public string GameInstallPath { get; set; } = string.Empty;
        public string ManagedEnvironmentPath { get; set; } = string.Empty;
        public List<string> SelectedBranches { get; set; } = new List<string>();
        public string? InstalledBranch { get; set; } = null;
        public Dictionary<string, string> BranchBuildIds { get; set; } = new Dictionary<string, string>();
        public DateTime LastUpdated { get; set; } = DateTime.Now;
        public string ConfigVersion { get; set; } = "1.0";
    }
}