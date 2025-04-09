import React, { useEffect } from 'react';
import { TouchableOpacity, Modal, View, Text, SafeAreaView, StatusBar, AppState, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
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
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as streakFreezeManager from './src/utils/progress/modules/streakFreezeManager';
import * as streakManager from './src/utils/progress/modules/streakManager';
import StreakFreezePrompt from './src/components/notifications/StreakFreezePrompt';
import * as rewardManager from './src/utils/progress/modules/rewardManager';
import { useFeatureAccess } from './src/hooks/progress/useFeatureAccess';

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
  );
}

// Create the main tab navigator component
function TabNavigator() {
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
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

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
  
  // Initialize streaks and streak freezes when app launches
  useEffect(() => {
    const initStreakSystem = async () => {
      try {
        // Check for streak freezes to refill monthly
        await streakFreezeManager.refillMonthlyStreakFreezes();
        
        // Check if a streak is broken and show notification if needed
        const streakStatus = await streakManager.checkStreakStatus();
        console.log('Streak status on app launch:', streakStatus);
      } catch (error) {
        console.error('Error initializing streak system:', error);
      }
    };
    
    initStreakSystem();
  }, []);
  
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
  
  return (
    <>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.background} 
      />
      <NavigationContainer theme={navigationTheme} ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="BobSimulator" component={BobSimulatorScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      
      {/* Streak Freeze Prompt */}
      <StreakFreezePrompt />
    </>
  );
} 