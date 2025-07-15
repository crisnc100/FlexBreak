import { WeatherData } from '../services/weatherService';

/**
 * Get probability of showing weather message based on conditions
 * Higher probability for extreme or perfect weather
 */
export function getWeatherMessageProbability(weather: WeatherData): number {
  // Extreme weather gets highest priority
  if (weather.temp < 32 || weather.temp > 90) {
    return 0.7; // 70% chance
  }
  
  // Perfect weather is also interesting
  if (weather.temp >= 65 && weather.temp <= 75 && weather.condition === 'Clear') {
    return 0.5; // 50% chance
  }
  
  // Rain/snow is noteworthy
  if (['Rain', 'Snow', 'Thunderstorm'].includes(weather.condition)) {
    return 0.6; // 60% chance
  }
  
  // Normal weather
  return 0.2; // 20% chance
}

/**
 * Determine if weather message should be shown
 * @param weather Weather data
 * @param isAfternoon Whether this is an afternoon message (lower probability)
 */
export function shouldShowWeatherMessage(weather: WeatherData, isAfternoon: boolean = false): boolean {
  const probability = getWeatherMessageProbability(weather);
  const adjustedProbability = isAfternoon ? probability * 0.7 : probability;
  return Math.random() < adjustedProbability;
}