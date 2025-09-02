using Microsoft.UI.Xaml;
using ThemeSvc = Schedule_I_Developer_Environment_Utility.Services.ThemeService;
using Schedule_I_Developer_Environment_Utility.ViewModels;
using System.Diagnostics;
using Microsoft.UI.Xaml.Controls;
using Microsoft.Extensions.DependencyInjection;
using Schedule_I_Developer_Environment_Utility.Services;
using Schedule_I_Developer_Environment_Utility.Models;
using System.IO.Compression;

namespace Schedule_I_Developer_Environment_Utility
{
    public sealed partial class ManagedEnvironmentWindow : Window
    {
        public ManagedEnvironmentWindow()
        {
            InitializeComponent();
            ThemeSvc.ApplyDark(this);
            ThemeSvc.SetSize(this, 1450, 800);
            if (this.Content is FrameworkElement root)
            {
                root.DataContext = new ManagedEnvironmentViewModel();
            }
        }

        private void OnCloseClick(object sender, RoutedEventArgs e)
        {
            this.Close();
        }

        private void OnRefreshClick(object sender, RoutedEventArgs e)
        {
            if (this.Content is FrameworkElement root && root.DataContext is ManagedEnvironmentViewModel vm)
            {
                vm.Refresh();
            }
        }

        private void OnOpenBranchFolder(object sender, RoutedEventArgs e)
        {
            if (sender is FrameworkElement fe && fe.Tag is string path && !string.IsNullOrWhiteSpace(path))
            {
                try
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "explorer.exe",
                        Arguments = path,
                        UseShellExecute = true
                    });
                }
                catch
                {
                    // ignore
                }
            }
        }

        private void OnOpenBranchExe(object sender, RoutedEventArgs e)
        {
            if (sender is FrameworkElement fe && fe.Tag is string exe && !string.IsNullOrWhiteSpace(exe))
            {
                try
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = exe,
                        UseShellExecute = true
                    });
                }
                catch
                {
                    // ignore
                }
            }
        }

        private void OnMenuRefresh(object sender, RoutedEventArgs e)
        {
            OnRefreshClick(sender, e);
        }

        private void OnMenuOpenConfigFolder(object sender, RoutedEventArgs e)
        {
            try
            {
                var cfg = App.Services?.GetService<ConfigurationService>();
                var dir = cfg?.GetConfigDirectory();
                if (!string.IsNullOrEmpty(dir))
                {
                    Process.Start(new ProcessStartInfo { FileName = dir, UseShellExecute = true });
                }
            }
            catch { }
        }

        private void OnMenuOpenManagedFolder(object sender, RoutedEventArgs e)
        {
            try
            {
                var cfg = App.Services?.GetService<ConfigurationService>();
                var path = cfg?.LoadConfigurationAsync().GetAwaiter().GetResult()?.ManagedEnvironmentPath;
                if (!string.IsNullOrEmpty(path))
                {
                    Process.Start(new ProcessStartInfo { FileName = path, UseShellExecute = true });
                }
            }
            catch { }
        }

        private void OnMenuCopyManagedPath(object sender, RoutedEventArgs e)
        {
            try
            {
                if (this.Content is FrameworkElement root && root.DataContext is ManagedEnvironmentViewModel)
                {
                    var cfg = App.Services?.GetService<ConfigurationService>();
                    var dir = cfg?.GetConfigDirectory();
                    if (!string.IsNullOrEmpty(dir))
                    {
                        var package = new Windows.ApplicationModel.DataTransfer.DataPackage();
                        package.SetText(dir);
                        Windows.ApplicationModel.DataTransfer.Clipboard.SetContent(package);
                    }
                }
            }
            catch { }
        }

        private void OnOpenModsFolder(object sender, RoutedEventArgs e)
        {
            try
            {
                var mods = (sender as FrameworkElement)?.Tag as string;
                if (!string.IsNullOrWhiteSpace(mods))
                {
                    Process.Start(new ProcessStartInfo { FileName = mods, UseShellExecute = true });
                }
            }
            catch { }
        }

        private void OnClearModsFolder(object sender, RoutedEventArgs e)
        {
            try
            {
                var mods = (sender as FrameworkElement)?.Tag as string;
                if (string.IsNullOrWhiteSpace(mods) || !System.IO.Directory.Exists(mods)) return;

                // Confirm clear
                var dialog = new ContentDialog
                {
                    Title = "Clear Mods",
                    Content = "Are you sure you want to remove all files and subfolders in the Mods folder?",
                    PrimaryButtonText = "Clear",
                    CloseButtonText = "Cancel",
                    XamlRoot = (this.Content as FrameworkElement)?.XamlRoot
                };
                var result = dialog.ShowAsync();
                result.AsTask().Wait();
                if (result.GetResults() != ContentDialogResult.Primary) return;

                foreach (var file in System.IO.Directory.EnumerateFiles(mods, "*", System.IO.SearchOption.TopDirectoryOnly))
                {
                    try { System.IO.File.Delete(file); } catch { }
                }
                foreach (var dir in System.IO.Directory.EnumerateDirectories(mods, "*", System.IO.SearchOption.TopDirectoryOnly))
                {
                    try { System.IO.Directory.Delete(dir, true); } catch { }
                }
                OnRefreshClick(sender, e);
            }
            catch { }
        }

        private async void OnInstallDefaultMods(object sender, RoutedEventArgs e)
        {
            try
            {
                var cfg = App.Services?.GetService<ConfigurationService>();
                var config = cfg != null ? await cfg.LoadConfigurationAsync() : null;
                var managed = config?.ManagedEnvironmentPath ?? string.Empty;
                if (string.IsNullOrWhiteSpace(managed)) return;

                var defaultModsRoot = System.IO.Path.Combine(managed, "Default Mods");
                if (!System.IO.Directory.Exists(defaultModsRoot)) return;

                // Determine branch mods path from the row context if possible
                string modsTarget = string.Empty;
                string pluginsTarget = string.Empty;
                string branchName = string.Empty;
                if (sender is FrameworkElement fe && fe.DataContext is BranchInfo bi)
                {
                    modsTarget = bi.ModsFolderPath;
                    pluginsTarget = System.IO.Path.Combine(bi.FolderPath ?? string.Empty, "Plugins");
                    branchName = bi.BranchName;
                }
                if (string.IsNullOrWhiteSpace(modsTarget) || string.IsNullOrWhiteSpace(branchName)) return;

                // Resolve runtime-specific default mods folders
                var runtimeFolder = BranchInfo.GetRuntimeFolder(branchName);
                var runtimeRoot = System.IO.Path.Combine(defaultModsRoot, runtimeFolder);
                var modsSrc = System.IO.Path.Combine(runtimeRoot, "Mods");
                var pluginsSrc = System.IO.Path.Combine(runtimeRoot, "Plugins");

                // Copy Mods files (top-level only)
                try
                {
                    if (System.IO.Directory.Exists(modsSrc))
                    {
                        System.IO.Directory.CreateDirectory(modsTarget);
                        foreach (var file in System.IO.Directory.EnumerateFiles(modsSrc, "*", System.IO.SearchOption.TopDirectoryOnly))
                        {
                            try
                            {
                                var name = System.IO.Path.GetFileName(file);
                                var dest = System.IO.Path.Combine(modsTarget, name);
                                System.IO.File.Copy(file, dest, true);
                            }
                            catch { }
                        }
                    }
                }
                catch { }

                // Copy Plugins files (top-level only)
                try
                {
                    if (!string.IsNullOrWhiteSpace(pluginsTarget) && System.IO.Directory.Exists(pluginsSrc))
                    {
                        System.IO.Directory.CreateDirectory(pluginsTarget);
                        foreach (var file in System.IO.Directory.EnumerateFiles(pluginsSrc, "*", System.IO.SearchOption.TopDirectoryOnly))
                        {
                            try
                            {
                                var name = System.IO.Path.GetFileName(file);
                                var dest = System.IO.Path.Combine(pluginsTarget, name);
                                System.IO.File.Copy(file, dest, true);
                            }
                            catch { }
                        }
                    }
                }
                catch { }
                OnRefreshClick(sender, e);
            }
            catch { }
        }

        private async void OnBackupModsFolder(object sender, RoutedEventArgs e)
        {
            try
            {
                var mods = (sender as FrameworkElement)?.Tag as string;
                if (string.IsNullOrWhiteSpace(mods) || !System.IO.Directory.Exists(mods)) return;

                var cfg = App.Services?.GetService<ConfigurationService>();
                var config = cfg != null ? await cfg.LoadConfigurationAsync() : null;
                var managed = config?.ManagedEnvironmentPath ?? string.Empty;
                if (string.IsNullOrWhiteSpace(managed)) return;

                var backups = System.IO.Path.Combine(managed, "backups");
                System.IO.Directory.CreateDirectory(backups);

                string branchName = string.Empty;
                if (sender is FrameworkElement fe && fe.DataContext is BranchInfo bi)
                {
                    branchName = bi.BranchName;
                }
                var stamp = System.DateTime.Now.ToString("yyyyMMdd_HHmmss");
                var zipName = string.IsNullOrEmpty(branchName) ? $"mods_{stamp}.zip" : $"mods_{branchName}_{stamp}.zip";
                var zipPath = System.IO.Path.Combine(backups, zipName);

                if (System.IO.File.Exists(zipPath))
                {
                    try { System.IO.File.Delete(zipPath); } catch { }
                }
                ZipFile.CreateFromDirectory(mods, zipPath);
            }
            catch { }
        }

        private async void OnMenuAbout(object sender, RoutedEventArgs e)
        {
            var dialog = new ContentDialog
            {
                Title = "Managed Environment",
                Content = "Schedule I Developer Environment Utility",
                CloseButtonText = "OK",
                XamlRoot = (this.Content as FrameworkElement)?.XamlRoot
            };
            try { await dialog.ShowAsync(); } catch { }
        }

        private async void OnInstallBranch(object sender, RoutedEventArgs e)
        {
            try
            {
                var branch = (sender as FrameworkElement)?.Tag as string;
                var cfgSvc = App.Services?.GetService<ConfigurationService>();
                var cfg = cfgSvc != null ? await cfgSvc.LoadConfigurationAsync() : null;
                var game = cfg?.GameInstallPath ?? string.Empty;
                var managed = cfg?.ManagedEnvironmentPath ?? string.Empty;
                if (!string.IsNullOrWhiteSpace(branch) && !string.IsNullOrWhiteSpace(game) && !string.IsNullOrWhiteSpace(managed))
                {
                    var wizard = new SetupWizardWindow(branch, game, managed, autoClose: true);
                    wizard.Activate();
                }
            }
            catch { }
        }
    }
}
