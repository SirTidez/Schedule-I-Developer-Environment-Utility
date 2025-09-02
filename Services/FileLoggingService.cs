using Microsoft.Extensions.Logging;
using System.IO;

namespace Schedule_I_Developer_Environment_Utility.Services
{
    /// <summary>
    /// Service for logging application output to files
    /// </summary>
    public class FileLoggingService : ILogger
    {
        private string _logDirectory;
        private string _logFilePath = string.Empty;
        private readonly object _lockObject = new object();

        public FileLoggingService()
        {
            // Initially use AppData as fallback - will be updated when managed environment is set
            var appDataPath = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            _logDirectory = Path.Combine(appDataPath, "Schedule I Developer Env", "logs");

            UpdateLogFilePath();
        }

        /// <summary>
        /// Sets the managed environment path for log storage
        /// </summary>
        public void SetManagedEnvironmentPath(string managedEnvironmentPath)
        {
            if (!string.IsNullOrEmpty(managedEnvironmentPath))
            {
                _logDirectory = Path.Combine(managedEnvironmentPath, "logs");
                UpdateLogFilePath();
            }
        }

        /// <summary>
        /// Updates the log file path and ensures directory exists
        /// </summary>
        private void UpdateLogFilePath()
        {
            // Create log filename with format {dd-mm-yy} {hh:mm}.log
            var now = DateTime.Now;
            var logFileName = $"{now:dd-MM-yy} {now:HH-mm}.log";
            _logFilePath = Path.Combine(_logDirectory, logFileName);
            
            // Ensure the logging directory exists
            if (!Directory.Exists(_logDirectory))
            {
                Directory.CreateDirectory(_logDirectory);
            }
        }

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull
        {
            return null;
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            return true; // Log all levels
        }

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel))
                return;

            try
            {
                var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
                var level = logLevel.ToString().ToUpper().PadRight(5);
                var message = formatter(state, exception);
                
                var logEntry = $"[{timestamp}] [{level}] {message}";
                
                if (exception != null)
                {
                    logEntry += $"\nException: {exception.Message}";
                    logEntry += $"\nStackTrace: {exception.StackTrace}";
                }
                
                logEntry += Environment.NewLine;

                lock (_lockObject)
                {
                    File.AppendAllText(_logFilePath, logEntry);
                }
            }
            catch
            {
                // If logging fails, we don't want to crash the application
                // Just silently fail
            }
        }

        /// <summary>
        /// Gets the current log file path
        /// </summary>
        public string GetLogFilePath()
        {
            return _logFilePath;
        }

        /// <summary>
        /// Gets the logging directory path
        /// </summary>
        public string GetLogDirectory()
        {
            return _logDirectory;
        }

        /// <summary>
        /// Gets the current log filename
        /// </summary>
        public string GetCurrentLogFileName()
        {
            return Path.GetFileName(_logFilePath);
        }
    }

    /// <summary>
    /// Factory for creating FileLoggingService instances
    /// </summary>
    public class FileLoggingServiceFactory : ILoggerFactory
    {
        private readonly List<FileLoggingService> _loggers = new List<FileLoggingService>();
        private bool _disposed = false;
        private string? _managedEnvironmentPath;

        /// <summary>
        /// Sets the managed environment path for all new loggers
        /// </summary>
        public void SetManagedEnvironmentPath(string managedEnvironmentPath)
        {
            _managedEnvironmentPath = managedEnvironmentPath;
            
            // Update existing loggers
            foreach (var logger in _loggers)
            {
                logger.SetManagedEnvironmentPath(managedEnvironmentPath);
            }
        }

        public void AddProvider(ILoggerProvider provider)
        {
            // Not needed for our implementation
        }

        public ILogger CreateLogger(string categoryName)
        {
            var logger = new FileLoggingService();
            
            // Apply managed environment path if set
            if (!string.IsNullOrEmpty(_managedEnvironmentPath))
            {
                logger.SetManagedEnvironmentPath(_managedEnvironmentPath);
            }
            
            _loggers.Add(logger);
            return logger;
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                _disposed = true;
                _loggers.Clear();
            }
        }
    }

    /// <summary>
    /// Provider for FileLoggingService instances
    /// </summary>
    public class FileLoggingProvider : ILoggerProvider
    {
        private readonly FileLoggingServiceFactory _factory;

        public FileLoggingProvider(FileLoggingServiceFactory factory)
        {
            _factory = factory;
        }

        public ILogger CreateLogger(string categoryName)
        {
            return _factory.CreateLogger(categoryName);
        }

        public void Dispose()
        {
            _factory.Dispose();
        }
    }
}