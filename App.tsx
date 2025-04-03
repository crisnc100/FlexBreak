import React, { useEffect } from 'react';
import { TouchableOpacity, Modal, View, Text, SafeAreaView, StatusBar, AppState, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import HomeScreen from './src/screens/HomeScreen';
import RoutineScreen from './src/screens/RoutineScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { PremiumProvider } from './src/context/PremiumContext';
import { RefreshProvider } from './src/context/RefreshContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Tab = createBottomTabNavigator();

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Function to register for push notifications and get token
async function registerForPushNotificationsAsync() {
  try {
    // For Expo Go, we can use the default projectId
    let projectId = undefined;
    
    // Only use project ID if not in Expo Go
    if (!Constants.appOwnership || Constants.appOwnership !== 'expo') {
      projectId = Constants.expoConfig?.extra?.eas?.projectId;
    }
    
    console.log('Using projectId:', projectId || 'default Expo projectId');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token: Permission denied');
      return;
    }

    // Get token (use default project ID in Expo Go)
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId
      });
      
      console.log('Push Token:', tokenData.data);
      await AsyncStorage.setItem('pushToken', tokenData.data);
      return tokenData.data;
    } catch (tokenError) {
      console.log('Error getting push token:', tokenError);
      // For testing in Expo Go, we can still use local notifications
      console.log('Will use local notifications for testing instead');
    }
  } catch (error) {
    console.log('Error registering for notifications:', error);
  }
}

// Main app wrapper
function MainApp() {
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const { theme, isDark } = useTheme();

  useEffect(() => {
    console.log('App started - configuring notifications');

    // Register for push notifications
    registerForPushNotificationsAsync();

    // Add listeners for notifications
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received while app is open:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('User tapped on notification:', response);
      // Optionally navigate to a screen here
    });

    // For testing - schedule a local notification in 5 seconds
    if (__DEV__) {
      scheduleTestNotification();
    }

    // Preserve your existing background scheduling logic (optional)
    let appJustStarted = true;
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && appJustStarted) {
        console.log('App just started - checking notifications');
        appJustStarted = false;
      } else if (nextAppState === 'background') {
        setTimeout(() => {
          appJustStarted = true;
        }, 60000); // Reset after 1 minute
      }
    });

    // Cleanup
    return () => {
      subscription.remove();
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);
  
  // Add this function for testing
  async function scheduleTestNotification() {
    // Schedule a notification to appear 5 seconds after the app starts
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "DeskStretch Reminder 💪",
        body: "Time to take a break and stretch!",
        data: { screen: 'Routine' },
      },
      trigger: null, // null trigger means show immediately
    });
    console.log('Test notification scheduled to appear immediately');
  }
  
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
          <Tab.Screen 
            name="Favorites" 
            component={FavoritesScreen}
          />
          
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