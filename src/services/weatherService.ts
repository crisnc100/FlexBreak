import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OPENWEATHER_MAP_API_KEY } from '../config/weather.config';

// Weather data interface
export interface WeatherData {
  temp: number; // Temperature in Fahrenheit
  condition: string; // Clear, Clouds, Rain, Snow, etc.
  description: string; // Detailed description
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  isDay: boolean;
}

// Cache key and duration
const WEATHER_CACHE_KEY = 'weather_cache';
const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Get weather data for a specific location
 * Implements caching to minimize API calls
 */
export async function getWeatherData(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    // Check cache first
    const cachedData = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
    if (cachedData) {
      const cache = JSON.parse(cachedData);
      const now = Date.now();
      
      // Return cached data if still valid and location is close enough
      if (
        now - cache.timestamp < CACHE_DURATION &&
        Math.abs(cache.lat - lat) < 0.1 &&
        Math.abs(cache.lon - lon) < 0.1
      ) {
        console.log('Using cached weather data');
        return cache.data;
      }
    }
    
    // Fetch fresh weather data
    console.log(`Fetching fresh weather data for ${lat}, ${lon}`);
    
    // Get API key from config
    const apiKey = OPENWEATHER_MAP_API_KEY;
    
    if (!apiKey || apiKey === 'YOUR_OPENWEATHER_MAP_API_KEY') {
      console.error('OpenWeatherMap API key not configured');
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
    await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
      data: weatherData,
      timestamp: Date.now(),
      lat,
      lon
    }));
    
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

/**
 * Generate weather-based message
 */
export function generateWeatherMessage(weather: WeatherData): { title: string; body: string } {
  const emoji = getWeatherEmoji(weather.condition);
  const temp = weather.temp;
  
  // Extreme cold
  if (temp < 32) {
    return {
      title: `${emoji} Brrr! ${temp}°F outside`,
      body: "Stay warm with indoor stretches that boost circulation!"
    };
  }
  
  // Extreme heat
  if (temp > 90) {
    return {
      title: `${emoji} Hot day at ${temp}°F`,
      body: "Stay cool with gentle indoor stretches. Remember to hydrate!"
    };
  }
  
  // Rain
  if (weather.condition === 'Rain' || weather.condition === 'Drizzle') {
    return {
      title: `${emoji} Rainy day vibes`,
      body: "Indoor stretches are perfect for boosting your rainy day mood!"
    };
  }
  
  // Perfect weather
  if (temp >= 65 && temp <= 75 && weather.condition === 'Clear') {
    return {
      title: `${emoji} Perfect ${temp}°F day!`,
      body: "Amazing weather for a walking meeting or outdoor stretch!"
    };
  }
  
  // Default
  return {
    title: `${emoji} ${temp}°F outside`,
    body: "Great day for movement! Take a stretch break and feel the difference!"
  };
}