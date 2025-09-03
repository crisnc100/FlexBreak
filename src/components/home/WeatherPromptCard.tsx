import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentLocation, setWeatherNotificationsEnabled, areWeatherNotificationsEnabled } from '../../services/locationService';
import { getWeatherData, WeatherData } from '../../services/weatherService';
import { isWeatherRelevant } from '../../utils/weatherUtils';
import { scheduleProductionMotivationalMessages } from '../../services/notificationScheduler';

const WEATHER_PROMPT_SHOWN_KEY = 'weather_prompt_last_shown';
const WEATHER_PROMPT_DISMISSALS_KEY = 'weather_prompt_dismissals';
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

interface WeatherPromptCardProps {
  onEnable: () => void;
  onDismiss: () => void;
}

export const WeatherPromptCard: React.FC<WeatherPromptCardProps> = ({ onEnable, onDismiss }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [shouldShow, setShouldShow] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const sunRotation = useRef(new Animated.Value(0)).current;
  const rainFall = useRef(new Animated.Value(-50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkShouldShowPrompt();
  }, []);

  const checkShouldShowPrompt = async () => {
    try {
      // Don't show if weather notifications already enabled
      const weatherEnabled = await areWeatherNotificationsEnabled();
      if (weatherEnabled) {
        console.log('Weather notifications already enabled - not showing prompt');
        setShouldShow(false);
        return;
      }

      // Check dismissal count (max 3 times total)
      const dismissalsStr = await AsyncStorage.getItem(WEATHER_PROMPT_DISMISSALS_KEY);
      const dismissals = dismissalsStr ? parseInt(dismissalsStr, 10) : 0;
      if (dismissals >= 3) {
        console.log('Weather prompt dismissed 3 times - not showing again');
        setShouldShow(false);
        return;
      }

      // Check last shown time (once per week)
      const lastShownStr = await AsyncStorage.getItem(WEATHER_PROMPT_SHOWN_KEY);
      const lastShown = lastShownStr ? parseInt(lastShownStr, 10) : 0;
      const now = Date.now();
      
      if (now - lastShown < WEEK_IN_MS) {
        console.log('Weather prompt shown within last week - not showing yet');
        setShouldShow(false);
        return;
      }

      // Get current location and weather
      const location = await getCurrentLocation();
      if (!location) {
        console.log('No location available - not showing weather prompt');
        setShouldShow(false);
        return;
      }

      const weatherData = await getWeatherData(location.lat, location.lon);
      if (!weatherData) {
        console.log('Weather API failed - not showing prompt');
        setShouldShow(false);
        return;
      }

      // Only show if weather is relevant/interesting
      if (!isWeatherRelevant(weatherData)) {
        console.log('Weather not relevant - not showing prompt');
        setShouldShow(false);
        return;
      }

      // All checks passed - show the prompt
      setWeather(weatherData);
      setShouldShow(true);
      await AsyncStorage.setItem(WEATHER_PROMPT_SHOWN_KEY, now.toString());
      
      // Start animations
      startAnimations(weatherData);
    } catch (error) {
      console.error('Error checking weather prompt:', error);
      setShouldShow(false);
    }
  };

  const startAnimations = (weatherData: WeatherData) => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Scale in
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Weather-specific animations
    if (weatherData.temp > 85) {
      // Hot day - rotating sun
      Animated.loop(
        Animated.timing(sunRotation, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        })
      ).start();

      // Heat pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (weatherData.condition.includes('Rain')) {
      // Rain animation
      Animated.loop(
        Animated.timing(rainFall, {
          toValue: 200,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else if (weatherData.temp < 40) {
      // Cold - gentle float
      Animated.loop(
        Animated.sequence([
          Animated.timing(rainFall, {
            toValue: 10,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(rainFall, {
            toValue: -10,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (weatherData.temp >= 65 && weatherData.temp <= 75 && weatherData.condition === 'Clear') {
      // Perfect weather - gentle rotation and scale breathing
      Animated.loop(
        Animated.timing(sunRotation, {
          toValue: 1,
          duration: 20000, // Slower rotation for calm effect
          useNativeDriver: true,
        })
      ).start();

      // Gentle breathing effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  };

  const handleEnable = async () => {
    try {
      // Enable weather notifications
      const success = await setWeatherNotificationsEnabled(true);
      if (success) {
        // Reschedule notifications with weather
        await scheduleProductionMotivationalMessages();
        
        // Fade out animation
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShouldShow(false);
          onEnable();
        });
      }
    } catch (error) {
      console.error('Error enabling weather notifications:', error);
    }
  };

  const handleDismiss = async () => {
    try {
      // Update dismissal count
      const dismissalsStr = await AsyncStorage.getItem(WEATHER_PROMPT_DISMISSALS_KEY);
      const dismissals = dismissalsStr ? parseInt(dismissalsStr, 10) : 0;
      await AsyncStorage.setItem(WEATHER_PROMPT_DISMISSALS_KEY, (dismissals + 1).toString());
      
      // Fade out animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldShow(false);
        onDismiss();
      });
    } catch (error) {
      console.error('Error dismissing weather prompt:', error);
    }
  };

  if (!shouldShow || !weather) {
    return null;
  }

  const getWeatherGradient = () => {
    if (weather.temp > 85) {
      return ['#FF6B6B', '#FFB366']; // Hot gradient
    } else if (weather.condition.includes('Rain')) {
      return ['#4A90E2', '#7B68EE']; // Rain gradient
    } else if (weather.temp < 40) {
      return ['#A8DADC', '#457B9D']; // Cold gradient
    } else {
      return ['#56CCF2', '#2F80ED']; // Perfect weather gradient
    }
  };

  const getWeatherIcon = () => {
    if (weather.temp > 85) return 'sunny';
    if (weather.condition.includes('Rain')) return 'rainy';
    if (weather.condition.includes('Snow')) return 'snow';
    if (weather.temp < 40) return 'snow-outline';
    return 'partly-sunny';
  };

  const getWeatherMessage = () => {
    if (weather.temp > 85) return `It's ${weather.temp}°F outside!`;
    if (weather.condition.includes('Rain')) return `Rainy day ahead`;
    if (weather.temp < 40) return `Bundle up - ${weather.temp}°F`;
    return `Perfect ${weather.temp}°F day!`;
  };

  const getWeatherSubtext = () => {
    if (weather.temp > 85) return 'Stay cool with smart alerts';
    if (weather.condition.includes('Rain')) return 'Get weather-aware reminders';
    if (weather.temp < 40) return 'Stay warm with timely alerts';
    return 'Never miss perfect weather';
  };

  const spin = sunRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={getWeatherGradient()}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Animated Weather Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              weather.temp > 85 && {
                transform: [
                  { rotate: spin },
                  { scale: pulseAnim },
                ],
              },
              weather.condition.includes('Rain') && {
                transform: [{ translateY: rainFall }],
              },
              weather.temp < 40 && {
                transform: [{ translateY: rainFall }],
              },
              (weather.temp >= 65 && weather.temp <= 75 && weather.condition === 'Clear') && {
                transform: [
                  { rotate: spin },
                  { scale: pulseAnim },
                ],
              },
            ]}
          >
            <Ionicons
              name={getWeatherIcon()}
              size={48}
              color="white"
            />
          </Animated.View>

          {/* Weather Message */}
          <Text style={styles.temperature}>{getWeatherMessage()}</Text>
          <Text style={styles.subtext}>{getWeatherSubtext()}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.enableButton}
              onPress={handleEnable}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={20} color="#4CAF50" />
              <Text style={styles.enableText}>Enable FREE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  gradient: {
    padding: 20,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 12,
  },
  temperature: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  subtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 6,
  },
  enableText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  dismissButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dismissText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
});