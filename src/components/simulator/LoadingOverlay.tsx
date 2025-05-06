import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface LoadingOverlayProps {
  isLoading: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading }) => {
  const { theme } = useTheme();

  if (!isLoading) return null;

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.accent} />
      <Text style={[styles.loadingText, { color: theme.text }]}>
        Processing simulation...
      </Text>
      <Text style={[styles.loadingSubText, { color: theme.textSecondary }]}>
        Please wait, this may take a few moments as we simulate your routine and process all related challenges and rewards.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default LoadingOverlay; 