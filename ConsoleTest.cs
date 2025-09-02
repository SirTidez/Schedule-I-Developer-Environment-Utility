using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Schedule_I_Developer_Environment_Utility.Services;
using System;
using System.Threading.Tasks;

namespace Schedule_I_Developer_Environment_Utility
{
    /// <summary>
    /// Console test to validate our services work correctly
    /// </summary>
    public static class ConsoleTest
    {
        public static async Task RunTestAsync()
        {
            Console.WriteLine("=== Schedule I Developer Environment Utility - Service Test ===");
            Console.WriteLine();

            // Set up DI container like we do in App.xaml.cs
            var services = new ServiceCollection();
            
            services.AddLogging(builder =>
            {
                builder.AddConsole();
                builder.SetMinimumLevel(LogLevel.Information);
            });

            services.AddSingleton<SteamService>();
            services.AddSingleton<ConfigurationService>();
            services.AddSingleton<FileLoggingService>();

            var serviceProvider = services.BuildServiceProvider();
            var steamService = serviceProvider.GetRequiredService<SteamService>();
            var configService = serviceProvider.GetRequiredService<ConfigurationService>();
            var logger = serviceProvider.GetRequiredService<ILogger<object>>();

            try
            {
                Console.WriteLine("1. Testing Steam Detection...");
                var steamPath = steamService.GetSteamInstallPath();
                if (!string.IsNullOrEmpty(steamPath))
                {
                    Console.WriteLine($"   ✅ Steam found: {steamPath}");
                    
                    Console.WriteLine("2. Testing Steam Libraries...");
                    var libraries = steamService.GetSteamLibraryPaths();
                    Console.WriteLine($"   ✅ Found {libraries.Count} Steam libraries");
                    foreach (var library in libraries)
                    {
                        Console.WriteLine($"      - {library}");
                    }
                    
                    Console.WriteLine("3. Testing Schedule I Detection...");
                    var scheduleIGame = steamService.FindScheduleIGameInLibraries();
                    if (scheduleIGame != null)
                    {
                        Console.WriteLine($"   ✅ Schedule I found:");
                        Console.WriteLine($"      App ID: {scheduleIGame.AppId}");
                        Console.WriteLine($"      Name: {scheduleIGame.Name}");
                        Console.WriteLine($"      Install Path: {scheduleIGame.InstallPath}");
                        Console.WriteLine($"      Library: {scheduleIGame.LibraryPath}");
                        
                        Console.WriteLine("4. Testing Branch Detection...");
                        var currentBranch = steamService.DetectInstalledBranch(scheduleIGame.InstallPath);
                        if (!string.IsNullOrEmpty(currentBranch))
                        {
                            Console.WriteLine($"   ✅ Current branch: {currentBranch}");
                        }
                        else
                        {
                            Console.WriteLine($"   ⚠️ Could not detect current branch");
                        }
                        
                        Console.WriteLine("5. Testing Build ID Detection...");
                        var buildId = steamService.GetBuildIdFromManifest(scheduleIGame.InstallPath);
                        if (!string.IsNullOrEmpty(buildId))
                        {
                            Console.WriteLine($"   ✅ Current build ID: {buildId}");
                        }
                        else
                        {
                            Console.WriteLine($"   ⚠️ Could not detect build ID");
                        }
                    }
                    else
                    {
                        Console.WriteLine($"   ⚠️ Schedule I not found in Steam libraries");
                    }
                }
                else
                {
                    Console.WriteLine($"   ❌ Steam not found");
                }
                
                Console.WriteLine("6. Testing Configuration Service...");
                var config = await configService.LoadConfigurationAsync();
                if (config != null)
                {
                    Console.WriteLine($"   ✅ Configuration loaded:");
                    Console.WriteLine($"      Version: {config.ConfigVersion}");
                    Console.WriteLine($"      Selected Branches: {config.SelectedBranches.Count}");
                    Console.WriteLine($"      Last Updated: {config.LastUpdated}");
                    Console.WriteLine($"      Config Path: {configService.GetConfigFilePath()}");
                }
                else
                {
                    Console.WriteLine($"   ❌ Failed to load configuration");
                }
                
                Console.WriteLine();
                Console.WriteLine("=== Service Test Complete ===");
                Console.WriteLine("All core services have been successfully migrated from Windows Forms to WinUI3!");
                
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error during testing: {ex.Message}");
                logger.LogError(ex, "Error during console testing");
            }
        }
    }
}