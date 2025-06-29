import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../services/storageService';
import { AIWellnessTimePreference } from './AIWellnessTimePreference';
import { scheduleAIWellnessV2 } from '../../services/ai/aiWellnessSchedulerV2';

interface AIWellnessPremiumUpgradeProps {
  visible: boolean;
  onComplete: () => void;
}

export const AIWellnessPremiumUpgrade: React.FC<AIWellnessPremiumUpgradeProps> = ({
  visible,
  onComplete
}) => {
  const { theme } = useTheme();
  const [showTimePreference, setShowTimePreference] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    if (visible) {
      loadUserName();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const loadUserName = async () => {
    const name = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
    setUserName(name || 'there');
  };

  const handleContinue = () => {
    setShowTimePreference(true);
  };

  const handleTimePreferenceSet = async (timePreference: string) => {
    // Re-schedule with new premium settings
    await scheduleAIWellnessV2('upgrade');
    onComplete();
  };

  const handleSkip = async () => {
    // Still need to reschedule for premium even if keeping random times
    await scheduleAIWellnessV2('upgrade');
    onComplete();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.content, 
            { 
              backgroundColor: theme.background,
              opacity: fadeAnim 
            }
          ]}
        >
          {!showTimePreference ? (
            <>
              {/* Celebration Header */}
              <View style={[styles.header, { backgroundColor: theme.accent + '10' }]}>
                <Text style={styles.celebrationEmoji}>🎉</Text>
                <Text style={[styles.celebrationText, { color: theme.accent }]}>
                  Welcome to Premium!
                </Text>
              </View>

              {/* Content */}
              <View style={styles.contentContainer}>
                <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                  <Text style={styles.iconEmoji}>🤖</Text>
                </View>

                <Text style={[styles.title, { color: theme.text }]}>
                  {userName}, your AI Flex Coach just got better!
                </Text>

                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  You now have daily wellness check-ins instead of just Wednesdays
                </Text>

                {/* New Features */}
                <View style={styles.featureContainer}>
                  <View style={styles.featureItem}>
                    <View style={[styles.featureBadge, { backgroundColor: theme.surface }]}>
                      <Text style={styles.featureEmoji}>📅</Text>
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={[styles.featureTitle, { color: theme.text }]}>
                        Daily Check-ins
                      </Text>
                      <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                        Chat with me every day, not just Wednesdays
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={[styles.featureBadge, { backgroundColor: theme.surface }]}>
                      <Text style={styles.featureEmoji}>⏰</Text>
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={[styles.featureTitle, { color: theme.text }]}>
                        Choose Your Time
                      </Text>
                      <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                        Pick when I should check in with you
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={[styles.featureBadge, { backgroundColor: theme.surface }]}>
                      <Text style={styles.featureEmoji}>💬</Text>
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={[styles.featureTitle, { color: theme.text }]}>
                        15 Daily Messages
                      </Text>
                      <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                        More conversations for better support
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.accent }]}
                  onPress={handleContinue}
                >
                  <Text style={styles.primaryButtonText}>
                    Set My Check-in Time
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleSkip}
                >
                  <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
                    Keep random times (recommended)
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Header with Back Button */}
              <View style={[styles.timePreferenceHeader, { backgroundColor: theme.surface }]}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setShowTimePreference(false)}
                >
                  <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.timePreferenceTitle, { color: theme.text }]}>
                  Choose Your Schedule
                </Text>
                <View style={{ width: 40 }} />
              </View>
              
              {/* Time Preference Component */}
              <ScrollView 
                showsVerticalScrollIndicator={false}
                style={styles.timePreferenceScroll}
                contentContainerStyle={styles.timePreferenceContent}
              >
                <AIWellnessTimePreference
                  onSelect={handleTimePreferenceSet}
                  currentPreference="random"
                />
              </ScrollView>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  header: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  celebrationEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  celebrationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 21,
  },
  featureContainer: {
    width: '100%',
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
  },
  timePreferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  timePreferenceTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 8,
  },
  timePreferenceScroll: {
    flex: 1,
  },
  timePreferenceContent: {
    paddingBottom: 20,
  },
});