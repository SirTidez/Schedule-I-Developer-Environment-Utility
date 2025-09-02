namespace Schedule_I_Developer_Environment_Utility.Models
{
    /// <summary>
    /// Represents information about a Steam game
    /// </summary>
    public class SteamGameInfo
    {
        public string AppId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string InstallPath { get; set; } = string.Empty;
        public string LibraryPath { get; set; } = string.Empty;
    }
}