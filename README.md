# FlexBreak

A mobile application to help desk workers incorporate healthy stretching routines into their workday, enhance physical well-being, and maintain productivity.

## Features

- **Custom Stretching Routines**: Guided stretching routines targeting different body areas
- **Gamification System**: Level up by completing stretches and earning XP
- **Challenge System**: Daily, weekly, monthly, and special challenges to keep you motivated
- **Achievement Tracking**: Track your progress with unlockable achievements
- **Rewards**: Unlock special features as you level up

## Challenge System

The app includes a comprehensive challenge system with different categories:

- **Daily Challenges**: Quick challenges that refresh every day
- **Weekly Challenges**: More substantial challenges that reset weekly
- **Monthly Challenges**: Long-term challenges for consistent stretching
- **Special Challenges**: Unique, time-limited challenges for bonus XP

Challenges can be completed by performing stretching routines. Once completed, they can be claimed for XP rewards. Challenges have a limited redemption period, so be sure to claim them in time!

## GameEngine Optimizations

The challenge system has been optimized in the following ways:

1. **Reduced Redundancy**: Combined similar logic into helper functions to avoid code duplication
2. **Parallel Processing**: Used Promise.all for concurrent challenge updates
3. **Streamlined Functions**: Reorganized code to make functions more focused and single-purpose
4. **Early Filtering**: Added early return conditions to avoid unnecessary processing
5. **Object Reuse**: Minimized object creation in hot paths
6. **Better Categorization**: Improved type safety and organization of challenge categories
7. **Enhanced Logging**: Added meaningful logs to aid in debugging

## Development

This app is built with:

- React Native with Expo
- TypeScript for type safety
- Context API for state management
- AsyncStorage for local data persistence

## Getting Started

```sh
# Install dependencies
npm install

# Start the development server
npm run dev
```

## License

MIT
