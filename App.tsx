import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';
import RoutineScreen from './src/screens/RoutineScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import ProgressTestingScreen from './src/screens/ProgressTestingScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import { PremiumProvider } from './src/context/PremiumContext';
import { RefreshProvider } from './src/context/RefreshContext';
import { ThemeProvider } from './src/context/ThemeContext';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <PremiumProvider>
        <RefreshProvider>
          <NavigationContainer>
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
              <Tab.Screen name="Home" component={HomeScreen} />
              <Tab.Screen name="Routine" component={RoutineScreen} />
              <Tab.Screen name="Progress" component={ProgressScreen} />
              <Tab.Screen name="Favorites" component={FavoritesScreen} />
              
              {/* Testing screen - only show in development */}
              {__DEV__ && (
                <Tab.Screen 
                  name="Testing" 
                  component={ProgressTestingScreen}
                  options={{
                    tabBarLabel: 'Testing',
                    title: 'Progress Testing'
                  }}
                />
              )}
            </Tab.Navigator>
          </NavigationContainer>
        </RefreshProvider>
      </PremiumProvider>
    </ThemeProvider>
  );
} 