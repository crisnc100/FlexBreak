import * as admin from 'firebase-admin';
import axios from 'axios';

// Weather data cache interface
interface WeatherCache {
  data: WeatherData;
  timestamp: number;
  location: {
    lat: number;
    lon: number;
  };
}

// Weather data structure
export interface WeatherData {
  temp: number; // Temperature in Fahrenheit
  condition: string; // Clear, Clouds, Rain, Snow, etc.
  description: string; // Detailed description
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  isDay: boolean;
}

// Weather priority levels
export enum WeatherPriority {
  HIGH = 'high', // Extreme conditions
  MEDIUM = 'medium', // Perfect outdoor weather
  LOW = 'low', // Normal conditions
  NONE = 'none' // No weather data
}

// Weather condition categories
export interface WeatherCategory {
  priority: WeatherPriority;
  shouldSendWeatherMessage: boolean;
  messageProbability: number;
}

// Cache duration: 3 hours in milliseconds
const CACHE_DURATION = 3 * 60 * 60 * 1000;

/**
 * Get weather data for a specific location
 * Implements caching to minimize API calls
 */
export async function getWeatherData(
  lat: number, 
  lon: number
): Promise<WeatherData | null> {
  try {
    // Check cache first
    const cacheKey = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
    const cacheRef = admin.firestore().collection('weather_cache').doc(cacheKey);
    const cacheDoc = await cacheRef.get();
    
    if (cacheDoc.exists) {
      const cache = cacheDoc.data() as WeatherCache;
      const now = Date.now();
      
      // Return cached data if still valid
      if (now - cache.timestamp < CACHE_DURATION) {
        console.log(`Using cached weather data for ${lat}, ${lon}`);
        return cache.data;
      }
    }
    
    // Fetch fresh weather data
    console.log(`Fetching fresh weather data for ${lat}, ${lon}`);
    
    // Try to get API key from Firebase config first, then environment variable
    let apiKey: string | undefined;
    try {
      // Import functions to access config
      const functions = require('firebase-functions');
      apiKey = functions.config()?.openweather?.api_key;
    } catch (error) {
      // Fallback to environment variable for local development
      apiKey = process.env.OPENWEATHER_MAP_API_KEY;
    }
    
    if (!apiKey) {
      console.error('OpenWeatherMap API key not configured. Set it using: firebase functions:config:set openweather.api_key="YOUR_KEY"');
      return null;
    }
    
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          lat,
          lon,
          appid: apiKey,
          units: 'imperial' // For Fahrenheit
        },
        timeout: 5000 // 5 second timeout
      }
    );
    
    const data = response.data;
    
    // Parse weather data
    const weatherData: WeatherData = {
      temp: Math.round(data.main.temp),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed),
      feelsLike: Math.round(data.main.feels_like),
      isDay: isCurrentlyDay(data.sys.sunrise, data.sys.sunset, data.dt)
    };
    
    // Save to cache
    await cacheRef.set({
      data: weatherData,
      timestamp: Date.now(),
      location: { lat, lon }
    });
    
    return weatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

/**
 * Determine if it's currently day or night
 */
function isCurrentlyDay(sunrise: number, sunset: number, current: number): boolean {
  return current >= sunrise && current <= sunset;
}

/**
 * Categorize weather conditions and determine priority
 */
export function categorizeWeather(weather: WeatherData): WeatherCategory {
  // Extreme weather conditions (HIGH priority - 70% chance)
  if (
    weather.temp < 32 || // Freezing
    weather.temp > 90 || // Very hot
    weather.condition === 'Thunderstorm' ||
    weather.condition === 'Snow' ||
    weather.condition === 'Extreme' ||
    weather.windSpeed > 25 || // High winds
    (weather.condition === 'Rain' && weather.description.includes('heavy'))
  ) {
    return {
      priority: WeatherPriority.HIGH,
      shouldSendWeatherMessage: true,
      messageProbability: 0.7
    };
  }
  
  // Perfect outdoor weather (MEDIUM priority - 50% chance)
  if (
    weather.temp >= 65 && weather.temp <= 75 &&
    (weather.condition === 'Clear' || weather.condition === 'Clouds') &&
    weather.windSpeed < 15 &&
    weather.isDay
  ) {
    return {
      priority: WeatherPriority.MEDIUM,
      shouldSendWeatherMessage: true,
      messageProbability: 0.5
    };
  }
  
  // Normal weather conditions (LOW priority - 20% chance)
  return {
    priority: WeatherPriority.LOW,
    shouldSendWeatherMessage: true,
    messageProbability: 0.2
  };
}

/**
 * Clear expired weather cache entries
 * Should be run periodically (e.g., daily)
 */
export async function clearExpiredWeatherCache(): Promise<void> {
  try {
    const now = Date.now();
    const expiredTime = now - CACHE_DURATION;
    
    const snapshot = await admin.firestore()
      .collection('weather_cache')
      .where('timestamp', '<', expiredTime)
      .get();
    
    const batch = admin.firestore().batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Cleared ${snapshot.size} expired weather cache entries`);
  } catch (error) {
    console.error('Error clearing weather cache:', error);
  }
}

/**
 * Get weather emoji based on condition
 */
export function getWeatherEmoji(condition: string): string {
  const emojiMap: { [key: string]: string } = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Fog': '🌫️',
    'Haze': '🌫️',
    'Smoke': '💨',
    'Dust': '🌪️',
    'Sand': '🌪️',
    'Ash': '🌋',
    'Squall': '💨',
    'Tornado': '🌪️'
  };
  
  return emojiMap[condition] || '🌤️';
}