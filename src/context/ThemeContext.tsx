import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

// Define theme types
export type ThemeType = 'light' | 'dark' | 'system';

// Define theme colors
interface ThemeColors {
  background: string;
  backgroundLight: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentLight: string;
  border: string;
  success: string;
  error: string;
}

// Light theme colors
const lightTheme: ThemeColors = {
  background: '#F5F5F5',
  backgroundLight: '#E0E0E0',
  cardBackground: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  accent: '#4CAF50',
  accentLight: '#81C784',
  border: '#DDDDDD',
  success: '#4CAF50',
  error: '#F44336'
};

// Dark theme colors
const darkTheme: ThemeColors = {
  background: '#121212',
  backgroundLight: '#1E1E1E',
  cardBackground: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  accent: '#81C784',
  accentLight: '#4CAF50',
  border: '#333333',
  success: '#66BB6A',
  error: '#E57373'
};

// Theme context interface
interface ThemeContextType {
  theme: ThemeColors;
  themeType: ThemeType;
  setThemeType: (type: ThemeType) => void;
  isDark: boolean;
}

// Create the context
const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeType: 'system',
  setThemeType: () => {},
  isDark: false
});

// Theme provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>('system');
  
  // Determine if we're using dark mode
  const isDark = themeType === 'dark' || (themeType === 'system' && systemColorScheme === 'dark');
  
  // Get the current theme colors
  const theme = isDark ? darkTheme : lightTheme;
  
  return (
    <ThemeContext.Provider value={{ theme, themeType, setThemeType, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext; 