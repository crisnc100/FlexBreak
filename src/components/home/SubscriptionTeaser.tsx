import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { tw } from '../../utils/tw';

interface SubscriptionTeaserProps {
  onPremiumPress: () => void;
  text?: string;
  buttonText?: string;
}

/**
 * Subscription teaser component that promotes premium features
 */
const SubscriptionTeaser: React.FC<SubscriptionTeaserProps> = ({
  onPremiumPress,
  text = 'Unlock Progress, Reminders & Favorites',
  buttonText = 'Go Premium'
}) => {
  const { theme, isDark } = useTheme();
  
  return (
    <View style={[
      tw('border rounded-lg p-4 mb-4 flex-row justify-between items-center'),
      { 
        backgroundColor: isDark ? theme.cardBackground : '#fff',
        borderColor: isDark ? theme.border : '#e5e5e5' 
      }
    ]}>
      <View style={tw('flex-row items-center flex-1')}>
        <Ionicons 
          name="star" 
          size={20} 
          color="#FF9800" 
          style={tw('mr-2')} 
        />
        <Text 
          style={[
            tw('text-sm flex-1'), 
            { color: theme.textSecondary }
          ]}
        >
          {text}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onPremiumPress}
        style={tw('bg-accent p-2 rounded-lg')}
      >
        <Text style={tw('text-white text-xs font-semibold')}>
          {buttonText}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default SubscriptionTeaser; 