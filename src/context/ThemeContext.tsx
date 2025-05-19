import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PremiumContext } from './PremiumContext';
import * as storageService from '../services/storageService';
import * as featureAccessUtils from '../utils/featureAccessUtils';
import * as achievementService from '../utils/progress/modules/achievementManager';

// Define theme types
export type ThemeType = 'light' | 'dark' | 'sunset' | 'system';

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

// Sunset theme colors - improved version
const sunsetTheme: ThemeColors = {
  background: '#2A2118',      // Warm dark brown background - feels like end of sunset
  backgroundLight: '#382D22', // Lighter warm brown for contrast
  cardBackground: '#3D3023',  // Rich warm card background
  text: '#FFF6EC',           // Soft warm white text for readability
  textSecondary: '#FFD7B5',   // Warm peach secondary text
  accent: '#FF8E3C',         // Vibrant sunset orange that pops
  accentLight: '#FFA964',     // Lighter version of accent
  border: '#4D3C2A',         // Warm visible borders
  success: '#FFA03C',        // Golden orange success color
  successLight: '#FFBC7A',    // Lighter success variant
  error: '#FF6347'           // Tomato-colored error
};

// Update the ThemeContextType to include a safe toggle method
export type ThemeContextType = {
  theme: ThemeColors;
  themeType: ThemeType;
  setThemeType: (type: ThemeType) => void;
  toggleTheme: () => void; // Add this safe toggle method
  isDark: boolean;
  isSunset: boolean;
  canUseDarkTheme: boolean;
  canUseSunsetTheme: boolean;
  refreshThemeAccess: () => Promise<void>;
  refreshTheme: () => void;
};

// Constants
const REQUIRED_BADGES_FOR_SUNSET = 6; // Number of badges required to unlock sunset theme

// Update the context creation with the new toggle method
const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeType: 'system',
  setThemeType: () => {},
  toggleTheme: () => {}, // Add default implementation
  isDark: false,
  isSunset: false,
  canUseDarkTheme: false,
  canUseSunsetTheme: false,
  refreshThemeAccess: async () => {},
  refreshTheme: () => {},
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
  const [canUseSunsetTheme, setCanUseSunsetTheme] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  
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

  // Get earned badge count - private function
  const getBadgeCount = async (): Promise<number> => {
    try {
      // Get user progress
      const userProgress = await storageService.getUserProgress();
      
      // Get achievements summary
      const achievementsSummary = achievementService.getAchievementsSummary(userProgress);
      
      // Count completed achievements
      const completedCount = achievementsSummary.completed.length;
      setBadgeCount(completedCount);
      return completedCount;
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  };

  // Check if user can access sunset theme based on badge count
  // No premium requirement here
  const checkSunsetThemeAccess = async () => {
    try {
      const count = await getBadgeCount();
      const hasAccess = count >= REQUIRED_BADGES_FOR_SUNSET;
      setCanUseSunsetTheme(hasAccess);
      
      // If user can't use sunset theme but currently has it set, revert to light
      if (!hasAccess && themeType === 'sunset') {
        console.log('User lost sunset theme access, reverting to light theme');
        await saveThemePreference('light');
        setThemeType('light');
      }
      
      return hasAccess;
    } catch (error) {
      console.error('Error checking sunset theme access:', error);
      return false;
    }
  };
  
  // Check if user can access dark theme based on premium status and level
  const checkDarkThemeAccess = async () => {
    try {
      // First check if user is premium - required for dark theme
      const isPremiumUser = await storageService.getIsPremium();
      
      // If not premium, immediately deny access and revert to light theme if needed
      if (!isPremiumUser) {
        console.log('User is not premium, denying dark theme access');
        setCanUseDarkTheme(false);
        
        // If currently using dark theme, revert to light
        if (themeType === 'dark') {
          console.log('Reverting from dark to light theme due to premium status change');
          await saveThemePreference('light');
          setThemeType('light');
        }
        
        // Update the last check timestamp
        const now = Date.now();
        await AsyncStorage.setItem(LAST_THEME_CHECK_KEY, now.toString());
        setLastThemeCheck(now);
        
        return false;
      }
      
      // If premium, check level requirements
      const hasFeatureAccess = await featureAccessUtils.canAccessFeature('dark_theme');
      
      // For more detailed logging, also check the level requirement directly
      const meetsLevel = await featureAccessUtils.meetsLevelRequirement('dark_theme');
      if (meetsLevel) {
        console.log('User meets level requirement for dark theme');
      }
      
      setCanUseDarkTheme(hasFeatureAccess);
      
      // If user can't use dark theme but currently has it set, revert to light
      if (!hasFeatureAccess && themeType === 'dark') {
        console.log('User lost dark theme access, reverting to light theme');
        await saveThemePreference('light');
        setThemeType('light');
      }
      
      // Update the last check timestamp
      const now = Date.now();
      await AsyncStorage.setItem(LAST_THEME_CHECK_KEY, now.toString());
      setLastThemeCheck(now);
      
      return hasFeatureAccess;
    } catch (error) {
      console.error('Error checking dark theme access:', error);
      return false;
    }
  };
  
  // Effect to check access on premium status change
  useEffect(() => {
    console.log(`Premium status changed to: ${isPremium}, checking dark theme access`);
    checkDarkThemeAccess();
  }, [isPremium]);
  
  // Add a periodic check to ensure theme permissions are up to date
  useEffect(() => {
    // Check for new theme permissions every time the app is focused
    const checkForThemeUpdates = async () => {
      const now = Date.now();
      // Only check if it's been at least 1 second since the last check
      if (now - lastThemeCheck > 1000) {
        await checkDarkThemeAccess();
        await checkSunsetThemeAccess();
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
    
    // If trying to set sunset theme but don't have access, show alert and return
    if (type === 'sunset' && !canUseSunsetTheme) {
      console.log('Attempted to set sunset theme but user lacks required badges');
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
  
  // Improved theme cycling: Light → Sunset → Dark → Light
  const toggleTheme = useCallback(() => {
    console.log('THEME TOGGLE - IMPROVED CYCLING');
    
    try {
      // Improved theme rotation logic
      if (themeType === 'light' || themeType === 'system') {
        // From light/system → sunset (if available)
        if (canUseSunsetTheme) {
          setThemeType('sunset');
          saveThemePreference('sunset');
          console.log('Changed theme: LIGHT → SUNSET');
        } 
        // If sunset not available, try dark
        else if (canUseDarkTheme) {
          setThemeType('dark');
          saveThemePreference('dark');
          console.log('Changed theme: LIGHT → DARK (sunset not available)');
        }
      } 
      else if (themeType === 'sunset') {
        // From sunset → dark (if available)
        if (canUseDarkTheme) {
          setThemeType('dark');
          saveThemePreference('dark');
          console.log('Changed theme: SUNSET → DARK');
        } else {
          // If dark not available, go to light
          setThemeType('light');
          saveThemePreference('light');
          console.log('Changed theme: SUNSET → LIGHT (dark not available)');
        }
      } 
      else if (themeType === 'dark') {
        // From dark → light
        setThemeType('light');
        saveThemePreference('light');
        console.log('Changed theme: DARK → LIGHT');
      }
    } catch (error) {
      console.error('Error during improved theme cycling:', error);
    }
  }, [themeType, canUseDarkTheme, canUseSunsetTheme]);
  
  // Improved theme selection logic to prioritize sunset theme
  let actualTheme = lightTheme;
  let isDark = false;
  let isSunset = false;

  // Priority: explicit selection > system preference
  if (themeType === 'dark' && canUseDarkTheme) {
    actualTheme = darkTheme;
    isDark = true;
  } else if (themeType === 'sunset' && canUseSunsetTheme) {
    actualTheme = sunsetTheme;
    isSunset = true;
  } else if (themeType === 'system') {
    // Follow the device colour scheme only. Do NOT switch to the sunset theme automatically –
    // users should opt-in from Settings after it has been unlocked.
    if (systemColorScheme === 'dark' && canUseDarkTheme) {
      actualTheme = darkTheme;
      isDark = true;
    }
    // For light system preference we keep the default lightTheme that was already assigned
  }
  
  // For logging/debugging
  useEffect(() => {
    console.log(`Theme status - Type: ${themeType}, isDark: ${isDark}, isSunset: ${isSunset}, canUseDark: ${canUseDarkTheme}, canUseSunset: ${canUseSunsetTheme}`);
  }, [themeType, isDark, isSunset, canUseDarkTheme, canUseSunsetTheme]);
  
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
    await checkSunsetThemeAccess();
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
      isSunset,
      canUseDarkTheme,
      canUseSunsetTheme,
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