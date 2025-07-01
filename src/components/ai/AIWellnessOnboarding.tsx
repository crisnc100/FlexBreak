import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../services/storageService';
import { scheduleAIWellnessV2 } from '../../services/ai/scheduling/notificationScheduler';
import { AIWellnessTimePreference } from './AIWellnessTimePreference';
import { usePremium } from '../../context/PremiumContext';

interface AIWellnessOnboardingProps {
  visible: boolean;
  onComplete: () => void;
  onDismiss: () => void;
}

type OnboardingStep = 'intro' | 'name' | 'schedule' | 'complete';

export const AIWellnessOnboarding: React.FC<AIWellnessOnboardingProps> = ({
  visible,
  onComplete,
  onDismiss
}) => {
  const { theme } = useTheme();
  const { isPremium } = usePremium();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('intro');
  const [userName, setUserName] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible, currentStep]);

  const handleIntroNext = () => {
    setCurrentStep('name');
  };

  const handleNameNext = async () => {
    if (userName.trim()) {
      await AsyncStorage.setItem(KEYS.AI_WELLNESS.USER_NAME, userName.trim());
    }
    
    if (isPremium) {
      setCurrentStep('schedule');
    } else {
      // Free users skip schedule selection
      await enableAIWellness();
    }
  };

  const handleScheduleComplete = async (timePreference: string) => {
    await AsyncStorage.setItem(KEYS.AI_WELLNESS.TIME_PREFERENCE, timePreference);
    await enableAIWellness();
  };

  const enableAIWellness = async () => {
    setCurrentStep('complete');
    
    // Enable AI wellness
    await AsyncStorage.setItem(KEYS.AI_WELLNESS.ENABLED, 'true');
    await scheduleAIWellnessV2('enable');
    
    // Show completion for 2 seconds then close
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem('@ai_wellness_onboarding_dismissed', 'true');
    onDismiss();
  };

  const renderStepIndicator = () => {
    const steps = isPremium ? ['intro', 'name', 'schedule'] : ['intro', 'name'];
    const currentIndex = steps.indexOf(currentStep === 'complete' ? steps[steps.length - 1] : currentStep);
    
    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <View
            key={step}
            style={[
              styles.stepDot,
              { 
                backgroundColor: index <= currentIndex ? theme.accent : theme.border,
                opacity: index <= currentIndex ? 1 : 0.3
              }
            ]}
          />
        ))}
      </View>
    );
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'intro':
        return (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.contentContainer}>
              <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                <Text style={styles.iconEmoji}>🤖</Text>
              </View>
              
              <Text style={[styles.title, { color: theme.text }]}>
                Meet Your AI Flex Coach!
              </Text>
              
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                I'm here to check in on your wellness and suggest personalized stretches
              </Text>
              
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Ionicons name="chatbubbles-outline" size={20} color={theme.accent} />
                  <Text style={[styles.featureText, { color: theme.text }]}>
                    Chat about how you're feeling
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="fitness-outline" size={20} color={theme.accent} />
                  <Text style={[styles.featureText, { color: theme.text }]}>
                    Get exercises that actually help
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="trending-up-outline" size={20} color={theme.accent} />
                  <Text style={[styles.featureText, { color: theme.text }]}>
                    Build healthy movement habits
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.accent }]}
                onPress={handleIntroNext}
              >
                <Text style={styles.primaryButtonText}>Set Up Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleDismiss}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
                  Maybe Later
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        );
        
      case 'name':
        return (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.contentContainer}>
              <Text style={[styles.title, { color: theme.text }]}>
                Let's get started! 🚀
              </Text>
              
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                What should I call you?
              </Text>
              
              <TextInput
                style={[styles.nameInput, { 
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text
                }]}
                placeholder="Your first name (optional)"
                placeholderTextColor={theme.textSecondary}
                value={userName}
                onChangeText={setUserName}
                autoFocus
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={handleNameNext}
              />
              
              <View style={styles.checkboxContainer}>
                <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
                <Text style={[styles.checkboxText, { color: theme.text }]}>
                  Enable wellness check-ins
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.accent }]}
                onPress={handleNameNext}
              >
                <Text style={styles.primaryButtonText}>
                  Continue {!isPremium && '→'}
                </Text>
              </TouchableOpacity>
              
              {!isPremium && (
                <Text style={[styles.freeUserNote, { color: theme.textSecondary }]}>
                  Free users get check-ins on Wednesdays
                </Text>
              )}
            </View>
          </Animated.View>
        );
        
      case 'schedule':
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            <AIWellnessTimePreference
              onSelect={handleScheduleComplete}
              currentPreference="random"
            />
          </Animated.View>
        );
        
      case 'complete':
        return (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={[styles.contentContainer, styles.completeContainer]}>
              <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                <Text style={styles.iconEmoji}>🎉</Text>
              </View>
              
              <Text style={[styles.title, { color: theme.text }]}>
                Perfect! Let's test it out
              </Text>
              
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                I'll send you a welcome message now.{'\n'}
                Look for the notification!
              </Text>
              
              <View style={styles.pulseContainer}>
                <Animated.View style={[styles.pulseCircle, { backgroundColor: theme.accent }]} />
              </View>
            </View>
          </Animated.View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleDismiss}
        />
        
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          {currentStep !== 'complete' && renderStepIndicator()}
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderContent()}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  featureList: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  featureText: {
    fontSize: 15,
    marginLeft: 12,
    flex: 1,
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
    fontSize: 15,
  },
  nameInput: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxText: {
    fontSize: 15,
    marginLeft: 8,
  },
  freeUserNote: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
  },
  completeContainer: {
    paddingVertical: 20,
  },
  pulseContainer: {
    marginTop: 24,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});