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
// Import video loader service
import { videoLoaderService } from './src/services/videoLoaderService';
import { UpdateNotificationModal, useUpdateNotification } from './src/components/UpdateNotificationModal';
import { GlobalAchievementListener } from './src/components/notifications/GlobalAchievementListener';
import { AIWellnessModal } from './src/components/ai/AIWellnessNotificationHandler';
import { FlexChatModal } from './src/components/wellness/FlexChatModal';
import { setShowAIWellnessModal } from './src/services/notifications/aiNotificationHandler';
import { ToastProvider } from 'react-native-toast-notifications';
import { clearDataCleanupNotifications } from './src/utils/clearDataCleanupNotifications';
import { useAIWellnessOnboarding } from './src/hooks/useAIWellnessOnboarding';
import { AIWellnessOnboarding } from './src/components/ai/AIWellnessOnboarding';
import { useAIWellnessPremiumUpgrade } from './src/hooks/useAIWellnessPremiumUpgrade';
import { AIWellnessPremiumUpgrade } from './src/components/ai/AIWellnessPremiumUpgrade';
// Removed non-MVP imports
// import dataCleanupManager from './src/services/ai/dataCleanupManager';
// import { checkAndRestoreAISchedule } from './src/services/ai/aiSchedulingPersistence';

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
  
  // App Check is completely disabled for now
  // To re-enable, uncomment the code below and configure properly
}

// Initialize Firebase Messaging for AI notifications (background handling)
import firebaseMessagingService from './src/services/firebaseMessagingService';
firebaseMessagingService.initialize().catch(err => {
  console.log('Firebase Messaging init error (non-critical):', err.message);
});

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

// Note: Notification handler is configured in src/utils/notifications.ts

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

// Global initialization flags to prevent multiple initializations
let isMotivationalMessagesInitialized = false;

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

  // Initialize video loader service
  useEffect(() => {
    const initializeVideoLoader = async () => {
      try {
        await videoLoaderService.initialize();
        console.log('✅ Video loader service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize video loader service:', error);
      }
    };

    initializeVideoLoader();
  }, []);
  
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PremiumProvider>
            <RefreshProvider>
              <AchievementProvider>
                <ToastProvider
                  placement="top"
                  duration={3000}
                  animationType="slide-in"
                  successColor="#4CAF50"
                  dangerColor="#F44336"
                  warningColor="#FF9800"
                >
                  <StatusBar 
                    barStyle="dark-content" 
                    backgroundColor="transparent" 
                    translucent={true} 
                  />
                  <MainApp />
                </ToastProvider>
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
  const [showAIModal, setShowAIModal] = useState(false);
  const [showFlexChat, setShowFlexChat] = useState(false);
  
  // Initialize update notification hook
  const { showModal, updateInfo, checkForUpdates, hideModal } = useUpdateNotification();
  
  // Initialize AI Wellness onboarding hooks
  const { 
    shouldShowOnboarding, 
    markOnboardingSeen, 
    dismissOnboarding,
    forceShowOnboarding 
  } = useAIWellnessOnboarding();
  
  const { 
    shouldShowUpgrade, 
    markUpgradeSeen,
    forceShowUpgrade 
  } = useAIWellnessPremiumUpgrade();
  
  // Set up AI Wellness event listeners
  useEffect(() => {
    // AI Wellness enabled event listener
    const handleAIWellnessEnabled = () => {
      console.log('AI Wellness enabled event received - showing onboarding');
      forceShowOnboarding();
    };
    
    // AI Wellness premium upgrade event listener
    const handleShowPremiumUpgrade = () => {
      console.log('Show AI Wellness premium upgrade event received');
      forceShowUpgrade();
    };
    
    gamificationEvents.on('AI_WELLNESS_ENABLED', handleAIWellnessEnabled);
    gamificationEvents.on('SHOW_AI_WELLNESS_PREMIUM_UPGRADE', handleShowPremiumUpgrade);

    return () => {
      gamificationEvents.off('AI_WELLNESS_ENABLED', handleAIWellnessEnabled);
      gamificationEvents.off('SHOW_AI_WELLNESS_PREMIUM_UPGRADE', handleShowPremiumUpgrade);
    };
  }, [forceShowOnboarding, forceShowUpgrade]);
  
  // Set up AI Wellness modal handler with proper cleanup
  useEffect(() => {
    const showModal = () => {
      console.log('AI Wellness triggered - showing FlexChat');
      // Prevent showing modal if already visible
      setShowFlexChat(current => {
        if (current) {
          console.log('FlexChat already visible, skipping');
          return current;
        }
        // Add a small delay to prevent UI conflicts when tapping notification
        setTimeout(() => {
          setShowFlexChat(true);
          // Don't show the old modal anymore
          setShowAIModal(false);
        }, 100);
        return current;
      });
    };
    setShowAIWellnessModal(showModal);
    
    // Check if we need to show bubble on app focus (fallback)
    const checkModalFlag = async () => {
      const shouldShow = await AsyncStorage.getItem('@ai_wellness_show_modal');
      const hasStoredResponse = await AsyncStorage.getItem('@ai_wellness_last_response');
      
      if (shouldShow === 'true' || hasStoredResponse) {
        console.log('Found pending AI Wellness flag or stored response - showing FlexChat');
        setShowFlexChat(true);
        await AsyncStorage.removeItem('@ai_wellness_show_modal');
      }
    };
    
    // Check on mount and when app becomes active
    checkModalFlag();
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkModalFlag();
        // Data cleanup removed for MVP
        // Don't check AI schedule here - it's already done in initApp
      }
    });
    
    return () => {
      setShowAIWellnessModal(null);
      subscription?.remove();
    };
  }, []);
  
  // Mark component render for performance tracking
  useEffect(() => {
    performance.markComponentRender('MainApp');
  }, []);
  
  // Initialize streak system and notifications when app launches
  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize local notifications system
        await notifications.configureNotifications();
        
        // Clear any data cleanup notifications
        await clearDataCleanupNotifications();
        
        // Initialize AI wellness system (includes notifications)
        const systemInitializer = (await import('./src/services/ai/config/systemInitializer')).default;
        await systemInitializer.initialize();
        
        // Get notification permissions (both systems need this)
        const permissionsGranted = await notifications.requestNotificationsPermissions();
        
        // Check for app updates after intro is complete
        if (!showIntro) {
          // Delay the update check to avoid showing immediately on app start
          setTimeout(() => {
            checkForUpdates();
          }, 2000);
        }
        
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
              // Add guard to prevent multiple initializations
              let cleanupMotivationalMessages = () => {};
              
              if (!isMotivationalMessagesInitialized) {
                console.log('Initializing motivational messages for the first time');
                isMotivationalMessagesInitialized = true;
                cleanupMotivationalMessages = firebaseReminders.startLocalMotivationalMessages(false);
              } else {
                console.log('Skipping motivational messages initialization - already initialized');
              }
              
              // Return cleanup function
              return () => {
                cleanupMotivationalMessages();
                isMotivationalMessagesInitialized = false; // Reset on cleanup
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
  }, [showIntro, checkForUpdates]);
  
  // Initialize sound effects system with better error handling and retry logic
  useEffect(() => {
    const initSounds = async () => {
      try {
        console.log('Initializing sound system...');
        
        // Initialize sound system with user preferences
        await soundEffects.initSoundSystem();
        
        // Preload all sound effects for faster playback
        await soundEffects.preloadAllSounds();
        
        // Log the status after preloading
        const status = soundEffects.getSoundSystemStatus();
        console.log('Sound system status after preload:', status);
        
        // If some sounds failed to load, try again after a delay
        if (status.failedSounds > 0) {
          console.log(`${status.failedSounds} sounds failed to load, retrying in 5 seconds...`);
          setTimeout(async () => {
            try {
              await soundEffects.retryFailedSounds();
              const retryStatus = soundEffects.getSoundSystemStatus();
              console.log('Sound system status after retry:', retryStatus);
            } catch (retryError) {
              console.error('Error during sound retry:', retryError);
            }
          }, 5000);
        }
        
        console.log('Sound system initialization completed');
      } catch (error) {
        console.error('Error initializing sound effects system:', error);
        
        // Try a simplified initialization as fallback
        try {
          console.log('Attempting simplified sound initialization...');
          await soundEffects.initSoundSystem();
        } catch (fallbackError) {
          console.error('Fallback sound initialization also failed:', fallbackError);
        }
      }
    };
    
    initSounds();
    
    // Cleanup sounds when app is unmounted
    return () => {
      soundEffects.unloadAllSounds().catch(error => {
        console.error('Error during sound cleanup:', error);
      });
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
      
      {/* Global Achievement Listener */}
      <GlobalAchievementListener />
      
      {/* Update Notification Modal */}
      {updateInfo && (
        <UpdateNotificationModal
          visible={showModal}
          onClose={hideModal}
          updateInfo={updateInfo}
        />
      )}
      
      {/* AI Wellness Modal - Keep for fallback */}
      <AIWellnessModal
        visible={showAIModal}
        onClose={() => setShowAIModal(false)}
      />
      
      {/* FlexChat Modal - New experience */}
      <FlexChatModal
        visible={showFlexChat}
        onClose={() => setShowFlexChat(false)}
      />
      
      {/* AI Wellness Onboarding - Shows after splash */}
      <AIWellnessOnboarding
        visible={shouldShowOnboarding}
        onComplete={markOnboardingSeen}
        onDismiss={dismissOnboarding}
      />
      
      {/* Premium Upgrade Flow - Shows when user upgrades */}
      <AIWellnessPremiumUpgrade
        visible={shouldShowUpgrade}
        onComplete={markUpgradeSeen}
      />
    </Animated.View>
  );
} 