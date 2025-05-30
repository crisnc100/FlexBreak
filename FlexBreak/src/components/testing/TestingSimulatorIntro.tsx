import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Linking,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetSimulationData } from '../../services/storageService';

interface TestingSimulatorIntroProps {
  navigateToBobSimulator: (scenarioData?: any) => void;
  onComplete: () => void;
}

// Email for feedback
const FEEDBACK_EMAIL = 'cortegafit@gmail.com';

interface SimulationScenario {
  id: string;
  title: string;
  description: string;
  setup: string;
  verification: string[];
  completed: boolean;
  feedback: string;
}

const TestingSimulatorIntro: React.FC<TestingSimulatorIntroProps> = ({ 
  navigateToBobSimulator,
  onComplete
}) => {
  const { theme, isDark } = useTheme();
  const [showScenarios, setShowScenarios] = useState(false);
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([
    {
      id: '1',
      title: 'Level-Up Edge Case (Routine)',
      description: 'Test level-up behavior when crossing a level threshold by a routine completion.',
      setup: 'Get close to 500XP (3-5 routines), then complete a 15 min stretch routine to earn 90XP.',
      verification: [
        'Custom reminders feature appears in the complete routine page.',
        'Level-up screen displays correctly',
        'XP calculation is accurate and features are unlocked'
      ],
      completed: false,
      feedback: ''
    },
    {
      id: '2',
      title: 'Level-Up Edge Case (Challenge)',
      description: 'Similar to the routine test, but with a challenge completion.',
      setup: 'Get close to 475XP, then complete a challenge to earn enough xp for 500XP.',
      verification: [
        'Custom reminders feature unlocks',
        'Level-up triggers from challenge completion',
        'Challenge XP is correctly calculated'
      ],
      completed: false,
      feedback: ''
    },
    {
      id: '3',
      title: 'Level 5 Features',
      description: 'Test features that unlock at level 5',
      setup: 'Level 5: 1200 XP',
      verification: [
        'Custom routines feature is available',
        'Beta smart generator is accessible',
        'Home UI displays correctly with these features'
      ],
      completed: false,
      feedback: ''
    },
    {
      id: '4.1',
      title: 'Streak Freeze Logic - Use After Missing Yesterday',
      description: 'Test using streak freeze at Level 6 after missing yesterday\'s routine to preserve a any streak.',
      setup: '1. Set total XP to 1800 to reach Level 6.\n2. Set a streak ending the day before yesterday.\n3. Ensure no routine on yesterday.\n4. Restart app after setup.\n5. Go to progress page and apply streak freeze (2 should be available).\n6. Verify streak is restored +1 day for missing yesterday.\n7. Complete an additional routine to see streak go up again by 1 day.',
      verification: [
        'Streak freeze option is visible and can be applied.',
        'Streak remains plus 1 day.',
        'UI shows streak status clearly (e.g., \'5-day streak, freeze used\').',
        'No errors or crashes during process.'
      ],
      completed: false,
      feedback: ''
    },
    {
      id: '4.2',
      title: 'Streak Freeze Logic - Unavailable After Missing Two Days',
      description: 'Test that streak freeze is unavailable at Level 6 after missing two consecutive days, causing streak reset.',
      setup: '1. Set total XP to 1800 to reach Level 6.\n2. Set a streak ending 2 days ago.\n3. Ensure no routines in the past 2 days.\n4. Verify current day is 2 days from the last streak ending.\n5. Check Streak section for streak freeze availability.',
      verification: [
        'Streak freeze option is disabled or not visible.',
        'Streak resets to 0 or shows as broken.',
        'UI clearly indicates streak has ended (e.g., \'0-day streak\').',
        'No option to apply streak freeze.',
        'No errors or crashes when checking Streak section.'
      ],
      completed: false,
      feedback: ''
    },
    {
      id: '5',
      title: 'Desk Break Boost',
      description: 'Test desk break boost feature at Level 8',
      setup: 'Level 8: 3200 XP',
      verification: [
        'Desk break boost feature is accessible',
        '"Micro-stretches!" alert appears',
        'XP boost calculations are correct'
      ],
      completed: false,
      feedback: ''
    },
    {
      id: '6',
      title: 'Level 9 Features',
      description: 'Test features that unlock at level 9',
      setup: 'Level 9: 4000 XP',
      verification: [
        'Playlists tab is available',
        'Focus area mastery feature is accessible',
        'UI elements render correctly'
      ],
      completed: false,
      feedback: ''
    },
    {
      id: '7',
      title: 'Challenges and Achievements',
      description: 'Test challenge progress and achievement unlocking by simulating whatever streak you want.',
      setup: 'Set a streak of your choice, see how achievements are in progress to unlock. See how challenges are updated based on your progress. Complete a routine to see daily challenges updated.',
      verification: [
        'Progress updates correctly',
        'Roadmap bug in timeRange is visible',
        'Completion triggers expected behavior'
      ],
      completed: false,
      feedback: ''
    },
    {
      id: '8',
      title: 'XP Overflow Testing',
      description: 'Test behavior when approaching maximum level',
      setup: 'XP Overflow: 4500 XP, no level 10',
      verification: [
        'App handles totalXP correctly',
        'No level 10 is shown',
        'UI handles this edge case gracefully'
      ],
      completed: false,
      feedback: ''
    },
    {
      id: '9',
      title: 'Double XP Testing',
      description: 'Test double XP feature at Level 4',
      setup: 'Level 4: 750 XP required, double_xp (~200 XP)',
      verification: [
        'Double XP is applied correctly for routines and challenges (not achievements).',
        'XP calculations are accurate',
        'Level progression works as expected'
      ],
      completed: false,
      feedback: ''
    }
  ]);

  const completedCount = scenarios.filter(scenario => scenario.completed).length;
  const minRequiredScenarios = 2;
  const canProceed = completedCount >= minRequiredScenarios;
  const progress = (completedCount / scenarios.length) * 100;

  const toggleScenarioCompletion = (id: string) => {
    setScenarios(scenarios.map(scenario => 
      scenario.id === id ? { ...scenario, completed: !scenario.completed } : scenario
    ));
  };

  const updateScenarioFeedback = (id: string, feedback: string) => {
    setScenarios(scenarios.map(scenario => 
      scenario.id === id ? { ...scenario, feedback } : scenario
    ));
  };

  const handleStartTesting = () => {
    setShowScenarios(true);
  };

  const handleScenarioSelect = (scenario: SimulationScenario) => {
    // Store the current scenario for reference
    Alert.alert(
      `Scenario #${scenario.id}: ${scenario.title}`,
      `You've selected this testing scenario. When you open the simulator, the scenario details will be displayed at the top of the screen for reference during testing.\n\nSetup: ${scenario.setup}\n\nReminder: You may need to restart the app after completing this test for all changes to be properly reflected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Simulator',
          onPress: () => {
            // Save the selected scenario to AsyncStorage for the simulator to use
            AsyncStorage.setItem('@flexbreak:simulator_scenario', JSON.stringify({
              id: scenario.id,
              title: scenario.title,
              setup: scenario.setup,
              verification: scenario.verification
            })).then(() => {
              console.log(`[TestingSimulatorIntro] Saved scenario ${scenario.id} to AsyncStorage`);
              // Navigate to the simulator with the scenario data
              navigateToBobSimulator({
                scenarioId: scenario.id,
                scenarioTitle: scenario.title,
                scenarioSetup: scenario.setup,
                scenarioVerification: scenario.verification
              });
            }).catch(error => {
              console.error('Error saving scenario:', error);
              // Fall back to basic navigation if storage fails
              navigateToBobSimulator();
            });
          }
        }
      ]
    );
  };

  const handleSubmitFeedback = () => {
    // Prepare feedback email content
    let feedbackContent = '[ANONYMOUS GAMIFICATION TESTING FEEDBACK]\n\n';
    
    // Add privacy notice at the top
    feedbackContent += 'NOTE: For privacy, you may want to remove your email address or personal info before sending.\n\n';
    
    scenarios.filter(scenario => scenario.completed).forEach(scenario => {
      feedbackContent += `${scenario.id}. ${scenario.title}\n`;
      feedbackContent += `Setup: ${scenario.setup}\n`;
      feedbackContent += `User Feedback: ${scenario.feedback || 'No feedback provided'}\n\n`;
    });
    
    const subject = encodeURIComponent('ANONYMOUS - FlexBreak Gamification Testing Feedback');
    const body = encodeURIComponent(feedbackContent);
    
    // Open email client with feedback
    Alert.alert(
      'Submit Gamification Feedback',
      `You've completed ${completedCount} scenarios. Your feedback will be sent anonymously, but you may need to edit the "From" field in your email client to hide your identity completely.`,
      [
        { text: 'Back to Testing', style: 'cancel' },
        { 
          text: 'Skip & Complete',
          onPress: () => {
            // Complete testing without sending email
            onComplete();
          }
        },
        { 
          text: 'Send & Complete',
          onPress: () => {
            Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`)
              .then(() => {
                // Give a moment for the email client to open before continuing
                setTimeout(onComplete, 500);
              })
              .catch(err => {
                console.error('Error opening email client:', err);
                Alert.alert('Email Error', 'Could not open email client. Proceeding to completion.');
                onComplete();
              });
          }
        }
      ]
    );
  };
  const handleResetSimulationData = async () => {
    Alert.alert(
      'Reset Simulation Data',
      'This will reset all simulation data including game progress, routines, and XP. This is helpful when changing between testing scenarios.\n\nYour testing progress, feedback, and premium status will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset Simulation Data', 
          style: 'destructive', 
          onPress: async () => {
            const success = await resetSimulationData();
            if (success) {
              Alert.alert('Success', 'Simulation data has been reset. You can now test different scenarios with a clean state.');
            } else {
              Alert.alert('Error', 'Failed to reset simulation data. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleResetTestingData = async () => {
    Alert.alert(
      'Reset Testing Feedback & Progress',
      'This resets your TESTING PROGRESS ONLY, clearing your completed scenarios and feedback.\n\nThis is different from the "Reset Simulation Data" (red button in the simulator) which resets the gamification data for testing scenarios.\n\nYour access code and premium status will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset Testing Progress', 
          style: 'destructive', 
          onPress: async () => {
            try {
              // Clear all testing-related data but keep access credentials and premium access
              const testingKeys = [
                '@flexbreak:simulator_scenario',
                '@flexbreak:testing_feedback',
                '@flexbreak:bob_simulator_access',
                '@flexbreak:testing_return_phase',
                '@flexbreak:testing_phase',
                '@flexbreak:testing_checklist_progress',
                '@flexbreak:testing_checklist_p2_progress',
                '@flexbreak:testing_feedback_submitted'
              ];
              
              // Note: We intentionally don't clear '@flexbreak:testing_premium_access'
              // to ensure testers keep premium access even after resetting
              
              await AsyncStorage.multiRemove(testingKeys);
              
              // Reset scenario checkboxes
              setScenarios(scenarios.map(scenario => ({
                ...scenario,
                completed: false,
                feedback: ''
              })));
              
              Alert.alert(
                'Reset Complete', 
                'Your testing progress has been reset. You can now start testing scenarios from the beginning.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Force close the testing modal by calling onComplete
                      onComplete();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Error resetting testing data:', error);
              Alert.alert('Error', 'Failed to reset testing data. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (!showScenarios) {
    return (
      <View style={styles.container}>
        <View style={[styles.introCard, { backgroundColor: theme.cardBackground }]}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }]}>
            <Ionicons name="game-controller-outline" size={56} color={theme.accent} />
          </View>
          
          <Text style={[styles.title, { color: theme.text }]}>
            FlexBreak Testing: Part 2
          </Text>
          
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Gamification System Testing
          </Text>
          
          <View style={[styles.noticeContainer, { backgroundColor: isDark ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255, 193, 7, 0.1)' }]}>
            <Ionicons name="alert-circle-outline" size={22} color="#FFC107" style={styles.noticeIcon} />
            <Text style={[styles.noticeText, { color: isDark ? '#FFC107' : '#856404' }]}>
              Note: These testing screens will be removed from the app at launch. Please focus your feedback on the app's main features, not these testing tools.
            </Text>
          </View>
          
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            In this part, you'll test how FlexBreak's gamification system works by simulating different user scenarios. You'll be able to:
          </Text>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="time-outline" size={20} color={theme.accent} style={styles.featureIcon} />
              <Text style={[styles.featureText, { color: theme.text }]}>
                Simulate days and weeks of usage in minutes
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="trophy-outline" size={20} color={theme.accent} style={styles.featureIcon} />
              <Text style={[styles.featureText, { color: theme.text }]}>
                Test gamification features at different levels
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="bug-outline" size={20} color={theme.accent} style={styles.featureIcon} />
              <Text style={[styles.featureText, { color: theme.text }]}>
                Help us discover and fix potential issues
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.accent }]}
            onPress={handleStartTesting}
          >
            <Ionicons name="play" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.startButtonText}>
              Begin Scenario Testing
            </Text>
          </TouchableOpacity>
          
          <Text style={[styles.note, { color: theme.textSecondary }]}>
            You'll need to complete at least {minRequiredScenarios} scenarios to proceed to the final feedback step.
          </Text>
          
          <TouchableOpacity
            style={[
              styles.resetLinkButton
            ]}
            onPress={handleResetTestingData}
          >
            <Ionicons 
              name="refresh-circle-outline" 
              size={16} 
              color={theme.error} 
              style={styles.resetLinkIcon}
            />
            <Text style={[styles.resetLinkText, { color: theme.error }]}>
              Reset Testing Feedback & Progress
            </Text>
          </TouchableOpacity>
          
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          FlexBreak Testing: Part 2
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Gamification System Testing
        </Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressTextContainer}>
            <Text style={[styles.progressText, { color: theme.text }]}>
              <Text style={{ fontWeight: 'bold' }}>{completedCount}</Text> of <Text style={{ fontWeight: 'bold' }}>{scenarios.length}</Text> scenarios completed
            </Text>
            <Text style={[styles.progressPercentage, { color: theme.accent }]}>
              {Math.round(progress)}%
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundLight }]}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${progress}%`,
                  backgroundColor: theme.accent 
                }
              ]} 
            />
          </View>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={[styles.instructions, { color: theme.textSecondary }]}>
          Choose any {minRequiredScenarios} scenarios below to test. After testing each scenario, check it off and provide your feedback.
        </Text>
        
        <View style={[styles.noticeContainer, { backgroundColor: isDark ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255, 193, 7, 0.1)', marginBottom: 16 }]}>
          <Ionicons name="alert-circle-outline" size={22} color="#FFC107" style={styles.noticeIcon} />
          <Text style={[styles.noticeText, { color: isDark ? '#FFC107' : '#856404' }]}>
            Note: These testing screens will be removed from the app at launch. Please focus your feedback on the app's main features, not these testing tools.
          </Text>
        </View>
        
        <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : theme.accent + '10' }]}>
          <Ionicons name="information-circle-outline" size={24} color={theme.accent} style={styles.infoIcon} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.text }]}>Important Testing Tips:</Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              • You may need to RESTART the app (close and reopen) after testing certain scenarios for changes to fully take effect.
            </Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              • If you encounter issues or want to test another scenario, use the "Reset Simulation Data" button (red button in the buttom of the screen or in the simulator) to start fresh. It will not affect your testing progress just reset data for the simulator.
            </Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              • Each scenario is independent - complete any {minRequiredScenarios} that interest you most.
            </Text>
          </View>
        </View>
        
        {scenarios.map((scenario) => (
          <View 
            key={scenario.id}
            style={[
              styles.scenarioCard, 
              { 
                backgroundColor: theme.cardBackground,
                borderLeftColor: scenario.completed ? theme.accent : theme.border 
              }
            ]}
          >
            <View style={styles.scenarioHeader}>
              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => toggleScenarioCompletion(scenario.id)}
              >
                <View style={[
                  styles.checkbox, 
                  { 
                    backgroundColor: scenario.completed ? theme.accent : 'transparent',
                    borderColor: scenario.completed ? theme.accent : theme.border 
                  }
                ]}>
                  {scenario.completed && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>
              
              <View style={styles.titleContainer}>
                <Text style={[
                  styles.scenarioTitle, 
                  { 
                    color: theme.text,
                    opacity: scenario.completed ? 0.7 : 1
                  }
                ]}>
                  {scenario.title}
                </Text>
                <Text style={[styles.scenarioNumber, { color: theme.textSecondary }]}>
                  Scenario {scenario.id}
                </Text>
              </View>
            </View>
            
            <Text style={[
              styles.scenarioDescription, 
              { 
                color: theme.textSecondary,
                opacity: scenario.completed ? 0.7 : 1
              }
            ]}>
              {scenario.description}
            </Text>
            
            <View style={[styles.setupContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
              <Text style={[styles.setupTitle, { color: theme.text }]}>
                Test Setup:
              </Text>
              <Text style={[styles.setupText, { color: theme.text }]}>
                {scenario.setup}
              </Text>
            </View>
            
            <View style={styles.verificationContainer}>
              <Text style={[styles.verificationTitle, { color: theme.text }]}>
                Verification Points:
              </Text>
              {scenario.verification.map((point, index) => (
                <View key={index} style={styles.verificationItem}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={theme.accent} style={styles.verificationIcon} />
                  <Text style={[styles.verificationText, { color: theme.textSecondary }]}>
                    {point}
                  </Text>
                </View>
              ))}
            </View>
            
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: theme.accent }]}
                onPress={() => handleScenarioSelect(scenario)}
              >
                <Ionicons name="flask-outline" size={18} color="white" style={styles.buttonIcon} />
                <Text style={styles.testButtonText}>
                  Test This Scenario
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.feedbackContainer, { backgroundColor: theme.backgroundLight }]}>
              <Text style={[styles.feedbackLabel, { color: theme.text }]}>
                Your Feedback:
              </Text>
              <TextInput
                style={[styles.feedbackInput, { color: theme.text }]}
                placeholder="Add your observations, issues, or suggestions here..."
                placeholderTextColor={theme.textSecondary}
                multiline
                value={scenario.feedback}
                onChangeText={(text) => updateScenarioFeedback(scenario.id, text)}
              />
            </View>
          </View>
        ))}
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor: canProceed ? theme.accent : theme.backgroundLight,
                opacity: canProceed ? 1 : 0.5
              }
            ]}
            onPress={handleSubmitFeedback}
            disabled={!canProceed}
          >
            <Ionicons 
              name="arrow-forward-circle" 
              size={20} 
              color={canProceed ? "white" : theme.textSecondary} 
              style={styles.buttonIcon}
            />
            <Text style={[
              styles.continueButtonText,
              { color: canProceed ? 'white' : theme.textSecondary }
            ]}>
              Complete Testing
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.resetButton, 
              { 
                backgroundColor: isDark ? 'rgba(244, 67, 54, 0.15)' : 'rgba(244, 67, 54, 0.1)',
                borderColor: theme.error,
                borderWidth: 1
              }
            ]}
            onPress={handleResetTestingData}
          >
            <Ionicons 
              name="refresh-circle" 
              size={20} 
              color={theme.error} 
              style={styles.buttonIcon}
            />
            <Text style={[styles.resetButtonText, { color: theme.error }]}>
              Reset Testing Feedback & Progress
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.dangerButton, 
              { 
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                borderColor: 'rgba(0, 0, 0, 0.5)',
                borderWidth: 1,
                marginTop: 12
              }
            ]}
            onPress={handleResetSimulationData}
          >
            <Ionicons 
              name="trash-bin" 
              size={20} 
              color={isDark ? '#ff7070' : '#d32f2f'} 
              style={styles.buttonIcon}
            />
            <Text style={[styles.dangerButtonText, { color: isDark ? '#ff7070' : '#d32f2f' }]}>
              Reset Simulation Data
            </Text>
          </TouchableOpacity>
          
        </View>
        
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderRadius: 12,
    margin: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 4,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  introCard: {
    padding: 24,
    borderRadius: 16,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  featureList: {
    width: '100%',
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 16,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  instructions: {
    marginVertical: 16,
    lineHeight: 22,
    fontSize: 15,
  },
  scenarioCard: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scenarioHeader: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
  },
  checkboxContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  scenarioTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scenarioNumber: {
    fontSize: 12,
    fontWeight: '500',
  },
  scenarioDescription: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  setupContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  setupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  setupText: {
    fontSize: 14,
    lineHeight: 20,
  },
  verificationContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  verificationItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  verificationIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  verificationText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  actionContainer: {
    padding: 16,
    alignItems: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  testButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  feedbackContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    padding: 16,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  feedbackInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    lineHeight: 20,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  buttonsContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
  },
  resetButtonText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
  },
  dangerButtonText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  spacer: {
    height: 40,
  },
  resetLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 10,
  },
  resetLinkIcon: {
    marginRight: 6,
  },
  resetLinkText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  noticeContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeIcon: {
    marginRight: 12,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default TestingSimulatorIntro; 