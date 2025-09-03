import { WeatherData } from '../services/weatherService';

/**
 * Determine if weather is relevant enough to notify user
 * Uses deterministic rules instead of probability
 */
export function isWeatherRelevant(weather: WeatherData, previousDayTemp?: number): boolean {
  // Parse conditions once
  const conditions = weather.condition.split(', ');
  
  // ALWAYS show for these conditions (high priority)
  // Precipitation events
  if (conditions.some(c => ['Rain', 'Snow', 'Thunderstorm', 'Drizzle', 'Sleet', 'Hail'].includes(c))) {
    console.log(`Weather relevant: Precipitation detected - ${weather.condition}`);
    return true;
  }
  
  // Extreme temperatures
  if (weather.temp < 40 || weather.temp > 85) {
    console.log(`Weather relevant: Extreme temp - ${weather.temp}°F`);
    return true;
  }
  
  // Perfect weather days are worth mentioning
  if (weather.temp >= 65 && weather.temp <= 75 && conditions.includes('Clear')) {
    console.log(`Weather relevant: Perfect weather - ${weather.temp}°F and clear`);
    return true;
  }
  
  // Significant temperature change from yesterday
  if (previousDayTemp !== undefined && Math.abs(weather.temp - previousDayTemp) > 15) {
    console.log(`Weather relevant: Big temp change - ${Math.abs(weather.temp - previousDayTemp)}°F difference`);
    return true;
  }
  
  // Very cold or very hot
  if (weather.temp < 32) {
    console.log(`Weather relevant: Freezing - ${weather.temp}°F`);
    return true;
  }
  
  if (weather.temp > 90) {
    console.log(`Weather relevant: Very hot - ${weather.temp}°F`);
    return true;
  }
  
  // Fog or low visibility conditions
  if (conditions.some(c => ['Fog', 'Mist', 'Haze', 'Smoke'].includes(c))) {
    console.log(`Weather relevant: Low visibility - ${weather.condition}`);
    return true;
  }
  
  // Otherwise not relevant enough
  console.log(`Weather not relevant: ${weather.temp}°F, ${weather.condition}`);
  return false;
}

/**
 * Determine if weather message should be shown
 * @param weather Weather data  
 * @param isAfternoon Whether this is an afternoon message
 * @param previousDayTemp Temperature from previous day for comparison
 */
export function shouldShowWeatherMessage(
  weather: WeatherData, 
  isAfternoon: boolean = false,
  previousDayTemp?: number
): boolean {
  // For afternoon, we might want slightly different logic in future
  // but for now use same relevance rules
  return isWeatherRelevant(weather, previousDayTemp);
}

/**
 * Get yesterday's temperature for comparison (stub for now)
 * In production, this would fetch from cache/storage
 */
export function getPreviousDayTemperature(): number | undefined {
  // TODO: Implement fetching previous day's temp from AsyncStorage
  return undefined;
}