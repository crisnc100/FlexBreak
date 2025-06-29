import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

/**
 * Preview component showing what the home screen widget will look like
 * Note: Actual widget implementation requires native code
 */
export const AIWellnessWidgetPreview: React.FC = () => {
  const { theme } = useTheme();
  const userName = 'Sarah'; // Example name
  
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Home Screen Widget Preview
      </Text>
      
      {/* iOS Widget Preview */}
      <View style={styles.previewContainer}>
        <Text style={[styles.platformLabel, { color: theme.textSecondary }]}>
          iOS Widget (Small)
        </Text>
        <View style={[styles.widget, styles.iosWidget, { backgroundColor: theme.surface }]}>
          <View style={styles.widgetHeader}>
            <Text style={[styles.widgetTime, { color: theme.textSecondary }]}>2:30 PM</Text>
            <Text style={styles.widgetEmoji}>🤖</Text>
          </View>
          <Text style={[styles.widgetGreeting, { color: theme.text }]}>
            Hi {userName}! 👋
          </Text>
          <Text style={[styles.widgetQuestion, { color: theme.text }]}>
            How's your back today?
          </Text>
          <View style={styles.quickResponses}>
            <TouchableOpacity style={[styles.quickButton, { backgroundColor: theme.accent + '20' }]}>
              <Text style={styles.quickButtonEmoji}>😊</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickButton, { backgroundColor: theme.accent + '20' }]}>
              <Text style={styles.quickButtonEmoji}>😓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickButton, { backgroundColor: theme.accent + '20' }]}>
              <Text style={styles.quickButtonEmoji}>💬</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* iOS Widget Medium */}
      <View style={styles.previewContainer}>
        <Text style={[styles.platformLabel, { color: theme.textSecondary }]}>
          iOS Widget (Medium)
        </Text>
        <View style={[styles.widget, styles.iosWidgetMedium, { backgroundColor: theme.surface }]}>
          <View style={styles.widgetRow}>
            <View style={styles.widgetLeft}>
              <Text style={[styles.widgetGreeting, { color: theme.text }]}>
                Good afternoon, {userName}!
              </Text>
              <Text style={[styles.widgetQuestion, { color: theme.text }]}>
                Time for your wellness check-in
              </Text>
              <Text style={[styles.widgetStats, { color: theme.textSecondary }]}>
                Last check-in: 2 days ago
              </Text>
            </View>
            <View style={styles.widgetRight}>
              <Text style={styles.widgetLargeEmoji}>🤖</Text>
              <Text style={[styles.widgetStreak, { color: theme.accent }]}>
                5 day streak! 🔥
              </Text>
            </View>
          </View>
          <View style={styles.widgetActions}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.accent }]}>
              <Ionicons name="chatbubble" size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
              <Ionicons name="mic" size={16} color={theme.text} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>Voice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Android Widget */}
      <View style={styles.previewContainer}>
        <Text style={[styles.platformLabel, { color: theme.textSecondary }]}>
          Android Widget
        </Text>
        <View style={[styles.widget, styles.androidWidget, { backgroundColor: theme.surface }]}>
          <View style={styles.androidHeader}>
            <Text style={[styles.androidTitle, { color: theme.text }]}>
              AI Flex Coach
            </Text>
            <Text style={styles.widgetEmoji}>💪</Text>
          </View>
          <Text style={[styles.widgetQuestion, { color: theme.text, fontSize: 14 }]}>
            {userName}, how are you feeling?
          </Text>
          <View style={styles.androidButtons}>
            <TouchableOpacity style={[styles.androidButton, { backgroundColor: theme.accent + '20' }]}>
              <Text style={[styles.androidButtonText, { color: theme.accent }]}>😊 Great</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.androidButton, { backgroundColor: theme.accent + '20' }]}>
              <Text style={[styles.androidButtonText, { color: theme.accent }]}>😓 Tired</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.androidButton, { backgroundColor: theme.accent + '20' }]}>
              <Text style={[styles.androidButtonText, { color: theme.accent }]}>🤕 Sore</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Smart Home Integration Preview */}
      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 32 }]}>
        Smart Home Integration
      </Text>

      {/* Siri Shortcuts */}
      <View style={styles.previewContainer}>
        <Text style={[styles.platformLabel, { color: theme.textSecondary }]}>
          Siri Shortcuts
        </Text>
        <View style={[styles.smartHomeCard, { backgroundColor: theme.surface }]}>
          <View style={styles.siriIcon}>
            <Ionicons name="mic-circle" size={40} color="#007AFF" />
          </View>
          <View style={styles.siriContent}>
            <Text style={[styles.siriCommand, { color: theme.text }]}>
              "Hey Siri, check in with FlexBreak"
            </Text>
            <Text style={[styles.siriResponse, { color: theme.textSecondary }]}>
              Siri: "How are you feeling today?"
            </Text>
            <Text style={[styles.userResponse, { color: theme.accent }]}>
              You: "My back is sore"
            </Text>
            <Text style={[styles.siriResponse, { color: theme.textSecondary }]}>
              Siri: "Try the cat-cow stretch for 30 seconds..."
            </Text>
          </View>
        </View>
      </View>

      {/* Google Assistant */}
      <View style={styles.previewContainer}>
        <Text style={[styles.platformLabel, { color: theme.textSecondary }]}>
          Google Assistant
        </Text>
        <View style={[styles.smartHomeCard, { backgroundColor: theme.surface }]}>
          <View style={styles.googleIcon}>
            <View style={[styles.googleDot, { backgroundColor: '#4285F4' }]} />
            <View style={[styles.googleDot, { backgroundColor: '#EA4335' }]} />
            <View style={[styles.googleDot, { backgroundColor: '#FBBC04' }]} />
            <View style={[styles.googleDot, { backgroundColor: '#34A853' }]} />
          </View>
          <View style={styles.siriContent}>
            <Text style={[styles.siriCommand, { color: theme.text }]}>
              "OK Google, tell FlexBreak I'm stressed"
            </Text>
            <Text style={[styles.siriResponse, { color: theme.textSecondary }]}>
              Opening FlexBreak with your message...
            </Text>
          </View>
        </View>
      </View>

      {/* Implementation Note */}
      <View style={[styles.noteCard, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '30' }]}>
        <Ionicons name="information-circle" size={20} color={theme.accent} />
        <Text style={[styles.noteText, { color: theme.text }]}>
          Widgets and voice assistants will be available in a future update
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  previewContainer: {
    marginBottom: 24,
  },
  platformLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  widget: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iosWidget: {
    width: 160,
    height: 160,
  },
  iosWidgetMedium: {
    width: 320,
    height: 160,
  },
  androidWidget: {
    width: 320,
    minHeight: 120,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  widgetTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  widgetEmoji: {
    fontSize: 20,
  },
  widgetGreeting: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  widgetQuestion: {
    fontSize: 12,
    marginBottom: 12,
  },
  quickResponses: {
    flexDirection: 'row',
    gap: 8,
  },
  quickButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickButtonEmoji: {
    fontSize: 18,
  },
  widgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  widgetLeft: {
    flex: 1,
  },
  widgetRight: {
    alignItems: 'center',
  },
  widgetStats: {
    fontSize: 11,
    marginTop: 4,
  },
  widgetLargeEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  widgetStreak: {
    fontSize: 11,
    fontWeight: '600',
  },
  widgetActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFF',
  },
  androidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  androidTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  androidButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  androidButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  androidButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  smartHomeCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  siriIcon: {
    marginTop: 4,
  },
  googleIcon: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 24,
    height: 24,
    gap: 2,
    marginTop: 8,
  },
  googleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  siriContent: {
    flex: 1,
  },
  siriCommand: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  siriResponse: {
    fontSize: 13,
    marginBottom: 4,
  },
  userResponse: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 24,
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
  },
});