import { WeatherData, getWeatherEmoji } from './weatherService';

// Weather message template interface
interface WeatherMessage {
  title: string;
  body: string;
}

/**
 * Generate weather-based motivational messages
 */
export function generateWeatherMessage(weather: WeatherData): WeatherMessage {
  const emoji = getWeatherEmoji(weather.condition);
  const temp = weather.temp;
  // const feelsLike = weather.feelsLike; // Reserved for future use
  
  // Extreme cold messages
  if (temp < 32) {
    const messages: WeatherMessage[] = [
      {
        title: `${emoji} Brrr! ${temp}°F outside`,
        body: "Stay warm with indoor stretches that boost circulation!"
      },
      {
        title: `❄️ Freezing ${temp}°F day`,
        body: "Perfect time for warming desk exercises. Your body will thank you!"
      },
      {
        title: `🥶 Cold alert: ${temp}°F`,
        body: "Combat the chill with movement breaks every hour!"
      }
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Extreme heat messages
  if (temp > 90) {
    const messages: WeatherMessage[] = [
      {
        title: `${emoji} Hot day at ${temp}°F`,
        body: "Stay cool with gentle indoor stretches. Remember to hydrate!"
      },
      {
        title: `🌡️ ${temp}°F heat warning`,
        body: "Take cooling breaks in AC. Light stretches prevent heat fatigue!"
      },
      {
        title: `🔥 Scorching ${temp}°F`,
        body: "Beat the heat with mindful breathing and gentle movements!"
      }
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Rain messages
  if (weather.condition === 'Rain' || weather.condition === 'Drizzle') {
    const messages: WeatherMessage[] = [
      {
        title: `${emoji} Rainy day vibes`,
        body: "Indoor stretches are perfect for boosting your rainy day mood!"
      },
      {
        title: `🌧️ ${temp}°F and rainy`,
        body: "Let the rain inspire calm stretching and deep breathing!"
      },
      {
        title: `☔ Wet weather wellness`,
        body: "Rainy days = cozy stretch sessions. Take a mindful break!"
      }
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Perfect weather messages
  if (temp >= 65 && temp <= 75 && weather.condition === 'Clear') {
    const messages: WeatherMessage[] = [
      {
        title: `${emoji} Perfect ${temp}°F day!`,
        body: "Amazing weather for a walking meeting or outdoor stretch!"
      },
      {
        title: `🌟 Beautiful ${temp}°F outside`,
        body: "Take your break outdoors! Fresh air + movement = productivity!"
      },
      {
        title: `☀️ Gorgeous ${temp}°F weather`,
        body: "Nature's calling! Try your stretches outside today!"
      }
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Cloudy/overcast messages
  if (weather.condition === 'Clouds') {
    const messages: WeatherMessage[] = [
      {
        title: `${emoji} ${temp}°F and cloudy`,
        body: "Cloudy days are perfect for energizing movement breaks!"
      },
      {
        title: `☁️ Overcast at ${temp}°F`,
        body: "Beat the gray with stretches that boost your energy!"
      },
      {
        title: `🌫️ ${temp}°F cloud cover`,
        body: "No sun? Create your own energy with a quick stretch!"
      }
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Windy messages
  if (weather.windSpeed > 20) {
    const messages: WeatherMessage[] = [
      {
        title: `💨 Windy ${temp}°F day`,
        body: "Strong winds outside? Find stability with grounding stretches!"
      },
      {
        title: `🌬️ Blustery ${temp}°F`,
        body: "Let the wind remind you to breathe deeply during stretches!"
      }
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Snow messages
  if (weather.condition === 'Snow') {
    const messages: WeatherMessage[] = [
      {
        title: `${emoji} Snowy ${temp}°F day`,
        body: "Snow day stretches keep you limber for winter activities!"
      },
      {
        title: `❄️ ${temp}°F winter wonderland`,
        body: "Warm up with gentle movements before heading into the snow!"
      }
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Humidity-based messages
  if (weather.humidity > 70) {
    const messages: WeatherMessage[] = [
      {
        title: `💧 ${temp}°F, ${weather.humidity}% humidity`,
        body: "High humidity? Take it easy with gentle, cooling stretches!"
      },
      {
        title: `🌡️ Humid ${temp}°F day`,
        body: "Sticky weather calls for slow, mindful movements!"
      }
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Default pleasant weather messages
  const messages: WeatherMessage[] = [
    {
      title: `${emoji} ${temp}°F outside`,
      body: "Great day for movement! Take a stretch break and feel the difference!"
    },
    {
      title: `🌤️ Nice ${temp}°F weather`,
      body: "Perfect conditions for your wellness break. Let's move!"
    },
    {
      title: `${emoji} ${temp}°F and ${weather.condition.toLowerCase()}`,
      body: "Whatever the weather, your body deserves a stretch break!"
    }
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get time-appropriate weather greeting
 */
export function getTimeBasedWeatherGreeting(weather: WeatherData, hour: number): string {
  if (hour >= 5 && hour < 12) {
    return `Good morning! ${weather.temp}°F to start your day.`;
  } else if (hour >= 12 && hour < 17) {
    return `Good afternoon! It's ${weather.temp}°F outside.`;
  } else if (hour >= 17 && hour < 21) {
    return `Good evening! Currently ${weather.temp}°F.`;
  } else {
    return `It's ${weather.temp}°F right now.`;
  }
}