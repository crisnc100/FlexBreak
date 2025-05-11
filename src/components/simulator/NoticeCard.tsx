import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const NoticeCard: React.FC = () => {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.noticeCard, { backgroundColor: isDark ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255, 193, 7, 0.1)' }]}>
      <Ionicons name="alert-circle-outline" size={22} color="#FFC107" style={styles.noticeIcon} />
      <Text style={[styles.noticeText, { color: isDark ? '#FFC107' : '#856404' }]}>
        Note: These testing screens will be removed from the app at launch. Please focus your feedback on the app's main features, not these testing tools.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  noticeCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeIcon: {
    marginRight: 12,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});

export default NoticeCard; 