import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Text,
  SafeAreaView,
  Alert,
  BackHandler,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import TestingAccessForm from './TestingAccessForm';
import TestingIntroSlides from './TestingIntroSlides';
import TestingChecklistPart1 from './TestingChecklistPart1';
import TestingFeedbackForm from './TestingFeedbackForm';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import TestingSimulatorIntro from './TestingSimulatorIntro';
import { forceNavigate } from '../../../App';

// Keys for AsyncStorage
const TESTING_ACCESS_GRANTED = 'testing_access_granted';
const TESTING_CURRENT_STAGE = 'testing_current_stage';

// Testing phases
enum TestingPhase {
  WELCOME = 'welcome',
  ACCESS = 'access',
  INTRO = 'intro',
  PART_1 = 'part1',
  SIMULATOR = 'simulator',
  FEEDBACK = 'feedback',
  COMPLETE = 'complete'
}

const TESTING_PHASE_KEY = '@flexbreak:testing_phase';
const TESTING_ACCESS_KEY = '@flexbreak:testing_access';

type TestingModalProps = {
  visible: boolean;
  onClose: () => void;
};

const TestingModal: React.FC<TestingModalProps> = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const [phase, setPhase] = useState<TestingPhase>(TestingPhase.WELCOME);
  const [hasAccess, setHasAccess] = useState(false);

  // Set up initial phase on first render
  useEffect(() => {
    const checkPhase = async () => {
      try {
        // Check if returning to specific phase
        const returnPhase = await AsyncStorage.getItem('@flexbreak:testing_return_phase');
        
        if (returnPhase) {
          console.log('Returning to testing phase:', returnPhase);
          // Clean up return phase key
          await AsyncStorage.removeItem('@flexbreak:testing_return_phase');
          
          switch (returnPhase) {
            case 'simulator':
              setPhase(TestingPhase.SIMULATOR);
              break;
            case 'feedback':
              setPhase(TestingPhase.FEEDBACK);
              break;
            default:
              // Continue checking other phases
              checkSavedPhase();
          }
        } else {
          checkSavedPhase();
        }
      } catch (error) {
        console.error('Error checking return phase:', error);
        checkSavedPhase();
      }
    };
    
    const checkSavedPhase = async () => {
      try {
        // Check if testing phase was saved
        const savedPhase = await AsyncStorage.getItem(TESTING_PHASE_KEY);
        const accessGranted = await AsyncStorage.getItem(TESTING_ACCESS_KEY);
        
        if (savedPhase) {
          switch (savedPhase) {
            case 'intro':
              setPhase(TestingPhase.INTRO);
              break;
            case 'part1':
              setPhase(TestingPhase.PART_1);
              break;
            case 'simulator':
              setPhase(TestingPhase.SIMULATOR);
              break;
            case 'feedback':
              setPhase(TestingPhase.FEEDBACK);
              break;
            case 'complete':
              setPhase(TestingPhase.COMPLETE);
              break;
            default:
              // Default to access if no valid phase saved
              setPhase(accessGranted === 'true' ? TestingPhase.INTRO : TestingPhase.ACCESS);
          }
        } else {
          // Default to welcome if no phase saved, unless already have access
          setPhase(accessGranted === 'true' ? TestingPhase.INTRO : TestingPhase.WELCOME);
        }
      } catch (error) {
        console.error('Error loading testing phase:', error);
        setPhase(TestingPhase.WELCOME);
      }
    };
    
    checkPhase();
  }, []);

  // Handle welcome screen continue
  const handleWelcomeContinue = () => {
    setPhase(TestingPhase.ACCESS);
  };

  // Save current testing phase
  useEffect(() => {
    const saveTestingPhase = async () => {
      try {
        if (hasAccess) {
          await AsyncStorage.setItem(TESTING_PHASE_KEY, phase);
        }
      } catch (error) {
        console.error('Error saving testing phase:', error);
      }
    };

    saveTestingPhase();
  }, [phase, hasAccess]);

  // Handle back button press
  useEffect(() => {
    const handleBackPress = () => {
      if (visible) {
        handleBackAction();
        return true;
      }
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, [visible, phase]);

  // Add this to check if returning from BobSimulator
  useEffect(() => {
    if (visible && hasAccess) {
      // If we're returning from BobSimulator, check if we need to restore phase
      const checkReturnFromSimulator = async () => {
        try {
          const returnPhase = await AsyncStorage.getItem('@flexbreak:testing_return_phase');
          if (returnPhase) {
            // Set the phase back to what it was
            setPhase(returnPhase as TestingPhase);
            // Clear the flag so we don't reuse it
            await AsyncStorage.removeItem('@flexbreak:testing_return_phase');
            console.log('[TestingModal] Restored phase from BobSimulator return:', returnPhase);
          }
        } catch (error) {
          console.error('Error checking return from simulator:', error);
        }
      };
      
      checkReturnFromSimulator();
    }
  }, [visible, hasAccess]);

  const handleBackAction = () => {
    if (phase === TestingPhase.ACCESS) {
      onClose();
    } else if (phase === TestingPhase.INTRO) {
      confirmExit();
    } else if (phase === TestingPhase.PART_1) {
      confirmExit();
    } else if (phase === TestingPhase.SIMULATOR) {
      confirmExit();
    } else if (phase === TestingPhase.FEEDBACK) {
      Alert.alert(
        'Go Back?',
        'Are you sure you want to go back to testing? You can return to the feedback later.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go Back', onPress: () => setPhase(TestingPhase.SIMULATOR) }
        ]
      );
    } else {
      onClose();
    }
  };

  const confirmExit = () => {
    Alert.alert(
      'Exit Testing?',
      'Are you sure you want to exit testing? Your progress will be saved, and you can continue later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit Testing', onPress: onClose }
      ]
    );
  };

  const handleAccessSuccess = async () => {
    try {
      await AsyncStorage.setItem(TESTING_ACCESS_KEY, 'true');
      setHasAccess(true);
      setPhase(TestingPhase.INTRO);
    } catch (error) {
      console.error('Error saving testing access:', error);
    }
  };

  const handleIntroComplete = () => {
    setPhase(TestingPhase.PART_1);
  };

  const handlePart1Complete = () => {
    setPhase(TestingPhase.SIMULATOR);
  };

  const handleSimulatorComplete = () => {
    setPhase(TestingPhase.FEEDBACK);
  };

  const handleFeedbackSubmit = () => {
    setPhase(TestingPhase.COMPLETE);
    setTimeout(() => {
      onClose();
      resetTestingAccess();
    }, 3000);
  };

  const resetTestingAccess = async () => {
    try {
      // Clear all testing-related data but preserve premium and access credentials if needed
      const testingKeys = [
        '@flexbreak:simulator_scenario',
        '@flexbreak:testing_feedback',
        '@flexbreak:bob_simulator_access',
        '@flexbreak:testing_return_phase',
        '@flexbreak:testing_phase',
        '@flexbreak:testing_checklist_progress',
        '@flexbreak:testing_checklist_p2_progress',
        '@flexbreak:testing_feedback_submitted',
        TESTING_PHASE_KEY,
        TESTING_ACCESS_KEY
      ];
      
      // Note: We intentionally don't clear '@flexbreak:testing_premium_access'
      // to ensure testers keep premium access even after resetting
      
      await AsyncStorage.multiRemove(testingKeys);
      setHasAccess(false);
      setPhase(TestingPhase.ACCESS);
    } catch (error) {
      console.error('Error resetting testing access:', error);
    }
  };

  const navigateToBobSimulator = (scenarioData?: any) => {
    // Save testing authentication state for the simulator
    try {
      // Set a flag in AsyncStorage that the simulator can check
      AsyncStorage.setItem('@flexbreak:bob_simulator_access', 'true');
      
      // Also store the current testing phase so we can come back to it
      AsyncStorage.setItem('@flexbreak:testing_return_phase', phase);
      
      // Navigate directly to BobSimulator
      setTimeout(() => {
        // Use our global navigation function to force navigation directly to BobSimulator
        forceNavigate('BobSimulator', {
          fromTesting: true,
          testingAccessGranted: true,
          returnToTesting: true,
          // Include scenario data if provided
          ...(scenarioData && { scenarioData })
        });
      }, 100);
    } catch (error) {
      console.error('Error navigating to simulator:', error);
      Alert.alert('Error', 'Could not open Bob Simulator. Please try again.');
    }
  };

  const renderStageTitle = () => {
    switch (phase) {
      case TestingPhase.ACCESS:
        return 'Tester Access';
      case TestingPhase.INTRO:
        return 'Testing Introduction';
      case TestingPhase.PART_1:
        return 'Part 1: Core Features Testing';
      case TestingPhase.FEEDBACK:
        return 'Testing Feedback';
      case TestingPhase.SIMULATOR:
        return 'Bob Simulator';
      case TestingPhase.COMPLETE:
        return 'Testing Complete';
      default:
        return 'FlexBreak Testing';
    }
  };

  const renderContent = () => {
    switch (phase) {
      case TestingPhase.WELCOME:
        return (
          <ScrollView contentContainerStyle={styles.welcomeContainer}>
            <View style={[styles.welcomeCard, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.welcomeIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }]}>
                <Ionicons name="flask-outline" size={56} color={theme.accent} />
              </View>
              
              <Text style={[styles.welcomeTitle, { color: theme.text }]}>
                Welcome to FlexBreak Testing!
              </Text>
              
              <Text style={[styles.welcomeDescription, { color: theme.textSecondary }]}>
                Thank you for helping us improve FlexBreak. Your feedback is extremely valuable to us!
              </Text>
              
              <View style={styles.welcomeInfoContainer}>
                <View style={styles.welcomeInfoItem}>
                  <View style={[styles.welcomeStep, { backgroundColor: theme.accent }]}>
                    <Text style={styles.welcomeStepText}>1</Text>
                  </View>
                  <View style={styles.welcomeInfoTextContainer}>
                    <Text style={[styles.welcomeInfoTitle, { color: theme.text }]}>
                      Enter your access code
                    </Text>
                    <Text style={[styles.welcomeInfoDescription, { color: theme.textSecondary }]}>
                      Use the code from your invitation email to begin testing
                    </Text>
                  </View>
                </View>
                
                <View style={styles.welcomeInfoItem}>
                  <View style={[styles.welcomeStep, { backgroundColor: theme.accent }]}>
                    <Text style={styles.welcomeStepText}>2</Text>
                  </View>
                  <View style={styles.welcomeInfoTextContainer}>
                    <Text style={[styles.welcomeInfoTitle, { color: theme.text }]}>
                      Test basic features
                    </Text>
                    <Text style={[styles.welcomeInfoDescription, { color: theme.textSecondary }]}>
                      Follow the checklist to test core app functionality
                    </Text>
                  </View>
                </View>
                
                <View style={styles.welcomeInfoItem}>
                  <View style={[styles.welcomeStep, { backgroundColor: theme.accent }]}>
                    <Text style={styles.welcomeStepText}>3</Text>
                  </View>
                  <View style={styles.welcomeInfoTextContainer}>
                    <Text style={[styles.welcomeInfoTitle, { color: theme.text }]}>
                      Test gamification
                    </Text>
                    <Text style={[styles.welcomeInfoDescription, { color: theme.textSecondary }]}>
                      Simulate stretching over time to test rewards and progression
                    </Text>
                  </View>
                </View>
                
                <View style={styles.welcomeInfoItem}>
                  <View style={[styles.welcomeStep, { backgroundColor: theme.accent }]}>
                    <Text style={styles.welcomeStepText}>4</Text>
                  </View>
                  <View style={styles.welcomeInfoTextContainer}>
                    <Text style={[styles.welcomeInfoTitle, { color: theme.text }]}>
                      Provide feedback
                    </Text>
                    <Text style={[styles.welcomeInfoDescription, { color: theme.textSecondary }]}>
                      Share your thoughts to help us make the app better
                    </Text>
                  </View>
                </View>
              </View>
              
              <Text style={[styles.welcomeNote, { color: theme.textSecondary }]}>
                Testing takes about 15-30 minutes. You can pause and resume anytime.
              </Text>
              
              <TouchableOpacity
                style={[styles.welcomeButton, { backgroundColor: theme.accent }]}
                onPress={handleWelcomeContinue}
              >
                <Text style={styles.welcomeButtonText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      case TestingPhase.ACCESS:
        return <TestingAccessForm onAccessGranted={handleAccessSuccess} />;
      case TestingPhase.INTRO:
        return (
          <>
            <TestingIntroSlides onComplete={handleIntroComplete} />
            {/* Add reset link at bottom of intro screen */}
            <TouchableOpacity 
              style={styles.resetLink}
              onPress={() => {
                Alert.alert(
                  'Reset Testing Access',
                  'This will reset your testing status. You will need to enter the access code again.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reset', style: 'destructive', onPress: resetTestingAccess }
                  ]
                );
              }}
            >
              <Text style={[styles.resetText, { color: theme.textSecondary }]}>
                Reset Testing Access
              </Text>
            </TouchableOpacity>
          </>
        );
      case TestingPhase.PART_1:
        return <TestingChecklistPart1 onComplete={handlePart1Complete} />;
      case TestingPhase.FEEDBACK:
        return <TestingFeedbackForm onComplete={handleFeedbackSubmit} />;
      case TestingPhase.SIMULATOR:
        return <TestingSimulatorIntro navigateToBobSimulator={navigateToBobSimulator} onComplete={handleSimulatorComplete} />;
      case TestingPhase.COMPLETE:
        return (
          <View style={styles.completedContainer}>
            <Text style={[styles.completedTitle, { color: theme.text }]}>
              Testing Complete!
            </Text>
            <Text style={[styles.completedText, { color: theme.textSecondary }]}>
              Thank you for your valuable feedback. The app will now return to normal.
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={confirmExit}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {phase !== TestingPhase.WELCOME && (
          <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
            <TouchableOpacity
              onPress={confirmExit}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            
            {/* Show app name/version for some phases */}
            {(phase === TestingPhase.ACCESS || phase === TestingPhase.INTRO) && (
              <View style={styles.appInfoContainer}>
                <Text style={[styles.appName, { color: theme.text }]}>
                  FlexBreak Testing
                </Text>
                <Text style={[styles.appVersion, { color: theme.textSecondary }]}>
                  Version 0.0.9 (Beta)
                </Text>
              </View>
            )}
            
            {/* Show premium badge for all phases after access */}
            {(phase === TestingPhase.INTRO || 
              phase === TestingPhase.PART_1 || 
              phase === TestingPhase.SIMULATOR || 
              phase === TestingPhase.FEEDBACK || 
              phase === TestingPhase.COMPLETE) && (
              <View style={styles.premiumBadgeContainer}>
                
              </View>
            )}
            
            {/* Show progress indicator for testing phases */}
            {(phase === TestingPhase.PART_1 || phase === TestingPhase.SIMULATOR || phase === TestingPhase.FEEDBACK) && (
              <View style={styles.progressIndicatorContainer}>
                <View style={styles.progressSteps}>
                  <View 
                    style={[
                      styles.progressStep, 
                      { 
                        backgroundColor: phase === TestingPhase.PART_1 ? theme.accent : 
                                        (phase === TestingPhase.SIMULATOR || phase === TestingPhase.FEEDBACK) ? 
                                        theme.accent + '80' : theme.backgroundLight 
                      }
                    ]}
                  >
                    <Text style={styles.progressStepText}>1</Text>
                  </View>
                  <View style={[styles.progressLine, { backgroundColor: (phase === TestingPhase.SIMULATOR || phase === TestingPhase.FEEDBACK) ? theme.accent + '80' : theme.backgroundLight }]} />
                  <View 
                    style={[
                      styles.progressStep, 
                      { 
                        backgroundColor: phase === TestingPhase.SIMULATOR ? theme.accent : 
                                        phase === TestingPhase.FEEDBACK ? 
                                        theme.accent + '80' : theme.backgroundLight 
                      }
                    ]}
                  >
                    <Text style={styles.progressStepText}>2</Text>
                  </View>
                  <View style={[styles.progressLine, { backgroundColor: phase === TestingPhase.FEEDBACK ? theme.accent + '80' : theme.backgroundLight }]} />
                  <View 
                    style={[
                      styles.progressStep, 
                      { backgroundColor: phase === TestingPhase.FEEDBACK ? theme.accent : theme.backgroundLight }
                    ]}
                  >
                    <Text style={styles.progressStepText}>3</Text>
                  </View>
                </View>
                <View style={styles.progressLabels}>
                  <Text style={[styles.progressLabel, { color: phase === TestingPhase.PART_1 ? theme.accent : theme.textSecondary }]}>
                    Features
                  </Text>
                  <Text style={[styles.progressLabel, { color: phase === TestingPhase.SIMULATOR ? theme.accent : theme.textSecondary }]}>
                    Gamification
                  </Text>
                  <Text style={[styles.progressLabel, { color: phase === TestingPhase.FEEDBACK ? theme.accent : theme.textSecondary }]}>
                    Feedback
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
        
        {renderContent()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  resetLink: {
    alignItems: 'center',
    padding: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  resetText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  completedText: {
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  welcomeContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  welcomeCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  welcomeIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  welcomeInfoContainer: {
    width: '100%',
    marginBottom: 24,
  },
  welcomeInfoItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  welcomeStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  welcomeStepText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  welcomeInfoTextContainer: {
    flex: 1,
  },
  welcomeInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  welcomeInfoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  welcomeNote: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  welcomeButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  welcomeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  appInfoContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  appVersion: {
    fontSize: 12,
  },
  progressIndicatorContainer: {
    flex: 1,
    alignItems: 'center',
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStep: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressLine: {
    width: 20,
    height: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 10,
    width: 64,
    textAlign: 'center',
  },
  premiumBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  premiumBadge: {
    padding: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumIcon: {
    marginRight: 4,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default TestingModal; 