namespace Schedule_I_Developer_Environment_Utility.Models
{
    /// <summary>
    /// Represents build information for a specific branch including build ID and timestamp
    /// </summary>
    public class BranchBuildInfo
    {
        /// <summary>
        /// The Steam build ID for this branch
        /// </summary>
        public string BuildId { get; set; } = string.Empty;
        
        /// <summary>
        /// Timestamp when this build ID was last detected/updated
        /// </summary>
        public DateTime UpdatedTime { get; set; } = DateTime.Now;
        
        /// <summary>
        /// Default constructor
        /// </summary>
        public BranchBuildInfo()
        {
        }
        
        /// <summary>
        /// Constructor with build ID and current timestamp
        /// </summary>
        public BranchBuildInfo(string buildId)
        {
            BuildId = buildId;
            UpdatedTime = DateTime.Now;
        }
        
        /// <summary>
        /// Constructor with build ID and specific timestamp
        /// </summary>
        public BranchBuildInfo(string buildId, DateTime updatedTime)
        {
            BuildId = buildId;
            UpdatedTime = updatedTime;
        }
        
        /// <summary>
        /// Returns array format [buildId, timestamp] for backward compatibility
        /// </summary>
        public object[] ToArray()
        {
            return new object[] { BuildId, UpdatedTime.ToString("yyyy-MM-ddTHH:mm:ss") };
        }
        
        /// <summary>
        /// Creates BranchBuildInfo from array format [buildId, timestamp]
        /// </summary>
        public static BranchBuildInfo FromArray(object[] array)
        {
            if (array.Length >= 2)
            {
                var buildId = array[0]?.ToString() ?? string.Empty;
                if (DateTime.TryParse(array[1]?.ToString(), out var timestamp))
                {
                    return new BranchBuildInfo(buildId, timestamp);
                }
            }
            return new BranchBuildInfo(array[0]?.ToString() ?? string.Empty);
        }
    }
}