import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeartDisplayProps {
  hearts: number;
  maxHearts?: number;
}

export const HeartDisplay: React.FC<HeartDisplayProps> = ({
  hearts,
  maxHearts = 3,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: maxHearts }, (_, index) => (
        <Ionicons
          key={index}
          name={index < hearts ? "heart" : "heart-outline"}
          size={20}
          color={index < hearts ? "#FF4444" : "#CCCCCC"}
          style={styles.heart}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  heart: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});