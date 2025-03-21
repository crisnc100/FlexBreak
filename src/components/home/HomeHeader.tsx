import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { tw } from '../../utils/tw';

interface HomeHeaderProps {
  title?: string;
  subtitle?: string;
}

/**
 * Header component for the home screen
 */
const HomeHeader: React.FC<HomeHeaderProps> = ({
  title = 'FlexBreak',
  subtitle = 'Move Better, Work Better'
}) => {
  const { theme, isDark } = useTheme();
  
  return (
    <View style={tw('mb-5 pt-1')}>
      <View style={tw('items-center')}>
        <Text style={[tw('text-2xl font-bold text-center'), { color: theme.text }]}>
          {title}
        </Text>
        <Text style={[tw('text-sm text-center'), { color: theme.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
};

export default HomeHeader; 