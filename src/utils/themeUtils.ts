import { StyleSheet } from 'react-native';
import { ThemeColors } from '../context/ThemeContext';

// Theme style helper to create themed styles with both static and dynamic theme properties
export const createThemedStyles = <T extends StyleSheet.NamedStyles<T>>(
  stylesFactory: (theme: ThemeColors) => T
) => {
  return (theme: ThemeColors): T => {
    return stylesFactory(theme);
  };
};

// Helper for conditional styling based on theme
export const applyThemeCondition = (condition: boolean, trueStyle: any, falseStyle: any) => {
  return condition ? trueStyle : falseStyle;
};

// Helper to get color with opacity
export const withOpacity = (color: string, opacity: number) => {
  // Check if color is in hex format
  if (color.startsWith('#')) {
    // For hex colors
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `${color}${alpha}`;
  }
  // For rgb/rgba colors
  if (color.startsWith('rgb')) {
    if (color.startsWith('rgba')) {
      // Replace the existing alpha value
      return color.replace(/rgba\((.+?),\s*[\d.]+\)/, `rgba($1, ${opacity})`);
    }
    // Convert rgb to rgba
    return color.replace(/rgb\((.+?)\)/, `rgba($1, ${opacity})`);
  }
  
  // Default fallback - return original color
  return color;
}; 