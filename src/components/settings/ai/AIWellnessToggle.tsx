import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { usePremium } from '../../../context/PremiumContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../../services/storageService';
import { scheduleAICheckIns, cancelAICheckIns } from '../../../services/ai/aiWellnessScheduler';
import { Toast } from 'react-native-toast-notifications';

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
    onToggle(value);
    await AsyncStorage.setItem(KEYS.AI_WELLNESS.ENABLED, value.toString());
    
    if (value) {
      await scheduleAICheckIns(isPremium);
      Toast.show(
        `AI Wellness Coach enabled! ${isPremium ? 'Daily check-ins scheduled.' : 'Check-ins scheduled for Wed & Fri.'}`, 
        {
          duration: 3000,
          placement: 'top',
        }
      );
    } else {
      await cancelAICheckIns();
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
            AI Wellness Coach
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
            : 'Chat with AI coach (Wed & Fri for free users)'}
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