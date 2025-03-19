import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { tw } from '../../utils/tw';

interface DailyTipProps {
  tip: string;
  iconName?: string;
  iconColor?: string;
}

/**
 * Daily tip component that displays a random tip with an icon
 */
const DailyTip: React.FC<DailyTipProps> = ({
  tip,
  iconName = 'bulb-outline',
  iconColor = '#FF9800'
}) => {
  const { theme, isDark } = useTheme();
  
  return (
    <View style={[
      tw('rounded-lg p-3 mb-4 flex-row items-center'),
      { backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5' }
    ]}>
      <Ionicons name={iconName as any} size={20} color={iconColor} style={tw('mr-2')} />
      <Text style={[tw('text-base flex-1'), { color: theme.text }]}>
        {tip}
      </Text>
    </View>
  );
};

export default DailyTip; 