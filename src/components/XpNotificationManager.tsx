import React from 'react';
import { View, StyleSheet } from 'react-native';

const XpNotificationManager: React.FC = () => {
  // Since XP history has been removed, this component doesn't need to do anything
  // We're keeping it as a placeholder in case we want to add notifications back later
  return (
    <View style={styles.container}>
      {/* XP notifications have been removed */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  notificationWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
  }
});

export default XpNotificationManager; 