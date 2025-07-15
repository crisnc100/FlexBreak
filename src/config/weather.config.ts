import { OPENWEATHER_MAP_API_KEY as ENV_OPENWEATHER_MAP_API_KEY } from '@env';

export const OPENWEATHER_MAP_API_KEY = ENV_OPENWEATHER_MAP_API_KEY || 'YOUR_OPENWEATHER_MAP_API_KEY';

// Note: In production, this should be stored securely:
// 1. For React Native apps, consider using react-native-dotenv
// 2. For Expo apps, use app.config.js with environment variables
// 3. Never commit actual API keys to source control