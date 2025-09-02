using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Media;
using System;

namespace Schedule_I_Developer_Environment_Utility.Converters
{
    public class BooleanToBrushConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, string language)
        {
            try
            {
                var b = value as bool? ?? false;
                return new SolidColorBrush(b ? Microsoft.UI.Colors.LimeGreen : Microsoft.UI.Colors.OrangeRed);
            }
            catch
            {
                return new SolidColorBrush(Microsoft.UI.Colors.Gray);
            }
        }

        public object ConvertBack(object value, Type targetType, object parameter, string language)
            => throw new NotImplementedException();
    }
}
