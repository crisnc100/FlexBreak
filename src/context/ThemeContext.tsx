import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

// Update the ThemeContextType to include a safe toggle method
export type ThemeContextType = {
  theme: ThemeColors;
  themeType: ThemeType;
  setThemeType: (type: ThemeType) => void;
  toggleTheme: () => void; // Add this safe toggle method
  isDark: boolean;
  canUseDarkTheme: boolean;
  refreshThemeAccess: () => Promise<void>;
  refreshTheme: () => void;
};

// Update the context creation with the new toggle method
const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeType: 'system',
  setThemeType: () => {},
  toggleTheme: () => {}, // Add default implementation
  isDark: false,
  canUseDarkTheme: false,
  refreshThemeAccess: async () => {},
  refreshTheme: () => {}
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
      // Get user progress to check level and rewards
      const userProgress = await storageService.getUserProgress();
      console.log(`Saved user progress: Level ${userProgress.level}, XP: ${userProgress.totalXP}`);
      
      // Default to false
      let hasAccess = false;
      
      // Check if user is at least level 2
      if (userProgress.level >= 2) {
        hasAccess = true;
        console.log('User meets level requirement (level 2+) for dark theme');
      }
      
      // Also check if the dark_theme reward is explicitly unlocked
      if (userProgress.rewards && userProgress.rewards.dark_theme) {
        hasAccess = hasAccess || userProgress.rewards.dark_theme.unlocked;
        console.log(`Dark theme reward unlocked? ${userProgress.rewards.dark_theme.unlocked}`);
      }
      
      console.log('Dark theme access check:', hasAccess ? 'GRANTED' : 'DENIED');
      setCanUseDarkTheme(hasAccess);
      
      // If user can't use dark theme but currently has it set, revert to light
      if (!hasAccess && themeType === 'dark') {
        console.log('User lost dark theme access, reverting to light theme');
        await saveThemePreference('light');
        setThemeType('light');
      }
      
      // Update the last check timestamp
      const now = Date.now();
      await AsyncStorage.setItem(LAST_THEME_CHECK_KEY, now.toString());
      setLastThemeCheck(now);
      
      return hasAccess;
    } catch (error) {
      console.error('Error checking dark theme access:', error);
      return false;
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
    // If trying to set dark theme but don't have access, show alert and return
    if (type === 'dark' && !canUseDarkTheme) {
      console.log('Attempted to set dark theme but user lacks permission');
      
      
      return;
    }
    
    // Log theme change - do this BEFORE changing state to avoid stale state issues
    const previousType = themeType;
    console.log(`Theme changing from ${previousType} to ${type}`);
    
    // Check if this is a toggle to/from dark mode
    if ((previousType === 'dark' && type !== 'dark') || 
        (previousType !== 'dark' && type === 'dark')) {
      console.log('Dark theme toggled');
    }
    
    // Save preference first before updating state
    try {
      saveThemePreference(type);
      // Now update the state
      setThemeType(type);
      
      // No success alerts - we don't want to interrupt the user flow
    } catch (error) {
      console.error('Error updating theme:', error);
      // Only show alert on error
      setTimeout(() => {
        try {
          const alert = global.Alert || require('react-native').Alert;
          if (alert && alert.alert) {
            alert.alert(
              'Theme Error',
              'There was a problem changing the theme. Please try again.',
              [{ text: 'OK' }]
            );
          }
        } catch (e) {
          console.log('Could not show theme error alert:', e);
        }
      }, 0);
    }
  };
  
  // Add safe toggle method that doesn't rely on reading state directly in handlers
  const toggleTheme = useCallback(() => {
    console.log('THEME TOGGLE - DIRECT SWITCH');
    
    try {
      // Skip all complex handling and directly switch
      if (themeType === 'dark') {
        // Directly set light theme without any alerts
        setThemeType('light');
        saveThemePreference('light');
        console.log('Changed theme: DARK → LIGHT');
      } else {
        // Check permission first
        if (!canUseDarkTheme) {
          console.log('Cannot set dark theme - permission denied');
          return;
        }
        
        // Directly set dark theme without any alerts
        setThemeType('dark');
        saveThemePreference('dark');
        console.log('Changed theme: LIGHT → DARK');
      }
    } catch (error) {
      console.error('Error during direct theme toggle:', error);
    }
  }, [themeType, canUseDarkTheme]);
  
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
  
  // Force theme refresh - this triggers re-renders throughout the app
  const refreshTheme = () => {
    console.log('Forcing theme refresh...');
    // We set the theme to its current value to trigger component updates
    const currentTheme = themeType;
    setThemeType(currentTheme);
    // Also refresh theme access
    refreshThemeAccess();
  };
  
  return (
    <ThemeContext.Provider value={{ 
      theme: actualTheme, 
      themeType, 
      setThemeType: handleSetThemeType,
      toggleTheme, // Add the toggle function to the context value 
      isDark, 
      canUseDarkTheme,
      refreshThemeAccess,
      refreshTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext; 