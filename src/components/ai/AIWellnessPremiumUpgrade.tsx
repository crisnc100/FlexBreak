import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../services/storageService';
import { AIWellnessTimePreference } from './AIWellnessTimePreference';
import { scheduleAIWellnessV2 } from '../../services/ai/scheduling/notificationScheduler';
import { AINameSettings } from '../settings/ai/AINameSettings';

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
  const [aiEnabled, setAiEnabled] = useState(false);
  const [showEnablePrompt, setShowEnablePrompt] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [needsName, setNeedsName] = useState(false);

  useEffect(() => {
    if (visible) {
      checkAIStatus();
      loadUserName();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const checkAIStatus = async () => {
    try {
      if (KEYS.AI_WELLNESS.ENABLED) {
        const enabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED) === 'true';
        setAiEnabled(enabled);
        // If AI is not enabled, show the enable prompt first
        setShowEnablePrompt(!enabled);
      }
    } catch (error) {
      console.error('Error checking AI status:', error);
    }
  };

  const loadUserName = async () => {
    try {
      if (KEYS.AI_WELLNESS.USER_NAME) {
        const name = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
        setUserName(name || '');
        setNeedsName(!name || name.trim().length === 0);
      }
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

  const handleEnableAI = async () => {
    // Enable AI Wellness
    await AsyncStorage.setItem(KEYS.AI_WELLNESS.ENABLED, 'true');
    setAiEnabled(true);
    setShowEnablePrompt(false);
    
    // Don't schedule notifications yet - wait until setup is complete
  };

  const handleContinue = () => {
    // Check if we need to collect name first
    if (needsName) {
      setShowNamePrompt(true);
    } else {
      setShowTimePreference(true);
    }
  };

  const handleNameSet = async () => {
    // Reload the name after it's been set
    await loadUserName();
    setShowNamePrompt(false);
    setShowTimePreference(true);
  };

  const handleTimePreferenceSet = async (timePreference: string) => {
    // Now schedule with the welcome notification and new premium settings
    await scheduleAIWellnessV2('upgrade');
    onComplete();
  };

  const handleSkip = async () => {
    if (!aiEnabled) {
      // If they skip without enabling AI, just close
      onComplete();
      return;
    }
    // User chose to keep random times - schedule with premium upgrade
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
          {showEnablePrompt ? (
            <>
              {/* Enable AI Prompt */}
              <View style={[styles.header, { backgroundColor: theme.accent + '10' }]}>
                <Text style={styles.celebrationEmoji}>🎉</Text>
                <Text style={[styles.celebrationText, { color: theme.accent }]}>
                  Welcome to Premium!
                </Text>
              </View>

              <View style={styles.contentContainer}>
                <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                  <Text style={styles.iconEmoji}>🤖</Text>
                </View>

                <Text style={[styles.title, { color: theme.text }]}>
                  Unlock Your AI Flex Coach
                </Text>

                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  As a premium member, you get daily AI wellness check-ins to help you stay healthy and motivated!
                </Text>

                {/* Benefits */}
                <View style={styles.featureContainer}>
                  <View style={styles.featureItem}>
                    <View style={[styles.featureBadge, { backgroundColor: theme.cardBackground }]}>
                      <Text style={styles.featureEmoji}>💬</Text>
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={[styles.featureTitle, { color: theme.text }]}>
                        Daily Check-ins
                      </Text>
                      <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                        Personalized wellness advice every day
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={[styles.featureBadge, { backgroundColor: theme.cardBackground }]}>
                      <Text style={styles.featureEmoji}>🌐</Text>
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={[styles.featureTitle, { color: theme.text }]}>
                        Multilingual Support
                      </Text>
                      <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                        Chat in English, Spanish, or Mandarin
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={[styles.featureBadge, { backgroundColor: theme.cardBackground }]}>
                      <Text style={styles.featureEmoji}>🎯</Text>
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={[styles.featureTitle, { color: theme.text }]}>
                        Smart Reminders
                      </Text>
                      <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                        Remembers your wellness patterns
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.accent }]}
                  onPress={handleEnableAI}
                >
                  <Text style={styles.primaryButtonText}>
                    Enable AI Flex Coach
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleSkip}
                >
                  <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
                    Maybe later
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : showNamePrompt ? (
            <>
              {/* Name Collection */}
              <View style={[styles.header, { backgroundColor: theme.accent + '10' }]}>
                <Text style={styles.celebrationEmoji}>👋</Text>
                <Text style={[styles.celebrationText, { color: theme.accent }]}>
                  Let's Get Personal
                </Text>
              </View>

              <View style={styles.contentContainer}>
                <Text style={[styles.title, { color: theme.text }]}>
                  What should I call you?
                </Text>

                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  Adding your name helps me provide more personalized wellness advice
                </Text>

                <View style={styles.nameInputContainer}>
                  <AINameSettings 
                    visible={true} 
                    onNameSet={handleNameSet}
                    showAsInput={true}
                  />
                </View>
              </View>
            </>
          ) : !showTimePreference ? (
            <>
              {/* Celebration Header */}
              <View style={[styles.header, { backgroundColor: theme.accent + '10' }]}>
                <Text style={styles.celebrationEmoji}>✨</Text>
                <Text style={[styles.celebrationText, { color: theme.accent }]}>
                  AI Flex Coach Activated!
                </Text>
              </View>

              {/* Content */}
              <View style={styles.contentContainer}>
                <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                  <Text style={styles.iconEmoji}>🤖</Text>
                </View>

                <Text style={[styles.title, { color: theme.text }]}>
                  {userName ? `${userName}, your AI coach is ready!` : 'Your AI coach is ready!'}
                </Text>

                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  You now have daily wellness check-ins to keep you healthy and motivated
                </Text>

                {/* New Features */}
                <View style={styles.featureContainer}>
                  <View style={styles.featureItem}>
                    <View style={[styles.featureBadge, { backgroundColor: theme.cardBackground }]}>
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
                    <View style={[styles.featureBadge, { backgroundColor: theme.cardBackground }]}>
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
                    <View style={[styles.featureBadge, { backgroundColor: theme.cardBackground }]}>
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
            <View style={{ flex: 1 }}>
              {/* Header with Back Button */}
              <View style={[styles.timePreferenceHeader, { backgroundColor: theme.cardBackground }]}>
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
                style={styles.timePreferenceContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.timePreferenceContent}
              >
                <AIWellnessTimePreference
                  onSelect={handleTimePreferenceSet}
                  currentPreference="random"
                />
              </ScrollView>
            </View>
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
    height: '80%',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
    overflow: 'hidden',
    display: 'flex',
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
  timePreferenceContainer: {
    flex: 1,
  },
  timePreferenceContent: {
    paddingBottom: 20,
  },
  nameInputContainer: {
    width: '100%',
    marginTop: 20,
  },
});