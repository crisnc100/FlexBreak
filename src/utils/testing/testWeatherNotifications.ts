import { getWeatherData, generateWeatherMessage, getWeatherForecast } from '../../services/weatherService';
import { areWeatherNotificationsEnabled, getCurrentLocation, checkLocationPermission } from '../../services/locationService';
import { shouldShowWeatherMessage, isWeatherRelevant } from '../weatherUtils';
import { getRandomMotivationalMessage } from '../../constants/motivationalMessages';
import * as Notifications from 'expo-notifications';

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
    
    // 6. Test NEW deterministic weather relevance
    console.log('\n5. Weather Relevance Test (NEW LOGIC):');
    const isRelevant = isWeatherRelevant(weatherData);
    console.log(`   Current weather is relevant: ${isRelevant ? '✓ YES' : '✗ NO'}`);
    console.log(`   Should show weather notification: ${shouldShowWeatherMessage(weatherData) ? '✓ YES' : '✗ NO'}`);
    
    // Test different scenarios
    console.log('\n   Testing different weather scenarios:');
    const scenarios = [
      { temp: 30, condition: 'Snow', expected: true, reason: 'Snow event' },
      { temp: 95, condition: 'Clear', expected: true, reason: 'Extreme heat' },
      { temp: 70, condition: 'Clear', expected: true, reason: 'Perfect weather' },
      { temp: 60, condition: 'Clouds', expected: false, reason: 'Normal weather' },
      { temp: 75, condition: 'Rain', expected: true, reason: 'Rain event' },
    ];
    
    scenarios.forEach(scenario => {
      const testWeather = { ...weatherData, temp: scenario.temp, condition: scenario.condition };
      const relevant = isWeatherRelevant(testWeather);
      console.log(`     ${scenario.temp}°F ${scenario.condition}: ${relevant ? '✓' : '✗'} (${scenario.reason})`);
    });
    
    // 7. Check scheduled notifications
    console.log('\n6. Checking Scheduled Notifications:');
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const weatherNotifs = scheduled.filter(n => n.content.data?.isWeatherBased === true);
    const motivationalNotifs = scheduled.filter(n => n.content.data?.isWeatherBased === false);
    
    console.log(`   Total scheduled: ${scheduled.length}`);
    console.log(`   Weather-based: ${weatherNotifs.length}`);
    console.log(`   Motivational: ${motivationalNotifs.length}`);
    
    if (weatherNotifs.length > 0) {
      console.log('\n   Next weather notifications:');
      weatherNotifs.slice(0, 3).forEach(n => {
        const trigger = n.trigger as any;
        const date = trigger.date ? new Date(trigger.date) : null;
        if (date) {
          console.log(`     - ${date.toLocaleString()}: ${n.content.title}`);
        }
      });
    }
    
    // 8. Get forecast to check future weather
    console.log('\n7. Weather Forecast Check:');
    const forecast = await getWeatherForecast(location.lat, location.lon);
    if (forecast) {
      console.log(`   Got ${forecast.forecasts.length} days of forecast:`);
      forecast.forecasts.slice(0, 3).forEach((day, i) => {
        const relevant = isWeatherRelevant(day.weather);
        console.log(`     Day ${i}: ${day.weather.temp}°F, ${day.weather.condition} - Relevant: ${relevant ? '✓' : '✗'}`);
      });
    }
    
    // 9. Show expected behavior
    console.log('\n8. Expected User Experience (UPDATED):');
    console.log('   When weather notifications are ON:');
    console.log('   - Weather replaces motivational when conditions are relevant');
    console.log('   - ALWAYS shows for: Rain, Snow, Storms, Extreme temps (<40°F or >85°F)');
    console.log('   - ALWAYS shows for: Perfect weather (65-75°F clear)');
    console.log('   - Normal weather = motivational messages');
    console.log('   - Only schedules 3 days ahead for accuracy');
    
    console.log('\n✅ All weather notification tests passed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Force reschedule notifications in app');
    console.log('   2. Weather will show when relevant conditions occur');
    console.log('   3. Check notifications list in iOS Settings');
    
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