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
      
      {/* iOS Widget Medium - Primary Style */}
      <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 16 }]}>
        iOS Home Screen Widget
      </Text>

      <View style={styles.previewContainer}>
        <View style={[styles.widget, styles.iosWidgetMedium, { backgroundColor: theme.cardBackground }]}>
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
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border }]}>
              <Ionicons name="mic" size={16} color={theme.text} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>Voice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Android Widget */}
      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 32, marginBottom: 16 }]}>
        Android Home Screen Widget
      </Text>
      
      <View style={styles.previewContainer}>
        <View style={[styles.widget, styles.androidWidget, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.androidHeader}>
            <View>
              <Text style={[styles.androidTitle, { color: theme.text }]}>
                AI Flex Coach
              </Text>
              <Text style={[styles.androidTime, { color: theme.textSecondary }]}>
                Last check-in: 2 hours ago
              </Text>
            </View>
            <Text style={styles.widgetEmoji}>🤖</Text>
          </View>
          
          <Text style={[styles.widgetQuestion, { color: theme.text, fontSize: 15, marginVertical: 16 }]}>
            {userName ? `Hi ${userName}! Ready for your wellness check-in?` : 'Ready for your wellness check-in?'}
          </Text>
          
          <View style={styles.androidActionButtons}>
            <TouchableOpacity style={[styles.androidActionButton, { backgroundColor: theme.accent }]}>
              <Ionicons name="chatbubble-outline" size={20} color="#FFF" />
              <Text style={styles.androidActionText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.androidActionButton, { backgroundColor: theme.accent }]}>
              <Ionicons name="mic-outline" size={20} color="#FFF" />
              <Text style={styles.androidActionText}>Voice</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.androidFooter}>
            <Text style={[styles.androidFooterText, { color: theme.textSecondary }]}>
              Tap to open FlexBreak
            </Text>
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
        <View style={[styles.smartHomeCard, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.siriIcon}>
            <Ionicons name="mic-circle" size={40} color="#007AFF" />
          </View>
          <View style={styles.siriContent}>
            <Text style={[styles.siriCommand, { color: theme.text }]}>
              "Hey Siri, start my FlexBreak wellness check"
            </Text>
            <Text style={[styles.siriResponse, { color: theme.textSecondary }]}>
              Opens FlexBreak AI Coach directly
            </Text>
            
            <View style={styles.divider} />
            
            <Text style={[styles.siriCommand, { color: theme.text }]}>
              "Hey Siri, my back hurts"
            </Text>
            <Text style={[styles.siriResponse, { color: theme.textSecondary }]}>
              FlexBreak: "I'll guide you through a 2-minute back relief routine"
            </Text>
          </View>
        </View>
      </View>

      {/* Google Assistant */}
      <View style={styles.previewContainer}>
        <Text style={[styles.platformLabel, { color: theme.textSecondary }]}>
          Google Assistant
        </Text>
        <View style={[styles.smartHomeCard, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.googleIcon}>
            <View style={[styles.googleDot, { backgroundColor: '#4285F4' }]} />
            <View style={[styles.googleDot, { backgroundColor: '#EA4335' }]} />
            <View style={[styles.googleDot, { backgroundColor: '#FBBC04' }]} />
            <View style={[styles.googleDot, { backgroundColor: '#34A853' }]} />
          </View>
          <View style={styles.siriContent}>
            <Text style={[styles.siriCommand, { color: theme.text }]}>
              "OK Google, open FlexBreak wellness coach"
            </Text>
            <Text style={[styles.siriResponse, { color: theme.textSecondary }]}>
              Launches AI Coach with voice input ready
            </Text>
            
            <View style={styles.divider} />
            
            <Text style={[styles.siriCommand, { color: theme.text }]}>
              "OK Google, I need a stress relief exercise"
            </Text>
            <Text style={[styles.siriResponse, { color: theme.textSecondary }]}>
              FlexBreak: "Starting 3-minute breathing exercise..."
            </Text>
          </View>
        </View>
      </View>

      {/* Implementation Note */}
      <View style={[styles.noteCard, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '30' }]}>
        <Ionicons name="information-circle" size={20} color={theme.accent} />
        <Text style={[styles.noteText, { color: theme.text }]}>
          Home screen widgets and voice assistant integration coming soon!
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
    minHeight: 160,
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
  androidTime: {
    fontSize: 12,
    marginTop: 2,
  },
  androidActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  androidActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  androidActionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  androidFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 12,
    alignItems: 'center',
  },
  androidFooterText: {
    fontSize: 11,
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 12,
  },
});