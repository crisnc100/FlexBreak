import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SunsetThemePreviewProps {
  isDark?: boolean;
  isSunset?: boolean;
}

const SunsetThemePreview: React.FC<SunsetThemePreviewProps> = ({ isDark, isSunset }) => {
  // Theme colors based on props
  const colors = isSunset ? {
    bg: '#2D1B2E',
    cardBg: '#3D2A3F',
    text: '#FFE0D0',
    accent: '#FF8C5A',
    textSecondary: '#FFC4A3',
  } : isDark ? {
    bg: '#121212',
    cardBg: '#1E1E1E',
    text: '#FFFFFF',
    accent: '#81C784',
    textSecondary: '#AAAAAA',
  } : {
    bg: '#F5F5F5',
    cardBg: '#FFFFFF',
    text: '#333333',
    accent: '#4CAF50',
    textSecondary: '#666666',
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
        <View style={styles.header}>
          <Ionicons name="partly-sunny" size={18} color={colors.accent} />
          <Text style={[styles.title, { color: colors.text }]}>Theme Preview</Text>
        </View>
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          {isSunset ? 'Sunset Theme' : isDark ? 'Dark Mode' : 'Light Mode'}
        </Text>
        <View style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={styles.buttonText}>Button</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 130,
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    padding: 15,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  subtext: {
    fontSize: 14,
    marginBottom: 10,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default SunsetThemePreview; 