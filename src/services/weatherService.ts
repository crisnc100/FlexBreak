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

// Forecast data interface
export interface ForecastData {
  date: Date;
  weather: WeatherData;
}

export interface WeatherForecast {
  forecasts: ForecastData[];
  lastUpdated: number;
}

// Cache key and duration
const WEATHER_CACHE_KEY = 'weather_cache';
const WEATHER_FORECAST_CACHE_KEY = 'weather_forecast_cache';
const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours
const FORECAST_CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours for forecast

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
    
    // Quick location check - these coordinates should be in North Carolina
    if (lat > 35 && lat < 37 && lon > -79 && lon < -78) {
      console.log('Location verified: North Carolina area');
    } else {
      console.log('Warning: Location may be incorrect');
    }
    
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

/**
 * Clean up expired weather cache
 * This runs client-side when the app starts or resumes
 */
export async function cleanupWeatherCache(): Promise<void> {
  try {
    const cachedData = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
    if (cachedData) {
      const cache = JSON.parse(cachedData);
      const now = Date.now();
      
      // Remove cache if it's older than 24 hours
      if (now - cache.timestamp > 24 * 60 * 60 * 1000) {
        await AsyncStorage.removeItem(WEATHER_CACHE_KEY);
        console.log('Cleaned up expired weather cache');
      }
    }
  } catch (error) {
    console.error('Error cleaning up weather cache:', error);
  }
}

/**
 * Clear all weather cache (useful for testing)
 */
export async function clearWeatherCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WEATHER_CACHE_KEY);
    await AsyncStorage.removeItem(WEATHER_FORECAST_CACHE_KEY);
    console.log('Weather cache cleared');
  } catch (error) {
    console.error('Error clearing weather cache:', error);
  }
}

/**
 * Get 5-day weather forecast for a specific location
 * Uses the free 5-day/3-hour forecast API
 */
export async function getWeatherForecast(lat: number, lon: number): Promise<WeatherForecast | null> {
  try {
    // Check cache first
    const cachedData = await AsyncStorage.getItem(WEATHER_FORECAST_CACHE_KEY);
    if (cachedData) {
      const cache = JSON.parse(cachedData);
      const now = Date.now();
      
      // Return cached data if still valid and location is close enough
      if (
        now - cache.timestamp < FORECAST_CACHE_DURATION &&
        Math.abs(cache.lat - lat) < 0.1 &&
        Math.abs(cache.lon - lon) < 0.1
      ) {
        console.log('Using cached weather forecast data');
        return cache.data;
      }
    }
    
    // Fetch fresh forecast data
    console.log(`Fetching fresh weather forecast for ${lat}, ${lon}`);
    
    const apiKey = OPENWEATHER_MAP_API_KEY;
    
    if (!apiKey || apiKey === 'YOUR_OPENWEATHER_MAP_API_KEY') {
      console.error('OpenWeatherMap API key not configured');
      return null;
    }
    
    // Using 5-day forecast API (free tier)
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast`,
      {
        params: {
          lat,
          lon,
          appid: apiKey,
          units: 'imperial', // For Fahrenheit
          cnt: 40 // Get all 40 data points (5 days * 8 three-hour periods)
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    const data = response.data;
    
    // Group forecasts by day and get the max temp for each day
    const dailyForecasts = new Map<string, any>();
    
    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toDateString();
      const hour = date.getHours();
      
      // Get existing entry or create new one
      const existing = dailyForecasts.get(dateKey);
      
      if (!existing) {
        // First entry for this day
        dailyForecasts.set(dateKey, {
          date,
          data: item,
          maxTemp: item.main.temp,
          minTemp: item.main.temp,
          conditions: [item.weather[0].main]
        });
      } else {
        // Update with higher temp and track conditions
        if (item.main.temp > existing.maxTemp) {
          existing.maxTemp = item.main.temp;
          existing.data = item; // Use the data from the warmest time
        }
        if (item.main.temp < existing.minTemp) {
          existing.minTemp = item.main.temp;
        }
        if (!existing.conditions.includes(item.weather[0].main)) {
          existing.conditions.push(item.weather[0].main);
        }
      }
    });
    
    // Convert to our forecast format
    const forecasts: ForecastData[] = Array.from(dailyForecasts.values())
      .slice(0, 5) // Limit to 5 days
      .map(({ date, data: item, maxTemp, minTemp, conditions }) => {
        console.log(`Forecast for ${date.toDateString()}: High ${Math.round(maxTemp)}°F, Low ${Math.round(minTemp)}°F, Conditions: ${conditions.join(', ')}`);
        
        return {
          date,
          weather: {
            temp: Math.round(maxTemp), // Use the high temperature for the day
            condition: conditions.join(', '), // Include ALL conditions for the day
            description: item.weather[0].description,
            humidity: item.main.humidity,
            windSpeed: Math.round(item.wind.speed),
            feelsLike: Math.round(item.main.feels_like),
            isDay: true
          }
        };
      });
    
    const forecastData: WeatherForecast = {
      forecasts,
      lastUpdated: Date.now()
    };
    
    // Save to cache
    await AsyncStorage.setItem(WEATHER_FORECAST_CACHE_KEY, JSON.stringify({
      data: forecastData,
      timestamp: Date.now(),
      lat,
      lon
    }));
    
    return forecastData;
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    return null;
  }
}