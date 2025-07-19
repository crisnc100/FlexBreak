import { getWeatherData, generateWeatherMessage } from '../../services/weatherService';
import { areWeatherNotificationsEnabled, getCurrentLocation, checkLocationPermission } from '../../services/locationService';
import { shouldShowWeatherMessage } from '../weatherUtils';
import { getRandomMotivationalMessage } from '../../constants/motivationalMessages';

export async function testWeatherNotifications() {
  console.log('=== Testing Weather Notifications ===\n');
  
  try {
    // 1. Check location permission status
    console.log('1. Location Permission Check:');
    const hasLocationPermission = await checkLocationPermission();
    console.log(`   Location permission: ${hasLocationPermission ? '✓ Granted' : '✗ Not granted'}`);
    
    // 2. Check if weather notifications are enabled
    const weatherEnabled = await areWeatherNotificationsEnabled();
    console.log(`   Weather notifications: ${weatherEnabled ? '✓ Enabled' : '✗ Disabled'}`);
    
    if (!weatherEnabled) {
      console.log('\n⚠️  Weather notifications are disabled.');
      console.log('   To enable: Settings > AI Wellness > Weather-Based Notifications');
      console.log('   Or: Enable notifications on home screen (smart prompt will appear)');
      return;
    }
    
    // 3. Test location service
    console.log('\n2. Location Service Test:');
    const location = await getCurrentLocation();
    
    if (!location) {
      console.log('   ❌ Could not get location. Make sure location permissions are granted.');
      return;
    }
    
    console.log(`   ✓ Location: ${location.city || 'Unknown city'}, ${location.region || 'Unknown region'}`);
    console.log(`   ✓ Coordinates: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`);
    
    // 4. Test weather API
    console.log('\n3. Weather API Test:');
    const weatherData = await getWeatherData(location.lat, location.lon);
    
    if (!weatherData) {
      console.log('   ❌ Could not fetch weather data.');
      console.log('   Check: OPENWEATHER_MAP_API_KEY in .env file');
      return;
    }
    
    console.log(`   ✓ Temperature: ${weatherData.temp}°F (feels like ${weatherData.feelsLike}°F)`);
    console.log(`   ✓ Condition: ${weatherData.condition} - ${weatherData.description}`);
    console.log(`   ✓ Humidity: ${weatherData.humidity}%`);
    console.log(`   ✓ Wind Speed: ${weatherData.windSpeed} mph`);
    
    // 5. Test message generation
    console.log('\n4. Message Generation Test:');
    const weatherMessage = generateWeatherMessage(weatherData);
    const motivationalMessage = getRandomMotivationalMessage();
    
    console.log('   Weather message:');
    console.log(`     Title: "${weatherMessage.title}"`);
    console.log(`     Body: "${weatherMessage.body}"`);
    
    console.log('\n   Motivational message (for comparison):');
    console.log(`     Title: "${motivationalMessage.title}"`);
    console.log(`     Body: "${motivationalMessage.body}"`);
    
    // 6. Test probability system
    console.log('\n5. Message Mix Probability Test:');
    let weatherShownMorning = 0;
    let weatherShownAfternoon = 0;
    const iterations = 1000;
    
    for (let i = 0; i < iterations; i++) {
      if (shouldShowWeatherMessage(weatherData, false)) weatherShownMorning++;
      if (shouldShowWeatherMessage(weatherData, true)) weatherShownAfternoon++;
    }
    
    const morningProb = (weatherShownMorning / iterations) * 100;
    const afternoonProb = (weatherShownAfternoon / iterations) * 100;
    
    console.log(`   Morning messages: ~${morningProb.toFixed(0)}% weather, ~${(100 - morningProb).toFixed(0)}% motivational`);
    console.log(`   Afternoon messages: ~${afternoonProb.toFixed(0)}% weather, ~${(100 - afternoonProb).toFixed(0)}% motivational`);
    
    // 7. Show expected behavior
    console.log('\n6. Expected User Experience:');
    console.log('   When weather notifications are ON:');
    console.log('   - Users receive a MIX of weather and motivational messages');
    console.log('   - Weather messages appear more often in extreme conditions');
    console.log('   - Perfect weather days trigger outdoor activity suggestions');
    console.log('   - Normal days mostly show standard motivational messages');
    
    console.log('\n✅ All weather notification tests passed!');
    console.log('\n💡 Tip: Weather messages refresh every 3 hours from cache');
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Check .env file has OPENWEATHER_MAP_API_KEY');
    console.log('2. Ensure location permissions are granted');
    console.log('3. Check internet connection for API calls');
  }
}

// Export for use in app
export async function runWeatherTest() {
  return testWeatherNotifications();
}

// Run if executed directly
if (require.main === module) {
  testWeatherNotifications();
}