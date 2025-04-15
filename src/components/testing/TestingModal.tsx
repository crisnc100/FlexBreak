import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Text,
  SafeAreaView,
  Alert,
  BackHandler
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
  ACCESS = 'access',
  INTRO = 'intro',
  PART_1 = 'part1',
  SIMULATOR = 'simulator',
  FEEDBACK = 'feedback',
  COMPLETE = 'complete'
}

const TESTING_PHASE_KEY = '@deskstretch:testing_phase';
const TESTING_ACCESS_KEY = '@deskstretch:testing_access';

type TestingModalProps = {
  visible: boolean;
  onClose: () => void;
};

const TestingModal: React.FC<TestingModalProps> = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [phase, setPhase] = useState<TestingPhase>(TestingPhase.ACCESS);
  const [hasAccess, setHasAccess] = useState(false);

  // Load saved testing phase and access
  useEffect(() => {
    const loadTestingState = async () => {
      try {
        const savedPhase = await AsyncStorage.getItem(TESTING_PHASE_KEY);
        const savedAccess = await AsyncStorage.getItem(TESTING_ACCESS_KEY);
        
        if (savedAccess === 'true') {
          setHasAccess(true);
          if (savedPhase) {
            setPhase(savedPhase as TestingPhase);
          } else {
            setPhase(TestingPhase.INTRO);
          }
        }
      } catch (error) {
        console.error('Error loading testing state:', error);
      }
    };

    if (visible) {
      loadTestingState();
    }
  }, [visible]);

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
          const returnPhase = await AsyncStorage.getItem('@deskstretch:testing_return_phase');
          if (returnPhase) {
            // Set the phase back to what it was
            setPhase(returnPhase as TestingPhase);
            // Clear the flag so we don't reuse it
            await AsyncStorage.removeItem('@deskstretch:testing_return_phase');
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
      await AsyncStorage.removeItem(TESTING_PHASE_KEY);
      await AsyncStorage.removeItem(TESTING_ACCESS_KEY);
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
      AsyncStorage.setItem('@deskstretch:bob_simulator_access', 'true');
      
      // Also store the current testing phase so we can come back to it
      AsyncStorage.setItem('@deskstretch:testing_return_phase', phase);
      
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
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleBackAction}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleBackAction}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {renderStageTitle()}
          </Text>
          
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.content}>
          {renderContent()}
        </View>

        {phase !== TestingPhase.ACCESS && phase !== TestingPhase.COMPLETE && (
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.backgroundLight }]}
            onPress={handleBackAction}
          >
            <Text style={[styles.backButtonText, { color: theme.text }]}>
              Back
            </Text>
          </TouchableOpacity>
        )}
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
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
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
});

export default TestingModal; 