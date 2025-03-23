import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ChallengeList } from './ChallengeList';
import { useTheme } from '../../context/ThemeContext';
import { useChallengeSystem } from '../../hooks/progress/useChallengeSystem';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Challenges component that displays the user's active challenges
 * This is a wrapper around the ChallengeList component
 */
const Challenges = ({ isPremium = false }) => {
  const { theme, isDark } = useTheme();
  const { refreshChallenges } = useChallengeSystem();
  
  // CRITICAL FIX: Refresh challenges when the component mounts
  useEffect(() => {
    console.log('Challenges component mounted, refreshing data');
    refreshChallenges();
  }, [refreshChallenges]);
  
  // CRITICAL FIX: Use useFocusEffect to refresh challenges when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('Challenges screen focused, refreshing data');
      refreshChallenges();
      
      return () => {
        // This runs when screen loses focus
        console.log('Challenges screen lost focus');
      };
    }, [refreshChallenges])
  );
  
  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#FAFAFA' }]}>
      <ChallengeList 
        isDark={isDark} 
        theme={theme} 
        onRefresh={refreshChallenges} // Pass down refresh function
      />
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