using Microsoft.UI;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Windows.Graphics;
using WinRT.Interop;

namespace Schedule_I_Developer_Environment_Utility.Services
{
    public static class ThemeService
    {
        public static void ApplyDark(Window window)
        {
            try
            {
                if (window.Content is FrameworkElement root)
                {
                    root.RequestedTheme = ElementTheme.Dark;
                }
            }
            catch { }

            ApplyTitleBar(window, true);
        }

        public static void ApplyTitleBar(Window window, bool isDark)
        {
            try
            {
                var appWindow = window.AppWindow;
                if (appWindow == null) return;

                var titleBar = appWindow.TitleBar;
                if (titleBar == null) return;

                titleBar.ExtendsContentIntoTitleBar = true;

                var fg = isDark ? Windows.UI.Color.FromArgb(255, 255, 255, 255)
                                : Windows.UI.Color.FromArgb(255, 0, 0, 0);
                var fgInactive = isDark ? Windows.UI.Color.FromArgb(255, 180, 180, 180)
                                        : Windows.UI.Color.FromArgb(255, 90, 90, 90);
                var hoverBg = isDark ? Windows.UI.Color.FromArgb(30, 255, 255, 255)
                                      : Windows.UI.Color.FromArgb(30, 0, 0, 0);
                var pressedBg = isDark ? Windows.UI.Color.FromArgb(60, 255, 255, 255)
                                        : Windows.UI.Color.FromArgb(60, 0, 0, 0);

                // Transparent backgrounds to allow backdrop to show through
                titleBar.BackgroundColor = Colors.Transparent;
                titleBar.InactiveBackgroundColor = Colors.Transparent;
                titleBar.ButtonBackgroundColor = Colors.Transparent;
                titleBar.ButtonInactiveBackgroundColor = Colors.Transparent;

                titleBar.ForegroundColor = fg;
                titleBar.InactiveForegroundColor = fgInactive;
                titleBar.ButtonForegroundColor = fg;
                titleBar.ButtonHoverForegroundColor = fg;
                titleBar.ButtonPressedForegroundColor = fg;

                titleBar.ButtonHoverBackgroundColor = hoverBg;
                titleBar.ButtonPressedBackgroundColor = pressedBg;
            }
            catch
            {
                // Ignore styling issues on unsupported platforms
            }
        }

        public static void SetSize(Window window, int width, int height)
        {
            try
            {
                var hwnd = WindowNative.GetWindowHandle(window);
                var windowId = Win32Interop.GetWindowIdFromWindow(hwnd);
                var appWindow = AppWindow.GetFromWindowId(windowId);
                appWindow?.Resize(new SizeInt32(width, height));
            }
            catch
            {
                // Best effort; ignore on unsupported OS/builds
            }
        }
    }
}
