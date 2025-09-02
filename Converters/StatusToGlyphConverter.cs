using Microsoft.UI.Xaml.Data;
using System;

namespace Schedule_I_Developer_Environment_Utility.Converters
{
    public class StatusToGlyphConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, string language)
        {
            var status = value?.ToString() ?? string.Empty;
            return status switch
            {
                "UpToDate" => "\uE73E", // CheckMark
                "UpdateAvailable" => "\uE814", // Warning
                "NotInstalled" => "\uEA39", // Error badge
                "Error" => "\uEA39",
                _ => "\uE946" // Info
            };
        }

        public object ConvertBack(object value, Type targetType, object parameter, string language)
            => throw new NotImplementedException();
    }
}

