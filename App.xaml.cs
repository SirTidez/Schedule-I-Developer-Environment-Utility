using System;
using System.Threading.Tasks;
using Microsoft.UI.Xaml;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Windows.AppNotifications;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace Schedule_I_Developer_Environment_Utility
{
    /// <summary>
    /// Provides application-specific behavior to supplement the default Application class.
    /// </summary>
    public partial class App : Application
    {
        private Window? _window;
        private IServiceProvider? _serviceProvider;

        /// <summary>
        /// Gets the current service provider instance.
        /// </summary>
        public static IServiceProvider? Services { get; private set; }

        /// <summary>
        /// Initializes the singleton application object.  This is the first line of authored code
        /// executed, and as such is the logical equivalent of main() or WinMain().
        /// </summary>
        public App()
        {
            InitializeComponent();
            ConfigureServices();
        }

        /// <summary>
        /// Configure dependency injection services
        /// </summary>
        private void ConfigureServices()
        {
            var services = new ServiceCollection();

            // Pre-create logging helpers to wire providers
            var uiLogService = new Services.UiLogService();
            var fileLoggerFactory = new Services.FileLoggingServiceFactory();

            // Add logging
            services.AddLogging(builder =>
            {
                builder.AddConsole();
                builder.SetMinimumLevel(LogLevel.Information);
                builder.AddProvider(new Services.FileLoggingProvider(fileLoggerFactory));
                builder.AddProvider(new Services.UiLoggerProvider(uiLogService));
            });

            // Register Services
            services.AddSingleton(uiLogService);
            services.AddSingleton(fileLoggerFactory);
            services.AddSingleton<Services.SteamService>();
            services.AddSingleton<Services.ConfigurationService>();

            _serviceProvider = services.BuildServiceProvider();
            Services = _serviceProvider;
        }

        /// <summary>
        /// Invoked when the application is launched.
        /// </summary>
        /// <param name="args">Details about the launch request and process.</param>
        protected override void OnLaunched(Microsoft.UI.Xaml.LaunchActivatedEventArgs args)
        {
            try { AppNotificationManager.Default.Register(); } catch { }
            // Launch flow: if config exists -> Managed Environment; else -> Setup Wizard
            var configService = Services?.GetService<Services.ConfigurationService>();
            if (configService != null && !configService.ConfigurationExists())
            {
                var wizard = new SetupWizardWindow();
                _window = wizard;
                Schedule_I_Developer_Environment_Utility.Services.ThemeService.ApplyDark(wizard);
                // Attach UI dispatcher for UI logging
                var uiLog = Services?.GetService<Services.UiLogService>();
                try { uiLog?.AttachDispatcher(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()); } catch { }
                wizard.Activate();
            }
            else if (configService != null && configService.ConfigurationExists())
            {
                try
                {
                    var managedWindow = new ManagedEnvironmentWindow();
                    _window = managedWindow;
                    Schedule_I_Developer_Environment_Utility.Services.ThemeService.ApplyDark(managedWindow);
                    // Attach UI dispatcher for UI logging
                    var uiLog = Services?.GetService<Services.UiLogService>();
                    try { uiLog?.AttachDispatcher(Microsoft.UI.Dispatching.DispatcherQueue.GetForCurrentThread()); } catch { }
                    managedWindow.Activate();
                }
                catch { }
            }
        }
        
        private async Task RunConsoleTestAsync()
        {
            try
            {
                // Allocate a console for this Windows app
                AllocConsole();
                await ConsoleTest.RunTestAsync();
            }
            catch (Exception ex)
            {
                // If console test fails, we'll still show the window
                System.Diagnostics.Debug.WriteLine($"Console test error: {ex.Message}");
            }
        }
        
        [System.Runtime.InteropServices.DllImport("kernel32.dll")]
        private static extern bool AllocConsole();
    }
}
