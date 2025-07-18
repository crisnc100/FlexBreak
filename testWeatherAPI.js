// Simple weather API test that can run from command line
const axios = require('axios');

// You need to set your API key here or in environment
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_MAP_API_KEY || 'YOUR_OPENWEATHER_MAP_API_KEY';

// Test coordinates (New York City)
const TEST_LAT = 40.7128;
const TEST_LON = -74.0060;

async function testWeatherAPI() {
  console.log('=== Testing Weather API ===\n');
  
  if (OPENWEATHER_API_KEY === 'YOUR_OPENWEATHER_MAP_API_KEY') {
    console.error('❌ Please set your OpenWeatherMap API key!');
    console.log('\nOption 1: Set in this file');
    console.log('Option 2: Run with: OPENWEATHER_MAP_API_KEY=your_key node testWeatherAPI.js');
    return;
  }
  
  try {
    console.log('Fetching weather data...');
    console.log(`Coordinates: ${TEST_LAT}, ${TEST_LON} (New York City)\n`);
    
    const response = await axios.get(
      'https://api.openweathermap.org/data/2.5/weather',
      {
        params: {
          lat: TEST_LAT,
          lon: TEST_LON,
          appid: OPENWEATHER_API_KEY,
          units: 'imperial'
        },
        timeout: 5000
      }
    );
    
    const data = response.data;
    
    console.log('✅ Weather API is working!\n');
    console.log('Weather Data:');
    console.log(`  Location: ${data.name}, ${data.sys.country}`);
    console.log(`  Temperature: ${Math.round(data.main.temp)}°F`);
    console.log(`  Feels Like: ${Math.round(data.main.feels_like)}°F`);
    console.log(`  Condition: ${data.weather[0].main}`);
    console.log(`  Description: ${data.weather[0].description}`);
    console.log(`  Humidity: ${data.main.humidity}%`);
    console.log(`  Wind Speed: ${Math.round(data.wind.speed)} mph`);
    
    // Test message generation logic
    const temp = Math.round(data.main.temp);
    console.log('\nExample notification that would be sent:');
    
    if (temp < 32) {
      console.log(`  Title: "❄️ Brrr! ${temp}°F outside"`);
      console.log('  Body: "Stay warm with indoor stretches that boost circulation!"');
    } else if (temp > 90) {
      console.log(`  Title: "🌡️ Hot day at ${temp}°F"`);
      console.log('  Body: "Stay cool with gentle indoor stretches. Remember to hydrate!"');
    } else if (temp >= 65 && temp <= 75 && data.weather[0].main === 'Clear') {
      console.log(`  Title: "☀️ Perfect ${temp}°F day!"`);
      console.log('  Body: "Amazing weather for a walking meeting or outdoor stretch!"');
    } else {
      console.log(`  Title: "🌤️ ${temp}°F outside"`);
      console.log('  Body: "Great day for movement! Take a stretch break and feel the difference!"');
    }
    
  } catch (error) {
    console.error('❌ Error fetching weather data:', error.message);
    
    if (error.response && error.response.status === 401) {
      console.log('\n⚠️  Invalid API key. Please check your OpenWeatherMap API key.');
    } else if (error.code === 'ECONNABORTED') {
      console.log('\n⚠️  Request timeout. Check your internet connection.');
    } else {
      console.log('\n⚠️  Check your internet connection and API key.');
    }
  }
}

// Run the test
testWeatherAPI();