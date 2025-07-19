# Siri Shortcuts Setup for FlexBreak

## Overview
FlexBreak supports Siri Shortcuts to quickly open the AI Flex Coach using voice commands. This feature allows users to say "Hey Siri, open Flex Coach" to instantly access the AI wellness chat.

## Access Restrictions

### Premium Users
- Can use Siri Shortcuts any day of the week
- Full access to AI Flex Coach through voice commands

### Free Users
- Can only use Siri Shortcuts on Wednesdays
- First-time users get one free interaction on any day
- Limited to 3 messages per Wednesday

## Setup Instructions

### Prerequisites
1. Enable AI Wellness Coach in Settings > AI Wellness Coach
2. iOS device (Siri Shortcuts are not available on Android)

### Adding the Shortcut

#### Method 1: Through FlexBreak Settings
1. Open FlexBreak app
2. Go to Settings > AI Wellness Coach
3. Tap "Add to Siri" button
4. Follow the on-screen instructions

#### Method 2: Through iOS Settings
1. Open iOS Settings
2. Navigate to Siri & Search
3. Find "FlexBreak" in the app list
4. Tap on FlexBreak
5. Ensure "Use with Siri" is enabled
6. Tap "Add to Siri" under Shortcuts
7. Choose or create "Open Flex Coach" shortcut
8. Record your custom phrase (e.g., "Open Flex Coach", "Talk to my coach", etc.)
9. Tap "Done"

### Using the Shortcut
1. Activate Siri (Hey Siri, hold side button, etc.)
2. Say your recorded phrase
3. FlexBreak will open directly to the AI Flex Coach chat

## Technical Implementation

### Deep Link
The shortcut uses the deep link: `flexbreak-app://flexcoach`

### Access Control
- The app checks subscription status and current day before opening
- Free users will see an error message if trying to use on non-Wednesday days
- Premium status is verified through AsyncStorage

### User Activity
The shortcut is registered as:
- Activity Type: `com.cristianortega.flexbreak.openFlexCoach`
- Keywords: flex, coach, wellness, ai, chat, flexbreak
- Suggested Phrase: "Open Flex Coach"

## Troubleshooting

### Shortcut Not Appearing
1. Ensure AI Wellness Coach is enabled in app settings
2. Force quit and reopen FlexBreak
3. Check iOS Settings > Siri & Search > FlexBreak

### Shortcut Not Working
1. Verify AI Wellness Coach is enabled
2. For free users, ensure it's Wednesday
3. Check that the app has proper permissions
4. Try re-recording the Siri phrase

### Access Denied Message
- Free users: Wait until Wednesday or upgrade to premium
- All users: Enable AI Wellness Coach in settings first