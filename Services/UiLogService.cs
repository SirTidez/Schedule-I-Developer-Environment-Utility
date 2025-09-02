using System.Collections.ObjectModel;
using Microsoft.UI.Dispatching;

namespace Schedule_I_Developer_Environment_Utility.Services
{
    /// <summary>
    /// Simple UI log aggregator with dispatcher-aware appends.
    /// </summary>
    public class UiLogService
    {
        private DispatcherQueue? _dispatcher;
        public ObservableCollection<string> Logs { get; } = new();

        public void AttachDispatcher(DispatcherQueue dispatcher)
        {
            _dispatcher = dispatcher;
        }

        public void Add(string message)
        {
            if (_dispatcher?.TryEnqueue(() => Logs.Add(message)) != true)
            {
                Logs.Add(message);
            }
        }
    }
}

