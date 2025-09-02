using Microsoft.Extensions.Logging;

namespace Schedule_I_Developer_Environment_Utility.Services
{
    public class UiLoggerProvider : ILoggerProvider
    {
        private readonly UiLogService _uiLogService;

        public UiLoggerProvider(UiLogService uiLogService)
        {
            _uiLogService = uiLogService;
        }

        public ILogger CreateLogger(string categoryName)
        {
            return new UiLogger(_uiLogService, categoryName);
        }

        public void Dispose()
        {
        }
    }

    internal class UiLogger : ILogger
    {
        private readonly UiLogService _service;
        private readonly string _category;

        public UiLogger(UiLogService service, string category)
        {
            _service = service;
            _category = category;
        }

        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, System.Exception? exception, Func<TState, System.Exception?, string> formatter)
        {
            var ts = System.DateTime.Now.ToString("HH:mm:ss");
            var level = logLevel.ToString().ToUpper();
            var msg = formatter(state, exception);
            if (exception != null)
            {
                msg += $" | Ex: {exception.Message}";
            }
            _service.Add($"[{ts}] [{level}] {_category}: {msg}");
        }

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();
            public void Dispose() { }
        }
    }
}

