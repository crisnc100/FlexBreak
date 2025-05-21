import React, { useEffect, useState, useRef, useCallback } from 'react';
import { TouchableOpacity, Modal, View, Text, SafeAreaView, StatusBar, AppState, Platform, Animated, Dimensions, Pressable } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import store from './src/state/store';
import HomeScreen from './src/screens/HomeScreen';
import RoutineScreen from './src/screens/RoutineScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import PlaylistsScreen from './src/screens/PlaylistsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BobSimulatorScreen from './src/screens/BobSimulatorScreen';
import { PremiumProvider, usePremium } from './src/context/PremiumContext';
import { RefreshProvider } from './src/context/RefreshContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AchievementProvider, useAchievements } from './src/context/AchievementContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as flexSaveManager from './src/utils/progress/modules/flexSaveManager';
import * as streakManager from './src/utils/progress/modules/streakManager';
import FlexSavePrompt from './src/components/notifications/FlexSavePrompt';
import * as rewardManager from './src/utils/progress/modules/rewardManager';
import { useFeatureAccess } from './src/hooks/progress/useFeatureAccess';
import { useGamification, gamificationEvents, LEVEL_UP_EVENT, REWARD_UNLOCKED_EVENT } from './src/hooks/progress/useGamification';
import * as soundEffects from './src/utils/soundEffects';
import IntroManager from './src/components/intro/IntroManager';
import * as streakValidator from './src/utils/progress/modules/streakValidator';
import * as Haptics from 'expo-haptics';
import * as performance from './src/utils/performance/performance';
import * as storageService from './src/services/storageService';
import * as notifications from './src/utils/notifications';
import * as firebaseReminders from './src/utils/firebaseReminders';
// Import the console log disabler
import { disableConsoleLogsInProduction } from './src/utils/disableConsoleLogsInProduction';

// Initialize Firebase with Firebase JS SDK
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';
import 'firebase/compat/messaging';
import 'firebase/compat/app-check';
import firebaseConfig from './firebase.config';

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  
  // Set up app check with a more compatible approach
  try {
    // For development, use debug mode
    if (__DEV__) {
      // @ts-ignore - Debug tokens are not in the type definitions
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    
    // Initialize app check with a simpler configuration
    firebase.appCheck().activate({
      provider: 'debug', // This works in both debug and production with proper setup
      isTokenAutoRefreshEnabled: true
    });
  } catch (error) {
    console.error('Error initializing App Check:', error);
  }
}

// Avoid playing intro sound twice
let introSoundPlayed = false;

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Define navigation types properly
type RootStackParamList = {
  MainTabs: undefined;
  BobSimulator: {
    fromTesting?: boolean;
    testingAccessGranted?: boolean;
    returnToTesting?: boolean;
  } | undefined;
};

// Create a navigation ref that can be used outside of React components
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Function to navigate from anywhere
export function navigateFromAnywhere(name: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    console.error('[Global Navigation] Navigation not initialized yet');
  }
}

// Function to force navigation by resetting the stack
export function forceNavigate(name: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name, params }],
      })
    );
  } else {
    console.error('[Global Navigation] Navigation not initialized yet');
  }
}

// Helper function to navigate from outside a navigation component (for compatibility)
function navigate(name: keyof RootStackParamList, params?: any) {
  navigateFromAnywhere(name, params);
}

// Main entry point for the app
export default function App() {
  // Disable console logs in production
  disableConsoleLogsInProduction();
  
  // Mark app start time for performance measurement
  performance.markAppStart();
  
  // Subscribe to AppState changes for performance tracking
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground
        performance.trackAppForeground();
      } else if (nextAppState === 'background') {
        // App went to background
        performance.trackAppBackground();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PremiumProvider>
            <RefreshProvider>
              <AchievementProvider>
                <StatusBar 
                  barStyle="dark-content" 
                  backgroundColor="transparent" 
                  translucent={true} 
                />
                <MainApp />
              </AchievementProvider>
            </RefreshProvider>
          </PremiumProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}

// Create the main tab navigator component
const TabNavigator = () => {
  const { theme, isDark, isSunset } = useTheme();
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const { isPremium } = usePremium();
  const { canAccessFeature } = useFeatureAccess();
  const [hasPlaylistAccess, setHasPlaylistAccess] = useState(false);
  
  // Mark component render for performance tracking
  useEffect(() => {
    performance.markComponentRender('TabNavigator');
  }, []);
  
  // Check for reopen_settings flag
  useEffect(() => {
    const checkReopenSettings = async () => {
      try {
        const shouldReopenSettings = await AsyncStorage.getItem('@flexbreak:reopen_settings');
        if (shouldReopenSettings === 'true') {
          // Clear the flag to prevent it from re-opening again next time
          await AsyncStorage.removeItem('@flexbreak:reopen_settings');
          // Open settings modal
          setSettingsModalVisible(true);
        }
      } catch (error) {
        console.error('Error checking reopen_settings flag:', error);
      }
    };
    
    checkReopenSettings();
  }, []);
  
  // Check if user has access to playlists feature - using useCallback to memoize
  const checkPlaylistAccess = useCallback(async () => {
    const hasAccess = await rewardManager.isRewardUnlocked('focus_area_mastery');
    setHasPlaylistAccess(isPremium && hasAccess);
  }, [isPremium]);
  
  // Initial check for playlist access
  useEffect(() => {
    checkPlaylistAccess();
  }, [checkPlaylistAccess]);
  
  // Listen for level up and reward unlocked events to refresh playlist access
  useEffect(() => {
    const handleLevelUp = () => {
      checkPlaylistAccess();
    };
    
    const handleRewardUnlocked = () => {
      checkPlaylistAccess();
    };
    
    // Add event listeners from the gamification system
    gamificationEvents.on(LEVEL_UP_EVENT, handleLevelUp);
    gamificationEvents.on(REWARD_UNLOCKED_EVENT, handleRewardUnlocked);
    
    // Clean up event listeners
    return () => {
      gamificationEvents.off(LEVEL_UP_EVENT, handleLevelUp);
      gamificationEvents.off(REWARD_UNLOCKED_EVENT, handleRewardUnlocked);
    };
  }, [checkPlaylistAccess]);
  
  const tabBarStyle = {
    backgroundColor: theme.cardBackground,
    borderTopColor: theme.border,
    borderTopWidth: 1,
    elevation: 0,
  };

  return (
    <>
      <Tab.Navigator
        // @ts-ignore - id property is available but TypeScript doesn't recognize it
        id="tab-navigator"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName = 'home';

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Routine') {
              iconName = focused ? 'fitness' : 'fitness-outline';
            } else if (route.name === 'Progress') {
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
            } else if (route.name === 'Favorites') {
              iconName = focused ? 'heart' : 'heart-outline';
            } else if (route.name === 'Playlists') {
              iconName = focused ? 'list' : 'list-outline';
            }

            // @ts-ignore - Handle undefined iconName in extreme case
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: tabBarStyle,
          headerStyle: {
            backgroundColor: theme.cardBackground,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontWeight: '500',
          },
          tabBarButton: (props) => (
            <Pressable
              {...props}
              onPress={(e) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                props.onPress(e);
              }}
            />
          ),
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{
            headerRight: () => (
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSettingsModalVisible(true);
                }}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="settings-outline" size={24} color={theme.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <Tab.Screen name="Routine" component={RoutineScreen} />
        <Tab.Screen name="Progress" component={ProgressScreen} />
        <Tab.Screen name="Favorites" component={FavoritesScreen} />
        {hasPlaylistAccess && (
          <Tab.Screen name="Playlists" component={PlaylistsScreen} />
        )}
      </Tab.Navigator>
      
      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <SettingsScreen 
            navigation={{ 
              goBack: () => setSettingsModalVisible(false),
              navigate: navigateFromAnywhere 
            }}
            onClose={() => setSettingsModalVisible(false)}
          />
        </View>
      </Modal>
    </>
  );
}

// Main app with stack navigator for screens outside the tab flow
function MainApp() {
  const { theme, isDark } = useTheme();
  const [showIntro, setShowIntro] = useState(true);
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const { recentAchievement, clearRecentAchievement } = useAchievements();
  
  // Mark component render for performance tracking
  useEffect(() => {
    performance.markComponentRender('MainApp');
  }, []);
  
  // Initialize streak system and notifications when app launches
  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize local notifications system
        notifications.configureNotifications();
        
        // Get notification permissions (both systems need this)
        const permissionsGranted = await notifications.requestNotificationsPermissions();
        
        if (permissionsGranted) {
          // Initialize Firebase reminders for premium users
          try {
            const firebaseInitialized = await firebaseReminders.initializeFirebaseReminders();
            if (firebaseInitialized) {
              // Get a real FCM token
              const token = await firebaseReminders.getFCMToken();
              
              // Get the current reminder settings
              const settings = await firebaseReminders.getReminderSettings();
              
              // If enabled, ensure Firebase has the settings
              if (settings.enabled) {
                await firebaseReminders.saveReminderSettings(settings);
              }
              
              // Start local motivational messages as a fallback for Firebase Cloud Functions
              // Use the production mode (2 messages per day) instead of test mode
              const cleanupMotivationalMessages = firebaseReminders.startLocalMotivationalMessages(false);
              
              // Return cleanup function
              return () => {
                cleanupMotivationalMessages();
              };
            }
          } catch (error) {
            console.error('Error initializing Firebase reminders:', error);
          }
        }
        
        // Initialize streak system
        await initStreakSystem();
      } catch (error) {
        console.error('Error during app initialization:', error);
      }
    };
    
    // We need to create a separate function for streak system
    // to keep the original code structure intact
    const initStreakSystem = async () => {
      try {
        // First run a validation to ensure streak values are consistent
        // This will force a refresh of the streak cache and emit an update event
        await streakValidator.runStartupStreakValidation();
        
        // Check if streak is broken and should be reset to 0 in the UI
        const isStreakBroken = await streakManager.isStreakBroken();
        
        // Check for streak flexSaves to refill monthly
        await flexSaveManager.refillMonthlyFlexSaves();
        
        // Force streak manager to emit an update event to refresh all UI components
        streakManager.streakEvents.emit('streak_updated');
        
        // Check if a streak is broken and show notification if needed
        const streakStatus = await streakManager.checkStreakStatus();
      } catch (error) {
        console.error('Error initializing streak system:', error);
      }
    };
    
    // Start app initialization
    initApp();
  }, []);
  
  // Initialize sound effects system (but don't play intro here - we'll play it in the intro screens)
  useEffect(() => {
    const initSounds = async () => {
      try {
        // Initialize sound system with user preferences
        await soundEffects.initSoundSystem();
        
        // Preload all sound effects for faster playback
        await soundEffects.preloadAllSounds();
        
        // Don't play intro sound here - it will be played by the intro screens
      } catch (error) {
        console.error('Error initializing sound effects system:', error);
      }
    };
    
    initSounds();
    
    // Cleanup sounds when app is unmounted
    return () => {
      soundEffects.unloadAllSounds();
    };
  }, []);
  
  // Effect to animate fade-in when transitioning from intro screens
  useEffect(() => {
    if (!showIntro) {
      // Start the fade-in animation when intro is complete
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [showIntro]);
  
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.cardBackground,
      text: theme.text,
      primary: theme.accent,
    },
  };
  
  // Handle intro complete
  const handleIntroComplete = () => {
    setShowIntro(false);
  };
  
  // If showing intro, render the IntroManager
  if (showIntro) {
    return <IntroManager onComplete={handleIntroComplete} />;
  }
  
  // Otherwise, render the main app with fade-in effect
  return (
    <Animated.View style={{ flex: 1, opacity: fadeInAnim }}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.background} 
      />
      <NavigationContainer theme={navigationTheme} ref={navigationRef}>
        {/* @ts-ignore - Fixing type error with id property */}
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="BobSimulator" component={BobSimulatorScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      
      {/* Flex Save Prompt */}
      <FlexSavePrompt />
      
    
    </Animated.View>
  );
} 