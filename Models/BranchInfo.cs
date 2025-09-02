using System;
using System.IO;
using Microsoft.UI;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml;

namespace Schedule_I_Developer_Environment_Utility.Models
{
    /// <summary>
    /// Represents information about a managed branch installation
    /// </summary>
    public class BranchInfo
    {
        /// <summary>
        /// Internal branch name (e.g., "main-branch", "beta-branch")
        /// </summary>
        public string BranchName { get; set; } = string.Empty;
        
        /// <summary>
        /// Human-readable display name for the branch
        /// </summary>
        public string DisplayName { get; set; } = string.Empty;
        
        /// <summary>
        /// Full path to the branch folder in managed environment
        /// </summary>
        public string FolderPath { get; set; } = string.Empty;
        
        /// <summary>
        /// Full path to the Schedule I.exe executable for this branch
        /// </summary>
        public string ExecutablePath { get; set; } = string.Empty;
        
        /// <summary>
        /// Number of DLL mods in the Mods directory (top-level only)
        /// </summary>
        public int ModsDllCount { get; set; }
        public bool CanInstallDefaultMods { get; set; }
        
        /// <summary>
        /// Total size of the branch directory in bytes
        /// </summary>
        public long DirectorySize { get; set; }
        
        /// <summary>
        /// Number of files in the branch directory
        /// </summary>
        public int FileCount { get; set; }
        
        /// <summary>
        /// When the branch folder was last modified
        /// </summary>
        public DateTime LastModified { get; set; }
        
        /// <summary>
        /// Build ID of the local managed copy
        /// </summary>
        public string LocalBuildId { get; set; } = string.Empty;
        
        /// <summary>
        /// Current build ID from Steam for this branch
        /// </summary>
        public string SteamBuildId { get; set; } = string.Empty;
        
        /// <summary>
        /// Current status of the branch (up-to-date, needs update, etc.)
        /// </summary>
        public BranchStatus Status { get; set; }
        
        /// <summary>
        /// Whether this branch matches the currently installed Steam branch
        /// </summary>
        public bool IsCurrentSteamBranch { get; set; }
        public bool IsNotInstalled => Status == BranchStatus.NotInstalled;
        public bool NotPlayable => !IsInstalled;
        public double PlayOpacity => IsInstalled ? 1.0 : 0.5;
        public string PlayTooltip => IsInstalled ? "Play" : "Executable missing";
        public string ModsFolderPath => Path.Combine(FolderPath ?? string.Empty, "Mods");

        /// <summary>
        /// Determines if a branch uses Il2Cpp runtime (Main/Beta) vs Mono (Alternates)
        /// </summary>
        public static bool IsIl2CppBranch(string branchName)
        {
            return string.Equals(branchName, "main-branch", StringComparison.OrdinalIgnoreCase)
                || string.Equals(branchName, "beta-branch", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Returns the runtime folder name used under Default Mods for this branch
        /// </summary>
        public static string GetRuntimeFolder(string branchName)
        {
            return IsIl2CppBranch(branchName) ? "Il2Cpp" : "Mono";
        }

        /// <summary>
        /// Whether the stored local build ID matches the current Steam build ID
        /// </summary>
        public bool BuildIdMatches => !string.IsNullOrEmpty(LocalBuildId) &&
                                      !string.IsNullOrEmpty(SteamBuildId) &&
                                      string.Equals(LocalBuildId, SteamBuildId, StringComparison.Ordinal);
        
        
        /// <summary>
        /// Whether the branch folder exists and has a valid executable
        /// </summary>
        public bool IsInstalled => !string.IsNullOrEmpty(FolderPath) && 
                                   Directory.Exists(FolderPath) && 
                                   File.Exists(ExecutablePath);
        
        /// <summary>
        /// Formatted display string for directory size
        /// </summary>
        public string FormattedSize => FormatFileSize(DirectorySize);
        
        /// <summary>
        /// Formatted display string for file count
        /// </summary>
        public string FormattedFileCount => FileCount > 0 ? $"{FileCount:N0}" : "---";
        
        /// <summary>
        /// Formatted display string for last modified date
        /// </summary>
        public string FormattedLastModified => LastModified != DateTime.MinValue ? 
                                               LastModified.ToString("MM/dd") : "---";
        
        /// <summary>
        /// Gets the status icon character for display
        /// </summary>
        public string StatusIcon => Status switch
        {
            BranchStatus.UpToDate => "✅",
            BranchStatus.UpdateAvailable => "⚠️",
            BranchStatus.NotInstalled => "➕",
            BranchStatus.Error => "❌",
            _ => "❓"
        };
        
        /// <summary>
        /// Gets the status description for tooltips
        /// </summary>
        public string StatusDescription => Status switch
        {
            BranchStatus.UpToDate => "Branch is up to date with Steam",
            BranchStatus.UpdateAvailable => "Steam has a newer version available",
            BranchStatus.NotInstalled => "Branch is not installed locally",
            BranchStatus.Error => "Error checking branch status",
            _ => "Unknown status"
        };

        public string StatusDisplay => Status switch
        {
            BranchStatus.UpToDate => "Current",
            BranchStatus.UpdateAvailable => "Update Required",
            BranchStatus.NotInstalled => "Not Installed",
            BranchStatus.Error => "Error",
            _ => Status.ToString()
        };

        public string StatusGlyph => Status switch
        {
            BranchStatus.UpToDate => "\uE73E", // CheckMark
            BranchStatus.UpdateAvailable => "\uE895", // Sync/Arrow circle
            BranchStatus.Error => "\uE711", // Close
            BranchStatus.NotInstalled => "\uEA39", // ErrorBadge
            _ => "\uE946" // Info
        };

        public SolidColorBrush StatusBrush => Status switch
        {
            BranchStatus.UpToDate => new SolidColorBrush(Colors.LimeGreen),
            BranchStatus.UpdateAvailable => new SolidColorBrush(Colors.DodgerBlue),
            BranchStatus.Error => new SolidColorBrush(Colors.Red),
            BranchStatus.NotInstalled => new SolidColorBrush(Colors.OrangeRed),
            _ => new SolidColorBrush(Colors.Gray)
        };

        public Visibility InstallVisibility => (Status == BranchStatus.NotInstalled || Status == BranchStatus.Error)
            ? Visibility.Visible : Visibility.Collapsed;
        public Visibility InstalledVisibility => (IsInstalled && Status != BranchStatus.Error)
            ? Visibility.Visible : Visibility.Collapsed;

        public Visibility RowHighlightVisibility => IsCurrentSteamBranch ? Visibility.Visible : Visibility.Collapsed;
        
        /// <summary>
        /// Creates a display-friendly branch name from internal name
        /// </summary>
        public static string GetDisplayName(string branchName)
        {
            return branchName switch
            {
                "main-branch" => "Main Branch",
                "beta-branch" => "Beta Branch", 
                "alternate-branch" => "Alternate Branch",
                "alternate-beta-branch" => "Alternate Beta Branch",
                _ => branchName.Replace("-", " ").ToTitleCase()
            };
        }
        
        /// <summary>
        /// Formats file size in human-readable format
        /// </summary>
        private string FormatFileSize(long bytes)
        {
            if (bytes == 0) return "---";
            
            string[] sizes = { "B", "KB", "MB", "GB", "TB" };
            double len = bytes;
            int order = 0;
            
            while (len >= 1024 && order < sizes.Length - 1)
            {
                order++;
                len = len / 1024;
            }
            
            return $"{len:0.##} {sizes[order]}";
        }
    }
    
    /// <summary>
    /// Represents the status of a managed branch
    /// </summary>
    public enum BranchStatus
    {
        /// <summary>
        /// Branch is up to date with Steam version
        /// </summary>
        UpToDate,
        
        /// <summary>
        /// Steam has a newer version available for this branch
        /// </summary>
        UpdateAvailable,
        
        /// <summary>
        /// Branch is not installed in the managed environment
        /// </summary>
        NotInstalled,
        
        /// <summary>
        /// Error occurred while checking branch status
        /// </summary>
        Error
    }
}

/// <summary>
/// Extension methods for string manipulation
/// </summary>
internal static class StringExtensions
{
    /// <summary>
    /// Converts a string to title case
    /// </summary>
    public static string ToTitleCase(this string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;
            
        var words = input.Split(' ');
        for (int i = 0; i < words.Length; i++)
        {
            if (words[i].Length > 0)
            {
                words[i] = char.ToUpper(words[i][0]) + words[i].Substring(1).ToLower();
            }
        }
        return string.Join(" ", words);
    }
}
