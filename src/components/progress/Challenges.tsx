import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ChallengeList } from './ChallengeList';

/**
 * Challenges component that displays the user's active challenges
 * This is a wrapper around the ChallengeList component
 */
const Challenges = ({ isPremium = false }) => {
  return (
    <View style={styles.container}>
      <ChallengeList />
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