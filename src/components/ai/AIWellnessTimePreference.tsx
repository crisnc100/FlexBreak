import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../services/storageService';

interface TimeOption {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  recommended?: boolean;
}

const TIME_OPTIONS: TimeOption[] = [
  {
    id: 'random',
    icon: '🎲',
    title: 'Surprise me daily!',
    subtitle: 'Random time between 11am-4pm each day',
    recommended: true
  },
  {
    id: 'morning',
    icon: '🌅',
    title: 'Morning Boost',
    subtitle: 'Between 9-11 AM daily'
  },
  {
    id: 'midday',
    icon: '☀️',
    title: 'Lunch Break',
    subtitle: 'Between 12-2 PM daily'
  },
  {
    id: 'afternoon',
    icon: '🌆',
    title: 'Afternoon Check',
    subtitle: 'Between 3-5 PM daily'
  },
  {
    id: 'evening',
    icon: '🌙',
    title: 'Evening Wind-down',
    subtitle: 'Between 6-8 PM daily'
  }
];

interface AIWellnessTimePreferenceProps {
  onSelect: (preference: string) => void;
  currentPreference?: string;
}

export const AIWellnessTimePreference: React.FC<AIWellnessTimePreferenceProps> = ({ 
  onSelect, 
  currentPreference = 'random' 
}) => {
  const { theme } = useTheme();
  const [selected, setSelected] = useState(currentPreference);

  const handleSelect = async (optionId: string) => {
    setSelected(optionId);
    await AsyncStorage.setItem(KEYS.AI_WELLNESS.TIME_PREFERENCE, optionId);
    onSelect(optionId);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>
        When should I check in with you? ⏰
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        As a premium member, you'll get daily check-ins!
      </Text>

      <View style={styles.optionsContainer}>
        {TIME_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.option,
              { 
                backgroundColor: theme.background,
                borderColor: selected === option.id ? theme.accent : theme.border,
                borderWidth: selected === option.id ? 2 : 1
              }
            ]}
            onPress={() => handleSelect(option.id)}
            activeOpacity={0.7}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <View style={styles.optionTextContainer}>
                <View style={styles.titleRow}>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>
                    {option.title}
                  </Text>
                  {option.recommended && (
                    <View style={[styles.recommendedBadge, { backgroundColor: theme.accent + '20' }]}>
                      <Text style={[styles.recommendedText, { color: theme.accent }]}>
                        Recommended
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                  {option.subtitle}
                </Text>
              </View>
              {selected === option.id && (
                <Ionicons name="checkmark-circle" size={24} color={theme.accent} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.note, { color: theme.textSecondary }]}>
        💡 Random times prevent notification fatigue and feel more natural throughout your week
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  optionsContainer: {
    marginTop: 20,
  },
  option: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});