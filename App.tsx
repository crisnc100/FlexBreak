import React from 'react';
import { TouchableOpacity, Modal, View, Text, SafeAreaView, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
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

const Tab = createBottomTabNavigator();

// Main app wrapper
function MainApp() {
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const { theme, isDark } = useTheme();
  
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