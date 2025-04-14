import React, { useEffect, useState, useRef } from 'react';
import { TouchableOpacity, Modal, View, Text, SafeAreaView, StatusBar, AppState, Platform, Animated } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as streakFreezeManager from './src/utils/progress/modules/streakFreezeManager';
import * as streakManager from './src/utils/progress/modules/streakManager';
import StreakFreezePrompt from './src/components/notifications/StreakFreezePrompt';
import * as rewardManager from './src/utils/progress/modules/rewardManager';
import { useFeatureAccess } from './src/hooks/progress/useFeatureAccess';
import * as soundEffects from './src/utils/soundEffects';
import IntroManager from './src/components/intro/IntroManager';
import * as streakValidator from './src/utils/progress/modules/streakValidator';

// Avoid playing intro sound twice
let introSoundPlayed = false;

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const navigationRef = createNavigationContainerRef();

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Helper function to navigate from outside a navigation component
function navigate(name, params) {
  if (navigationRef.isReady()) {
    // @ts-ignore: Ignore the type-checking error for now
    navigationRef.navigate(name, params);
  }
}

// Main entry point for the app
export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PremiumProvider>
            <RefreshProvider>
              <StatusBar 
                barStyle="dark-content" 
                backgroundColor="transparent" 
                translucent={true} 
              />
              <MainApp />
            </RefreshProvider>
          </PremiumProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}

// Create the main tab navigator component
const TabNavigator = () => {
  const { theme, isDark } = useTheme();
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const { isPremium } = usePremium();
  const { canAccessFeature } = useFeatureAccess();
  const [hasPlaylistAccess, setHasPlaylistAccess] = useState(false);
  
  // Check if user has access to playlists feature
  useEffect(() => {
    const checkPlaylistAccess = async () => {
      const hasAccess = await rewardManager.isRewardUnlocked('focus_area_mastery');
      setHasPlaylistAccess(isPremium && hasAccess);
    };
    
    checkPlaylistAccess();
  }, [isPremium]);
  
  const tabBarStyle = {
    backgroundColor: theme.cardBackground,
    borderTopColor: theme.border,
    borderTopWidth: 1,
    elevation: 0,
  };

  return (
    <>
      <Tab.Navigator
        id="tab-navigator"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string = 'home';

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
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{
            headerRight: () => (
              <TouchableOpacity 
                onPress={() => setSettingsModalVisible(true)}
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
              navigate: navigate 
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
  
  // Initialize streaks and streak freezes when app launches
  useEffect(() => {
    const initStreakSystem = async () => {
      try {
        console.log('Initializing streak system...');
        
        // First run a validation to ensure streak values are consistent
        // This will force a refresh of the streak cache and emit an update event
        await streakValidator.runStartupStreakValidation();
        
        // Check if streak is broken and should be reset to 0 in the UI
        const isStreakBroken = await streakManager.isStreakBroken();
        if (isStreakBroken) {
          console.log('Streak is broken due to multiple missed days. UI will show 0.');
        }
        
        // Check for streak freezes to refill monthly
        await streakFreezeManager.refillMonthlyStreakFreezes();
        
        // Force streak manager to emit an update event to refresh all UI components
        streakManager.streakEvents.emit('streak_updated');
        
        // Check if a streak is broken and show notification if needed
        const streakStatus = await streakManager.checkStreakStatus();
        console.log('Streak status on app launch:', streakStatus);
      } catch (error) {
        console.error('Error initializing streak system:', error);
      }
    };
    
    initStreakSystem();
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
        console.log('Sound effects system initialized');
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
      
      {/* Streak Freeze Prompt */}
      <StreakFreezePrompt />
    </Animated.View>
  );
} 