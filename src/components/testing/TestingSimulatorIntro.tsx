import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const { theme } = useTheme();
  const [showScenarios, setShowScenarios] = useState(false);
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([
    {
      id: '1',
      title: 'Level-Up Edge Case (Routine)',
      description: 'Test level-up behavior when crossing a level threshold via routine completion',
      setup: 'Near Level 3: 450 → 500 XP via routine',
      verification: [
        'Custom reminders feature appears after level-up',
        'Level-up screen displays correctly',
        'XP calculation is accurate'
      ],
      completed: false,
      feedback: ''
    },
    {
      id: '2',
      title: 'Level-Up Edge Case (Challenge)',
      description: 'Test level-up behavior when crossing a level threshold via challenge completion',
      setup: 'Near Level 3: 450 → 500 XP via challenge (~50 XP)',
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
      setup: 'Level 5: 750 XP',
      verification: [
        'Custom routines feature is available',
        'Beta smart generator is accessible',
        'Home UI displays correctly with these features'
      ],
      completed: false,
      feedback: ''
    },
    {
      id: '4',
      title: 'Streak Freeze Logic',
      description: 'Test streak freeze functionality near Level 6',
      setup: 'Near Level 6: 1100 → 1200 XP, currentStreak: 5',
      verification: [
        'Streak freezes feature is available',
        'Streak counting logic works correctly',
        'UI displays streak correctly'
      ],
      completed: false,
      feedback: ''
    },
    {
      id: '5',
      title: 'Desk Break Boost',
      description: 'Test desk break boost feature at Level 8',
      setup: 'Level 8: 3100 → 3200 XP',
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
      title: 'Challenge Edge Case',
      description: 'Test challenge progress edge case',
      setup: 'Challenge.progress failure (4/5), then completion',
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
      title: '7-Day Batch Simulation',
      description: 'Test behavior over a 7-day consecutive period',
      setup: '7-Day Batch: ~700 XP, currentStreak: 7',
      verification: [
        'Streak count increases correctly',
        'routinesByArea stats are accurate',
        'Weekly challenges update properly'
      ],
      completed: false,
      feedback: ''
    },
    {
      id: '10',
      title: 'Double XP Testing',
      description: 'Test double XP feature at Level 4',
      setup: 'Level 4: 700 → 750 XP, double_xp (~200 XP)',
      verification: [
        'Double XP is applied correctly',
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
      `You've selected this testing scenario. When you open the simulator, the scenario details will be displayed at the top of the screen for reference during testing.\n\nSetup: ${scenario.setup}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Simulator',
          onPress: () => {
            // Save the selected scenario to AsyncStorage for the simulator to use
            AsyncStorage.setItem('@deskstretch:simulator_scenario', JSON.stringify({
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
    
    scenarios.filter(scenario => scenario.completed).forEach(scenario => {
      feedbackContent += `${scenario.id}. ${scenario.title}\n`;
      feedbackContent += `Setup: ${scenario.setup}\n`;
      feedbackContent += `User Feedback: ${scenario.feedback || 'No feedback provided'}\n\n`;
    });
    
    const subject = encodeURIComponent('FlexBreak Gamification Testing Feedback');
    const body = encodeURIComponent(feedbackContent);
    
    // Open email client with feedback
    Alert.alert(
      'Submit Gamification Feedback',
      `You've completed ${completedCount} scenarios. Your feedback will be sent anonymously.`,
      [
        { text: 'Continue Testing', style: 'cancel' },
        { 
          text: 'Send & Complete Testing',
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

  if (!showScenarios) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.introContainer}>
          <Ionicons name="trending-up" size={60} color={theme.accent} />
          
          <Text style={[styles.title, { color: theme.text }]}>
            Part 2: Gamification Testing
          </Text>
          
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Now you'll test FlexBreak's gamification system using our specialized simulator tool.
          </Text>

          <View style={[styles.infoCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.infoTitle, { color: theme.text }]}>
              How Simulator Testing Works
            </Text>
            
            <View style={styles.infoItem}>
              <Ionicons name="person-circle-outline" size={24} color={theme.accent} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                The simulator creates a test user named "Bob" who can rapidly earn XP and unlock features
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={24} color={theme.accent} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Compress days or weeks of usage into minutes to test long-term behavior
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="flask-outline" size={24} color={theme.accent} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Test specific scenarios like level-ups, streak maintenance, and feature unlocks
              </Text>
            </View>
          </View>
          
          <View style={[styles.instructionsCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.instructionsTitle, { color: theme.text }]}>
              Testing Process
            </Text>
            
            <View style={styles.instructionStep}>
              <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                Select a testing scenario from our list of edge cases and key features
              </Text>
            </View>
            
            <View style={styles.instructionStep}>
              <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                Use the Bob Simulator to set up the scenario and generate test data
              </Text>
            </View>
            
            <View style={styles.instructionStep}>
              <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                Verify the expected behavior and record your observations
              </Text>
            </View>
            
            <View style={styles.instructionStep}>
              <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                Reset data between scenarios to ensure clean test conditions
              </Text>
            </View>
            
            <View style={styles.instructionStep}>
              <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                <Text style={styles.stepNumberText}>5</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                Mark the scenario as completed and proceed to the next one
              </Text>
            </View>
          </View>
          
          <View style={[styles.requirementCard, { backgroundColor: theme.accent + '20' }]}>
            <Ionicons name="information-circle-outline" size={24} color={theme.accent} style={styles.requirementIcon} />
            <Text style={[styles.requirementText, { color: theme.text }]}>
              Please test at least 2 scenarios, but more are appreciated! This helps us ensure our gamification system works correctly at all levels.
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.accent }]}
            onPress={handleStartTesting}
          >
            <Text style={styles.startButtonText}>Start Gamification Testing</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Gamification Testing Scenarios
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          {completedCount}/{scenarios.length} completed • {minRequiredScenarios} required
        </Text>
      </View>

      <View style={[styles.instructionsCard, { backgroundColor: theme.cardBackground, marginTop: 0 }]}>
        <Text style={[styles.instructionsTitle, { color: theme.text }]}>
          Testing Instructions
        </Text>
        
        <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
          1. Choose a scenario below{'\n'}
          2. Tap to open the Bob Simulator with your scenario details{'\n'}
          3. Your selected scenario will be displayed at the top of the simulator{'\n'}
          4. Configure the simulator as directed in the scenario{'\n'}
          5. Check all verification points{'\n'}
          6. Return here and mark as completed with feedback
        </Text>

        <TouchableOpacity
          style={[styles.simulatorButton, { backgroundColor: theme.accent }]}
          onPress={() => {
            // Show alert requiring scenario selection first
            Alert.alert(
              "Select a Scenario First",
              "Please select a specific testing scenario from the list below before opening the simulator.",
              [{ text: "OK", style: "default" }]
            );
          }}
        >
          <Ionicons name="person-outline" size={20} color="#FFF" style={styles.simulatorButtonIcon} />
          <Text style={styles.simulatorButtonText}>Open Bob Simulator</Text>
        </TouchableOpacity>
      </View>

      {scenarios.map(scenario => (
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
          <TouchableOpacity 
            style={styles.scenarioHeader}
            onPress={() => handleScenarioSelect(scenario)}
          >
            <View style={styles.scenarioTitleRow}>
              <Text style={[styles.scenarioId, { color: theme.textSecondary }]}>
                {scenario.id}
              </Text>
              <Text style={[styles.scenarioTitle, { color: theme.text }]}>
                {scenario.title}
              </Text>
              <TouchableOpacity 
                style={[
                  styles.completedCheckbox, 
                  { 
                    backgroundColor: scenario.completed ? theme.accent : 'transparent',
                    borderColor: scenario.completed ? theme.accent : theme.border 
                  }
                ]}
                onPress={() => toggleScenarioCompletion(scenario.id)}
              >
                {scenario.completed && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.scenarioDescription, { color: theme.textSecondary }]}>
              {scenario.description}
            </Text>
            
            <View style={[styles.setupContainer, { backgroundColor: theme.backgroundLight }]}>
              <Text style={[styles.setupLabel, { color: theme.text }]}>Setup:</Text>
              <Text style={[styles.setupText, { color: theme.textSecondary }]}>
                {scenario.setup}
              </Text>
            </View>
            
            <Text style={[styles.verificationLabel, { color: theme.text }]}>
              Verification Points:
            </Text>
            {scenario.verification.map((point, index) => (
              <View key={index} style={styles.verificationItem}>
                <Ionicons 
                  name="checkmark-circle-outline" 
                  size={16} 
                  color={theme.accent} 
                  style={styles.verificationIcon} 
                />
                <Text style={[styles.verificationText, { color: theme.textSecondary }]}>
                  {point}
                </Text>
              </View>
            ))}
          </TouchableOpacity>
          
          {scenario.completed && (
            <View style={styles.feedbackSection}>
              <Text style={[styles.feedbackLabel, { color: theme.text }]}>
                Your Feedback:
              </Text>
              <ScrollView 
                style={[styles.feedbackScrollView, { backgroundColor: theme.backgroundLight }]}
                nestedScrollEnabled={true}
              >
                <TouchableOpacity
                  onPress={() => {
                    Alert.prompt(
                      'Scenario Feedback',
                      'Provide your observations and any issues you encountered:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Save',
                          onPress: text => updateScenarioFeedback(scenario.id, text || '')
                        }
                      ],
                      'plain-text',
                      scenario.feedback
                    );
                  }}
                >
                  <Text style={[
                    styles.feedbackText, 
                    { 
                      color: scenario.feedback ? theme.text : theme.textSecondary,
                      fontStyle: scenario.feedback ? 'normal' : 'italic'
                    }
                  ]}>
                    {scenario.feedback || 'Tap to add your feedback for this scenario...'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      ))}
      
      <TouchableOpacity
        style={[
          styles.submitButton,
          {
            backgroundColor: canProceed ? theme.accent : theme.backgroundLight,
            opacity: canProceed ? 1 : 0.5
          }
        ]}
        onPress={handleSubmitFeedback}
        disabled={!canProceed}
      >
        <Ionicons 
          name="send" 
          size={20} 
          color={canProceed ? "white" : theme.textSecondary} 
          style={styles.submitButtonIcon} 
        />
        <Text style={[
          styles.submitButtonText,
          { color: canProceed ? "white" : theme.textSecondary }
        ]}>
          Submit Feedback & Complete
        </Text>
      </TouchableOpacity>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  introContainer: {
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  infoCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 12,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  instructionsCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  requirementCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
  },
  requirementIcon: {
    marginRight: 12,
    alignSelf: 'flex-start',
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  startButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 40,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  scenarioCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scenarioHeader: {
    padding: 16,
  },
  scenarioTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scenarioId: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  scenarioTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scenarioDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  setupContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  setupLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  setupText: {
    fontSize: 14,
    lineHeight: 20,
  },
  verificationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  verificationItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  verificationIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  verificationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackSection: {
    padding: 16,
    paddingTop: 0,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  feedbackScrollView: {
    maxHeight: 100,
    padding: 12,
    borderRadius: 8,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
  },
  simulatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  simulatorButtonIcon: {
    marginRight: 8,
  },
  simulatorButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  spacer: {
    height: 40,
  },
});

export default TestingSimulatorIntro; 