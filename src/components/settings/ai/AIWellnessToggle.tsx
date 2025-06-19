import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { usePremium } from '../../../context/PremiumContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../../services/storageService';
import { scheduleAICheckIns, cancelAICheckIns } from '../../../services/ai/aiWellnessScheduler';
import { Toast } from 'react-native-toast-notifications';
import * as Notifications from 'expo-notifications';

// Funny goodbye messages
const goodbyeMessages = [
  {
    title: "Wait, come back! 😢",
    body: "I promise I won't suggest burpees... unless you want me to?"
  },
  {
    title: "Breaking up with me? 💔",
    body: "I'll just be here... doing stretches alone in the digital void..."
  },
  {
    title: "See you later, alligator! 🐊",
    body: "I'll miss our wellness chats. Don't forget to stretch!"
  },
  {
    title: "Going solo? 💪",
    body: "That's cool, you've got this! But I'll be here if you need me."
  },
  {
    title: "Farewell, flex friend! 👋",
    body: "May your posture be perfect and your breaks be frequent!"
  },
  {
    title: "Taking a break from me? 😅",
    body: "I get it, I can be a bit... persistent about hydration."
  }
];

const sendGoodbyeNotification = async () => {
  try {
    // Get user's name if available for personalization
    const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
    
    // Pick a random goodbye message
    const message = goodbyeMessages[Math.floor(Math.random() * goodbyeMessages.length)];
    
    // Personalize if we have a name
    const body = userName 
      ? message.body.replace('you', userName)
      : message.body;
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: message.title,
        body: body,
        data: { 
          type: 'ai_wellness_goodbye',
          isGoodbye: true
        },
      },
      trigger: {
        seconds: 1 // Send almost immediately
      }
    });
  } catch (error) {
    console.log('Error sending goodbye notification:', error);
  }
};

// Check for toggle spam (optional implementation)
const checkToggleSpam = async (): Promise<boolean> => {
  const now = Date.now();
  const lastToggleStr = await AsyncStorage.getItem('@ai_wellness_last_toggle');
  const toggleCountStr = await AsyncStorage.getItem('@ai_wellness_toggle_count');
  
  const lastToggle = lastToggleStr ? parseInt(lastToggleStr) : 0;
  const toggleCount = toggleCountStr ? parseInt(toggleCountStr) : 0;
  
  // Reset count if more than 5 minutes have passed
  if (now - lastToggle > 300000) { // 5 minutes
    await AsyncStorage.setItem('@ai_wellness_toggle_count', '1');
    await AsyncStorage.setItem('@ai_wellness_last_toggle', now.toString());
    return false;
  }
  
  // Increment count
  const newCount = toggleCount + 1;
  await AsyncStorage.setItem('@ai_wellness_toggle_count', newCount.toString());
  await AsyncStorage.setItem('@ai_wellness_last_toggle', now.toString());
  
  // If toggled more than 3 times in 5 minutes, it might be spam
  return newCount > 3;
};

interface AIWellnessToggleProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
}

export const AIWellnessToggle: React.FC<AIWellnessToggleProps> = ({ enabled, onToggle }) => {
  const { theme, isDark, isSunset } = useTheme();
  const { isPremium } = usePremium();
  const [isToggling, setIsToggling] = React.useState(false);

  const handleToggle = async (value: boolean) => {
    if (isToggling) return; // Prevent rapid toggling
    
    setIsToggling(true);
    
    // Check for toggle spam (optional - only for fun notification)
    const isSpamming = await checkToggleSpam();
    
    onToggle(value);
    await AsyncStorage.setItem(KEYS.AI_WELLNESS.ENABLED, value.toString());
    
    if (value) {
      // If user is toggle spamming, show a funny message
      if (isSpamming) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Playing with the switch? 🎮",
            body: "I'm getting dizzy! Pick a side - I'm either here to help or taking a nap! 😵",
            data: { type: 'ai_wellness_spam' },
          },
          trigger: { seconds: 1 }
        });
      }
      
      await scheduleAICheckIns(isPremium, true); // isInitialSetup = true
      Toast.show(
        `AI Wellness Coach enabled! ${isPremium ? 'Daily check-ins scheduled.' : 'Check-ins scheduled for Wednesday.'}`, 
        {
          duration: 3000,
          placement: 'top',
        }
      );
    } else {
      await cancelAICheckIns();
      
      // Clear the regular scheduled flag so it can reschedule after intro when re-enabled
      await AsyncStorage.removeItem('@ai_wellness_regular_scheduled');
      
      // Send a funny goodbye notification
      await sendGoodbyeNotification();
      
      Toast.show('AI Wellness Coach disabled', {
        duration: 2000,
        placement: 'top',
      });
    }
    
    setTimeout(() => setIsToggling(false), 1000); // Re-enable after 1 second
  };

  return (
    <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16, marginTop: 16 }]}>
      <View style={styles.settingLabelContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>
            AI Flex Coach (beta)
          </Text>
          {!isPremium && (
            <View style={[styles.premiumBadge, { marginLeft: 8 }]}>
              <Text style={styles.premiumBadgeText}>Limited</Text>
            </View>
          )}
        </View>
        <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
          {isPremium 
            ? 'Get daily personalized wellness advice via chat'
            : 'Chat with our AI Flex coach (Wed only for free users)'}
        </Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={handleToggle}
        trackColor={{ false: '#767577', true: isDark || isSunset ? theme.accent + '80' : theme.accent + '50' }}
        thumbColor={enabled ? theme.accent : '#f4f3f4'}
        ios_backgroundColor="#3e3e3e"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'column',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingLabelContainer: {
    flex: 1,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumBadgeText: {
    color: '#333',
    fontSize: 11,
    fontWeight: 'bold',
  },
});