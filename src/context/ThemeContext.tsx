import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PremiumContext } from './PremiumContext';
import * as storageService from '../services/storageService';

// Define theme types
export type ThemeType = 'light' | 'dark' | 'system';

// Define theme colors
export interface ThemeColors {
  background: string;
  backgroundLight: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentLight: string;
  border: string;
  success: string;
  successLight: string;
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
  successLight: '#81C784',
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
  successLight: '#81C784',
  error: '#E57373'
};

// Theme context interface
interface ThemeContextType {
  theme: ThemeColors;
  themeType: ThemeType;
  setThemeType: (type: ThemeType) => void;
  isDark: boolean;
  canUseDarkTheme: boolean;
  refreshThemeAccess: () => Promise<void>;
}

// Create the context
const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeType: 'system',
  setThemeType: () => {},
  isDark: false,
  canUseDarkTheme: false,
  refreshThemeAccess: async () => {}
});

// Storage key for theme preference
const THEME_STORAGE_KEY = '@app_theme_preference';
// Add a new storage key for tracking theme changes
const LAST_THEME_CHECK_KEY = '@last_theme_permission_check';

// Theme provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>('system');
  const [canUseDarkTheme, setCanUseDarkTheme] = useState(false);
  
  // Use a simpler approach - just initialize isPremium to false
  const [isPremium, setIsPremium] = useState(false);
  // Track the last time we checked theme access
  const [lastThemeCheck, setLastThemeCheck] = useState<number>(0);
  
  // Load premium status
  useEffect(() => {
    const loadPremiumStatus = async () => {
      try {
        const status = await storageService.getIsPremium();
        setIsPremium(status);
      } catch (error) {
        console.error('Error loading premium status in ThemeContext:', error);
      }
    };
    
    loadPremiumStatus();
    
    // Load the last time theme access was checked
    const loadLastThemeCheck = async () => {
      try {
        const lastCheck = await AsyncStorage.getItem(LAST_THEME_CHECK_KEY);
        if (lastCheck) {
          setLastThemeCheck(parseInt(lastCheck, 10));
        }
      } catch (error) {
        console.error('Error loading last theme check time:', error);
      }
    };
    
    loadLastThemeCheck();
  }, []);
  
  // Check if user can access dark theme based on premium status and level
  const checkDarkThemeAccess = async () => {
    try {
      // Default to false
      let hasAccess = false;
      
      // If user is premium, check their level
      if (isPremium) {
        const userProgress = await storageService.getUserProgress();
        
        // Level 2+ unlocks dark theme
        if (userProgress.level >= 2) {
          hasAccess = true;
        }
        
        // Also check if the dark_theme reward is unlocked
        if (userProgress.rewards && userProgress.rewards.dark_theme) {
          hasAccess = userProgress.rewards.dark_theme.unlocked;
        }
      }
      
      console.log('Dark theme access check:', hasAccess ? 'GRANTED' : 'DENIED');
      setCanUseDarkTheme(hasAccess);
      
      // If user can't use dark theme but currently has it set, revert to light
      if (!hasAccess && themeType === 'dark') {
        await saveThemePreference('light');
        setThemeType('light');
      }
      
      // Update the last check timestamp
      const now = Date.now();
      await AsyncStorage.setItem(LAST_THEME_CHECK_KEY, now.toString());
      setLastThemeCheck(now);
    } catch (error) {
      console.error('Error checking dark theme access:', error);
    }
  };
  
  // Effect to check access on premium status change
  useEffect(() => {
    checkDarkThemeAccess();
  }, [isPremium]);
  
  // Add a periodic check to ensure theme permissions are up to date
  useEffect(() => {
    // Check for new theme permissions every time the app is focused
    const checkForThemeUpdates = async () => {
      const now = Date.now();
      // Only check if it's been at least 1 second since the last check
      if (now - lastThemeCheck > 1000) {
        console.log('Periodic theme permission check...');
        await checkDarkThemeAccess();
      }
    };
    
    // Initial check
    checkForThemeUpdates();
    
    // Set up interval to check every few seconds
    const intervalId = setInterval(checkForThemeUpdates, 5000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [lastThemeCheck]);
  
  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) {
          setThemeType(savedTheme as ThemeType);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, []);
  
  // Function to save theme preference
  const saveThemePreference = async (type: ThemeType) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, type);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };
  
  // Enhanced setThemeType that also persists the preference
  const handleSetThemeType = (type: ThemeType) => {
    // If trying to set dark theme but don't have access, don't change
    if (type === 'dark' && !canUseDarkTheme) {
      return;
    }
    
    setThemeType(type);
    saveThemePreference(type);
  };
  
  // Determine if we're using dark mode
  const isDark = themeType === 'dark' || (themeType === 'system' && systemColorScheme === 'dark');
  
  // Use dark theme only if user has access and has selected dark mode
  const actualTheme = (isDark && canUseDarkTheme) ? darkTheme : lightTheme;
  
  // For logging/debugging
  useEffect(() => {
    console.log(`Theme status - Type: ${themeType}, isDark: ${isDark}, canUseDark: ${canUseDarkTheme}`);
  }, [themeType, isDark, canUseDarkTheme]);
  
  // Public method to refresh theme access
  const refreshThemeAccess = async () => {
    console.log('Refreshing theme access...');
    // Reload premium status
    try {
      const status = await storageService.getIsPremium();
      setIsPremium(status);
    } catch (error) {
      console.error('Error refreshing premium status:', error);
    }
    
    // Check access directly
    await checkDarkThemeAccess();
  };
  
  return (
    <ThemeContext.Provider value={{ 
      theme: actualTheme, 
      themeType, 
      setThemeType: handleSetThemeType, 
      isDark: isDark && canUseDarkTheme,
      canUseDarkTheme,
      refreshThemeAccess
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext; 