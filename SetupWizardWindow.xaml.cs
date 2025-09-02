using Microsoft.UI.Xaml;
using ThemeSvc = Schedule_I_Developer_Environment_Utility.Services.ThemeService;
using Microsoft.UI.Xaml.Controls;
using Schedule_I_Developer_Environment_Utility.ViewModels;
using Windows.Storage.Pickers;
using WinRT.Interop;

namespace Schedule_I_Developer_Environment_Utility
{
    public sealed partial class SetupWizardWindow : Window
    {
        private SetupWizardViewModel _vm;
        private ManagedEnvironmentWindow? _parentManagedWindow;

        public SetupWizardWindow()
        {
            InitializeComponent();
            ThemeSvc.ApplyDark(this);
            ThemeSvc.SetSize(this, 1120, 800);
            if (this.Content is FrameworkElement root)
            {
                _vm = new SetupWizardViewModel();
                root.DataContext = _vm;
                // Keep UI in sync with VM state changes (StepIndex/CopyCompleted)
                _vm.PropertyChanged += (s, e) =>
                {
                    if (e.PropertyName == nameof(_vm.StepIndex) || e.PropertyName == nameof(_vm.CopyCompleted))
                    {
                        try { DispatcherQueue.TryEnqueue(UpdateStepUI); } catch { UpdateStepUI(); }
                    }
                };
                // Toggle DetectedBranch panel visibility based on VM state
                if (root.FindName("DetectedBranchPanel") is FrameworkElement detectedPanel)
                {
                    void apply()
                    {
                        detectedPanel.Visibility = _vm.HasDetectedBranch ? Visibility.Visible : Visibility.Collapsed;
                    }
                    apply();
                    _vm.PropertyChanged += (s, e) =>
                    {
                        if (e.PropertyName == nameof(_vm.HasDetectedBranch))
                        {
                            try { DispatcherQueue.TryEnqueue(apply); } catch { apply(); }
                        }
                    };
                }

                // Auto-scroll copy logs
                if (root.FindName("CopyLogList") is Microsoft.UI.Xaml.Controls.ListView copyList)
                {
                    if (_vm.CopyLogs is System.Collections.Specialized.INotifyCollectionChanged cc)
                    {
                        cc.CollectionChanged += (s, e) =>
                        {
                            try
                            {
                                if (copyList.Items.Count > 0)
                                {
                                    copyList.ScrollIntoView(copyList.Items[copyList.Items.Count - 1]);
                                }
                            }
                            catch { }
                        };
                    }
                }
            }
            else
            {
                _vm = new SetupWizardViewModel();
            }
            UpdateStepUI();
        }

        public SetupWizardWindow(string branchToInstall, string gamePath, string managedPath, bool autoClose = true, ManagedEnvironmentWindow? parentWindow = null) : this()
        {
            _parentManagedWindow = parentWindow;
            try { _vm.StartHeadlessInstallAsync(branchToInstall, gamePath, managedPath, autoClose); } catch { }
            // Auto-close when copy completes in auto mode
            _vm.PropertyChanged += (s, e) =>
            {
                if (e.PropertyName == nameof(_vm.CopyCompleted) && _vm.CopyCompleted && _vm.AutoCloseOnFinish)
                {
                    try
                    {
                        DispatcherQueue.TryEnqueue(() =>
                        {
                            try { _parentManagedWindow?.RefreshView(); } catch { }
                            this.Close();
                        });
                    }
                    catch
                    {
                        try { _parentManagedWindow?.RefreshView(); } catch { }
                        this.Close();
                    }
                }
            };
        }

        private void UpdateStepUI()
        {
            StepTitle.Text = _vm.StepTitle;
            Step1Panel.Visibility = _vm.StepIndex == 0 ? Visibility.Visible : Visibility.Collapsed;
            Step2Panel.Visibility = _vm.StepIndex == 1 ? Visibility.Visible : Visibility.Collapsed;
            Step3Panel.Visibility = _vm.StepIndex == 2 ? Visibility.Visible : Visibility.Collapsed;
            Step4Panel.Visibility = _vm.StepIndex == 3 ? Visibility.Visible : Visibility.Collapsed;
            Step5Panel.Visibility = _vm.StepIndex == 4 ? Visibility.Visible : Visibility.Collapsed;
            Step6Panel.Visibility = _vm.StepIndex == 5 ? Visibility.Visible : Visibility.Collapsed;

            BackButton.IsEnabled = _vm.StepIndex > 0;
            NextButton.Visibility = _vm.StepIndex < 5 ? Visibility.Visible : Visibility.Collapsed;
            // Disable Next while copying (Step 4) and re-enable when copy completes
            if (_vm.StepIndex == 4)
            {
                NextButton.IsEnabled = _vm.CopyCompleted;
            }
            else
            {
                NextButton.IsEnabled = true;
            }
            FinishButton.Visibility = _vm.StepIndex == 5 ? Visibility.Visible : Visibility.Collapsed;
        }

        private void OnDetectSteam(object sender, RoutedEventArgs e)
        {
            _vm.DetectSteam();
        }

        // Library selection now bound to ViewModel.SelectedLibrary

        private void OnBack(object sender, RoutedEventArgs e)
        {
            _vm.Back();
            UpdateStepUI();
        }

        private void OnNext(object sender, RoutedEventArgs e)
        {
            if (_vm.Next())
            {
                UpdateStepUI();
            }
        }

        private async void OnFinish(object sender, RoutedEventArgs e)
        {
            var ok = await _vm.SaveAsync();
            if (ok)
            {
                try
                {
                    var managed = new ManagedEnvironmentWindow();
                    managed.Activate();
                }
                catch { }
                this.Close();
            }
        }

        private void OnRecheckBranch(object sender, RoutedEventArgs e)
        {
            _vm.RecheckInstalledBranch();
            // If Recheck advanced the wizard (StepIndex may change to 4), reflect it immediately
            UpdateStepUI();
        }

        private void OnGameFolderSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (sender is ListView lv && lv.SelectedItem is SetupWizardViewModel.FolderItem item)
            {
                _vm.GameInstallPath = item.Path;
            }
        }

        private void OnManagedSuggestionSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (sender is ListView lv && lv.SelectedItem is string path)
            {
                _vm.ManagedEnvironmentPath = path;
            }
        }

        private async void OnBrowseManagedPath(object sender, RoutedEventArgs e)
        {
            var picker = new FolderPicker();
            picker.FileTypeFilter.Add("*");
            InitializeWithWindow.Initialize(picker, WindowNative.GetWindowHandle(this));
            var folder = await picker.PickSingleFolderAsync();
            if (folder != null)
            {
                _vm.ManagedEnvironmentPath = folder.Path;
            }
        }
    }
}
