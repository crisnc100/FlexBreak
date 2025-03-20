import React, { useEffect } from 'react';
import { TouchableOpacity, Modal, View, Text, SafeAreaView, StatusBar, AppState } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import HomeScreen from './src/screens/HomeScreen';
import RoutineScreen from './src/screens/RoutineScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import EnhancedProgressTestingScreen from './src/screens/EnhancedProgressTestingScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { PremiumProvider } from './src/context/PremiumContext';
import { RefreshProvider } from './src/context/RefreshContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { useState } from 'react';
import * as notifications from './src/utils/notifications';

const Tab = createBottomTabNavigator();

// Main app wrapper
function MainApp() {
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const { theme, isDark } = useTheme();
  
  // Set up background notification scheduling
  useEffect(() => {
    console.log('App started - configuring notifications');
    
    // Configure and init notifications
    notifications.configureNotifications();
    
    // Call setupBackgroundScheduling to ensure reminders get scheduled
    notifications.setupBackgroundScheduling();
    
    // Add listener for notification received/responded to
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      // This is fired when a notification is received while the app is foregrounded
      console.log('Notification received while app is open:', notification);
    });
    
    // Setup notification response listener (when user taps on notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('User tapped on notification:', response);
      // Here you could navigate to a specific screen based on notification
    });
    
    // Listen for app state changes but only schedule on cold starts
    let appJustStarted = true;
    
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // Only check reminders when app is first opened or reopened after a long time
        if (appJustStarted) {
          console.log('App just started - scheduling reminders if needed');
          notifications.setupBackgroundScheduling(); // Also call here when app returns to foreground
          appJustStarted = false;
        }
      } else if (nextAppState === 'background') {
        // App going to background, reset flag after a delay
        setTimeout(() => {
          appJustStarted = true;
        }, 60000); // Reset after 1 minute in background
      }
    });
    
    // Cleanup
    return () => {
      subscription.remove();
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);
  
  // Create custom navigation theme based on our app theme
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.accent,
      background: theme.background,
      card: theme.cardBackground,
      text: theme.text,
      border: theme.border,
    },
  };
  
  // Tab bar styles based on theme
  const tabBarStyle = {
    backgroundColor: theme.cardBackground,
    borderTopColor: theme.border,
  };
  
  return (
    <>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.background} 
      />
      <NavigationContainer theme={navigationTheme}>
        {/* @ts-ignore - id prop is required in types but works fine without in practice */}
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
              } else if (route.name === 'Testing') {
                iconName = focused ? 'construct' : 'construct-outline';
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
          
          {/* Enhanced Testing screen - only show in development */}
          {__DEV__ && (
            <Tab.Screen 
              name="Testing" 
              component={EnhancedProgressTestingScreen}
              options={{
                tabBarLabel: 'Testing',
                title: 'Enhanced Testing'
              }}
            />
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
              navigation={{ goBack: () => setSettingsModalVisible(false) }}
              onClose={() => setSettingsModalVisible(false)}
            />
          </View>
        </Modal>
      </NavigationContainer>
    </>
  );
}

// App root with providers
export default function App() {
  return (
    <PremiumProvider>
      <ThemeProvider>
        <RefreshProvider>
          <MainApp />
        </RefreshProvider>
      </ThemeProvider>
    </PremiumProvider>
  );
} 