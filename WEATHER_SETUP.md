# Weather Notifications Setup

## Setting the OpenWeatherMap API Key

To enable weather-based notifications, you need to set up your OpenWeatherMap API key in Firebase Functions.

### 1. Get your API Key
1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Get your free API key (1,000 calls/day free tier)

### 2. Set the API Key in Firebase

Run this command to set your API key as an environment variable in Firebase Functions:

```bash
firebase functions:config:set openweather.api_key="YOUR_OPENWEATHER_MAP_API_KEY"
```

### 3. Deploy the Functions

After setting the config, deploy your functions:

```bash
firebase deploy --only functions
```

### 4. Verify the Setup

The weather service will use this configuration automatically:
- In production: Uses `functions.config().openweather.api_key`
- For local development: Create a `.env` file in the `functions` directory:

```
OPENWEATHER_MAP_API_KEY=your_api_key_here
```

## How Weather Notifications Work

1. **User Opt-in**: Users enable weather notifications in Settings
2. **Location Permission**: App requests location permission (only when enabled)
3. **Weather Data**: Firebase Functions fetch weather data for user locations
4. **Smart Messaging**: Messages are prioritized based on weather conditions:
   - Extreme weather (70% chance)
   - Perfect outdoor weather (50% chance)
   - Normal conditions (20% chance)
5. **Caching**: Weather data is cached for 3 hours to minimize API usage

## Privacy

- Location data is only collected when weather notifications are enabled
- Location is updated once every 24 hours
- Users can disable weather notifications at any time
- Location data is stored securely in Firebase Firestore