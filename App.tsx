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
import SettingsScreen from './src/screens/SettingsScreen';
import BobSimulatorScreen from './src/screens/BobSimulatorScreen';
import { PremiumProvider } from './src/context/PremiumContext';
import { RefreshProvider } from './src/context/RefreshContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Create a function to navigate outside of a component
function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
  }
}

// Create the main tab navigator component
function TabNavigator() {
  const { theme, isDark } = useTheme();
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  
  const tabBarStyle = {
    backgroundColor: theme.cardBackground,
    borderTopColor: theme.border,
    borderTopWidth: 1,
    elevation: 0,
  };

  return (
    <>
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