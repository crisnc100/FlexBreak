import { getWeatherData, generateWeatherMessage } from '../../services/weatherService';
import { areWeatherNotificationsEnabled, getCurrentLocation } from '../../services/locationService';
import { shouldShowWeatherMessage } from '../weatherUtils';

export async function testWeatherNotifications() {
  console.log('=== Testing Weather Notifications ===\n');
  
  try {
    // 1. Check if weather notifications are enabled
    const weatherEnabled = await areWeatherNotificationsEnabled();
    console.log(`✓ Weather notifications enabled: ${weatherEnabled}`);
    
    if (!weatherEnabled) {
      console.log('⚠️  Weather notifications are disabled. Enable them in settings to test.');
      return;
    }
    
    // 2. Test location permissions and get location
    console.log('\nTesting location service...');
    const location = await getCurrentLocation();
    
    if (!location) {
      console.log('❌ Could not get location. Make sure location permissions are granted.');
      return;
    }
    
    console.log(`✓ Location obtained: ${location.city || 'Unknown city'}, ${location.region || 'Unknown region'}`);
    console.log(`  Coordinates: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`);
    
    // 3. Test weather API
    console.log('\nTesting weather API...');
    const weatherData = await getWeatherData(location.lat, location.lon);
    
    if (!weatherData) {
      console.log('❌ Could not fetch weather data. Check API key configuration.');
      return;
    }
    
    console.log(`✓ Weather data fetched successfully:`);
    console.log(`  Temperature: ${weatherData.temp}°F (feels like ${weatherData.feelsLike}°F)`);
    console.log(`  Condition: ${weatherData.condition} - ${weatherData.description}`);
    console.log(`  Humidity: ${weatherData.humidity}%`);
    console.log(`  Wind Speed: ${weatherData.windSpeed} mph`);
    console.log(`  Time of day: ${weatherData.isDay ? 'Day' : 'Night'}`);
    
    // 4. Test weather message generation
    console.log('\nTesting weather message generation...');
    const weatherMessage = generateWeatherMessage(weatherData);
    console.log(`✓ Generated weather message:`);
    console.log(`  Title: ${weatherMessage.title}`);
    console.log(`  Body: ${weatherMessage.body}`);
    
    // 5. Test probability logic
    console.log('\nTesting weather message probability...');
    let showCount = 0;
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      if (shouldShowWeatherMessage(weatherData, false)) {
        showCount++;
      }
    }
    
    const probability = (showCount / iterations) * 100;
    console.log(`✓ Weather message would show ~${probability.toFixed(0)}% of the time (morning)`);
    
    // Test afternoon probability
    showCount = 0;
    for (let i = 0; i < iterations; i++) {
      if (shouldShowWeatherMessage(weatherData, true)) {
        showCount++;
      }
    }
    
    const afternoonProbability = (showCount / iterations) * 100;
    console.log(`✓ Weather message would show ~${afternoonProbability.toFixed(0)}% of the time (afternoon)`);
    
    console.log('\n✅ All weather notification tests passed!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run the test
if (require.main === module) {
  testWeatherNotifications();
}