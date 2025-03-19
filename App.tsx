import React from 'react';
import { TouchableOpacity, Modal, View, Text, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
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
import { ThemeProvider } from './src/context/ThemeContext';
import { useState } from 'react';

const Tab = createBottomTabNavigator();

export default function App() {
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  
  return (
    <ThemeProvider>
      <PremiumProvider>
        <RefreshProvider>
          <NavigationContainer>
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
                tabBarActiveTintColor: '#4CAF50',
                tabBarInactiveTintColor: 'gray',
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
                      <Ionicons name="settings-outline" size={24} color="#333" />
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
              <SafeAreaView style={{ flex: 1 }}>
                <SettingsScreen 
                  navigation={{ goBack: () => setSettingsModalVisible(false) }}
                  onClose={() => setSettingsModalVisible(false)}
                />
              </SafeAreaView>
            </Modal>
          </NavigationContainer>
        </RefreshProvider>
      </PremiumProvider>
    </ThemeProvider>
  );
} 