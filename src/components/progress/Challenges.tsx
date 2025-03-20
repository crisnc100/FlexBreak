import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ChallengeList } from './ChallengeList';
import { useTheme } from '../../context/ThemeContext';

/**
 * Challenges component that displays the user's active challenges
 * This is a wrapper around the ChallengeList component
 */
const Challenges = ({ isPremium = false }) => {
  const { theme, isDark } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#FAFAFA' }]}>
      <ChallengeList isDark={isDark} theme={theme} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  }
});

export default Challenges; 