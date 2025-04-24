import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  Alert,
  Linking,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TestingChecklistPart1Props {
  onComplete: () => void;
}

// Email for feedback
const FEEDBACK_EMAIL = 'cortegafit@gmail.com';

// Key for storing checklist progress
const TESTING_CHECKLIST_PROGRESS = '@flexbreak:testing_checklist_progress';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  feedback: string;
  icon: string;
  tip?: string;
}

const TestingChecklistPart1: React.FC<TestingChecklistPart1Props> = ({ onComplete }) => {
  const { theme, isDark } = useTheme();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: '1',
      title: 'Try a Basic Stretch',
      description: 'Open the app and complete a 5-15 minute routine choosing any body area and level. Notice how much XP you earn (should be between 80-140 XP).',
      isCompleted: false,
      feedback: '',
      icon: 'fitness-outline',
      tip: 'Find routines from the home screen by tapping "Start Stretching"'
    },
    {
      id: '2',
      title: 'Do a Second Stretch Today',
      description: 'Complete any second routine on the same day. Notice that you should earn 0 XP for this second stretch (this is normal behavior).',
      isCompleted: false,
      feedback: '',
      icon: 'repeat-outline'
    },
    {
      id: '3',
      title: 'Try a Different Body Areas',
      description: 'Complete a 5-15 minute routine trying differnet body areas. Check that your stats update correctly on the home screen.',
      isCompleted: false,
      feedback: '',
      icon: 'body-outline'
    },
    {
      id: '4',
      title: 'Save a Favorite',
      description: 'Find any stretch routine you like and tap the heart icon to mark it as a favorite. Then go to the Favorites tab to see if it appears there.',
      isCompleted: false,
      feedback: '',
      icon: 'heart-outline'
    },
    {
      id: '5',
      title: 'Set a Reminder',
      description: 'Go to bottom of the home page and turn on reminders. Set up a time to receive a notfication at that time.',
      isCompleted: false,
      feedback: '',
      icon: 'notifications-outline',
      tip: 'Find in bottom page of the home screen and toggle on reminders.'
    },
    {
      id: '6',
      title: 'Complete a Challenge',
      description: 'Find and complete at least one active challenge. See if you can claim the XP reward afterward.',
      isCompleted: false,
      feedback: '',
      icon: 'trophy-outline',
      tip: 'Challenges can be found on the home screen or in the Progress section'
    },
    {
      id: '7',
      title: 'Check Your Achievements',
      description: 'Look at your achievements progress. Try to make progress on at least one achievement and note if it updates correctly.',
      isCompleted: false,
      feedback: '',
      icon: 'ribbon-outline'
    },
    {
      id: '8',
      title: 'Try Routine Suggestions',
      description: 'On the Routine screen, try both "Random Pick" and "Smart Suggestion" buttons. Do they suggest appropriate routines for you?',
      isCompleted: false,
      feedback: '',
      icon: 'bulb-outline'
    }
  ]);

  const [showHelp, setShowHelp] = useState(false);

  // Load saved progress on component mount
  useEffect(() => {
    const loadSavedProgress = async () => {
      try {
        const savedProgress = await AsyncStorage.getItem(TESTING_CHECKLIST_PROGRESS);
        if (savedProgress) {
          setChecklist(JSON.parse(savedProgress));
        }
      } catch (error) {
        console.error('Error loading saved progress:', error);
      }
    };
    
    loadSavedProgress();
  }, []);

  // Save progress whenever checklist changes
  const saveProgress = async (updatedChecklist: ChecklistItem[]) => {
    try {
      await AsyncStorage.setItem(TESTING_CHECKLIST_PROGRESS, JSON.stringify(updatedChecklist));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleToggleItem = (id: string) => {
    const updatedChecklist = checklist.map(item => 
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    );
    setChecklist(updatedChecklist);
    saveProgress(updatedChecklist);
  };

  const handleFeedbackChange = (id: string, text: string) => {
    const updatedChecklist = checklist.map(item => 
      item.id === id ? { ...item, feedback: text } : item
    );
    setChecklist(updatedChecklist);
    saveProgress(updatedChecklist);
  };

  const completedCount = checklist.filter(item => item.isCompleted).length;
  const progress = (completedCount / checklist.length) * 100;

  const sendFeedbackAndContinue = () => {
    // Prepare feedback email content
    let feedbackContent = '[ANONYMOUS PART 1 TESTING FEEDBACK]\n\n';
    
    // Add privacy notice at the top
    feedbackContent += 'NOTE: For privacy, you may want to remove your email address or personal info before sending.\n\n';
    
    checklist.forEach(item => {
      feedbackContent += `${item.id}. ${item.title}\n`;
      feedbackContent += `User Feedback: ${item.feedback || 'No feedback provided'}\n\n`;
    });
    
    const subject = encodeURIComponent('ANONYMOUS - FlexBreak Part 1 Testing Feedback');
    const body = encodeURIComponent(feedbackContent);
    
    // Open email client with feedback
    Alert.alert(
      'Submit Part 1 Feedback',
      'Your feedback will be sent anonymously, but you may need to edit the "From" field in your email client to hide your identity completely. After this, you\'ll move to Part 2 (Gamification Testing).',
      [
        { text: 'Back to Testing', style: 'cancel' },
        { text: 'Skip & Continue', onPress: onComplete },
        { 
          text: 'Send & Continue',
          onPress: () => {
            Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`)
              .then(() => {
                // Give a moment for the email client to open before continuing
                setTimeout(onComplete, 500);
              })
              .catch(err => {
                console.error('Error opening email client:', err);
                Alert.alert('Email Error', 'Could not open email client. Proceeding to Part 2.');
                onComplete();
              });
          }
        }
      ]
    );
  };

  const handleResetTestingData = async () => {
    Alert.alert(
      'Reset Testing Feedback & Progress',
      'This resets your TESTING PROGRESS ONLY, clearing your completed items and feedback.\n\nThis is different from the "Reset All Data" option in Settings which resets all app data including your stretching progress.\n\nYour access code and premium status will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset Testing Progress', 
          style: 'destructive', 
          onPress: async () => {
            try {
              // Clear all testing-related data but keep access credentials
              const testingKeys = [
                '@flexbreak:testing_checklist_progress',
                '@flexbreak:testing_feedback',
                '@flexbreak:testing_phase',
                '@flexbreak:testing_feedback_submitted'
              ];
              
              await AsyncStorage.multiRemove(testingKeys);
              
              // Reset checkboxes
              setChecklist(checklist.map(item => ({
                ...item,
                isCompleted: false,
                feedback: ''
              })));
              
              Alert.alert(
                'Reset Complete', 
                'Your testing progress has been reset. This screen will close and you will need to reopen testing to start from the beginning.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Force close the testing modal
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

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          FlexBreak Testing: Part 1
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Core Features Testing
        </Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressTextContainer}>
            <Text style={[styles.progressText, { color: theme.text }]}>
              <Text style={{ fontWeight: 'bold' }}>{completedCount}</Text> of <Text style={{ fontWeight: 'bold' }}>{checklist.length}</Text> tasks completed
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
        <View style={styles.helpSection}>
          <TouchableOpacity 
            style={[styles.helpButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }]}
            onPress={() => setShowHelp(!showHelp)}
          >
            <Ionicons 
              name={showHelp ? "chevron-up-circle-outline" : "help-circle-outline"} 
              size={22} 
              color={theme.accent} 
              style={styles.helpIcon}
            />
            <Text style={[styles.helpButtonText, { color: theme.accent }]}>
              {showHelp ? "Hide Testing Instructions" : "Show Testing Instructions"}
            </Text>
          </TouchableOpacity>
          
          {showHelp && (
            <View style={[styles.helpContent, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
              <Text style={[styles.helpTitle, { color: theme.text }]}>
                How to Complete This Test
              </Text>
              
              <View style={styles.helpItem}>
                <Ionicons name="checkmark-circle-outline" size={20} color={theme.accent} style={styles.helpItemIcon} />
                <Text style={[styles.helpItemText, { color: theme.textSecondary }]}>
                  Complete each task one by one in any order
                </Text>
              </View>
              
              <View style={styles.helpItem}>
                <Ionicons name="create-outline" size={20} color={theme.accent} style={styles.helpItemIcon} />
                <Text style={[styles.helpItemText, { color: theme.textSecondary }]}>
                  Add feedback about what worked and any issues you found
                </Text>
              </View>
              
              <View style={styles.helpItem}>
                <Ionicons name="checkbox-outline" size={20} color={theme.accent} style={styles.helpItemIcon} />
                <Text style={[styles.helpItemText, { color: theme.textSecondary }]}>
                  Check off each task after completing it and providing feedback
                </Text>
              </View>
              
              <View style={styles.helpItem}>
                <Ionicons name="arrow-forward-circle-outline" size={20} color={theme.accent} style={styles.helpItemIcon} />
                <Text style={[styles.helpItemText, { color: theme.textSecondary }]}>
                  Once all tasks are completed, click "Continue to Part 2"
                </Text>
              </View>
            </View>
          )}
        </View>
        
        <View style={[styles.noticeContainer, { backgroundColor: isDark ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255, 193, 7, 0.1)', marginBottom: 16 }]}>
          <Ionicons name="alert-circle-outline" size={22} color="#FFC107" style={styles.noticeIcon} />
          <Text style={[styles.noticeText, { color: isDark ? '#FFC107' : '#856404' }]}>
            Note: These testing screens will be removed from the app at launch. Please focus your feedback on the app's main features, not these testing tools.
          </Text>
        </View>
        
        <Text style={[styles.instructions, { color: theme.textSecondary }]}>
          Complete each task below, check it off when done, and share your thoughts about how it worked.
        </Text>
        
        {checklist.map((item) => (
          <View 
            key={item.id}
            style={[
              styles.checklistItem, 
              { 
                backgroundColor: theme.cardBackground,
                borderLeftColor: item.isCompleted ? theme.accent : theme.border 
              }
            ]}
          >
            <View style={styles.itemHeader}>
              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => handleToggleItem(item.id)}
              >
                <View style={[
                  styles.checkbox, 
                  { 
                    backgroundColor: item.isCompleted ? theme.accent : 'transparent',
                    borderColor: item.isCompleted ? theme.accent : theme.border 
                  }
                ]}>
                  {item.isCompleted && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>
              
              <View style={styles.titleContainer}>
                <Text style={[
                  styles.itemTitle, 
                  { 
                    color: theme.text,
                    opacity: item.isCompleted ? 0.7 : 1,
                    textDecorationLine: item.isCompleted ? 'line-through' : 'none' 
                  }
                ]}>
                  {item.title}
                </Text>
                <Text style={[styles.itemNumber, { color: theme.textSecondary }]}>
                  Task {item.id}
                </Text>
              </View>
              
              <View style={[styles.itemIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <Ionicons name={item.icon as any} size={20} color={theme.accent} />
              </View>
            </View>
            
            <Text style={[
              styles.itemDescription, 
              { 
                color: theme.textSecondary,
                opacity: item.isCompleted ? 0.7 : 1
              }
            ]}>
              {item.description}
            </Text>
            
            {item.tip && (
              <View style={[styles.tipContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : theme.accent + '10' }]}>
                <Ionicons name="information-circle-outline" size={18} color={theme.accent} style={styles.tipIcon} />
                <Text style={[styles.tipText, { color: theme.text }]}>
                  {item.tip}
                </Text>
              </View>
            )}
            
            <View style={[styles.feedbackContainer, { backgroundColor: theme.backgroundLight }]}>
              <Text style={[styles.feedbackLabel, { color: theme.text }]}>
                Your Feedback:
              </Text>
              <TextInput
                style={[styles.feedbackInput, { color: theme.text }]}
                placeholder="What worked? Any issues? Your suggestions?"
                placeholderTextColor={theme.textSecondary}
                multiline
                value={item.feedback}
                onChangeText={(text) => handleFeedbackChange(item.id, text)}
              />
            </View>
          </View>
        ))}
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor: completedCount === checklist.length ? theme.accent : theme.backgroundLight,
                opacity: completedCount === checklist.length ? 1 : 0.5
              }
            ]}
            onPress={sendFeedbackAndContinue}
            disabled={completedCount !== checklist.length}
          >
            <Ionicons 
              name="arrow-forward-circle" 
              size={20} 
              color={completedCount === checklist.length ? "white" : theme.textSecondary} 
              style={styles.buttonIcon}
            />
            <Text style={[
              styles.continueButtonText,
              { color: completedCount === checklist.length ? 'white' : theme.textSecondary }
            ]}>
              Continue to Part 2
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  helpSection: {
    marginBottom: 12,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  helpIcon: {
    marginRight: 8,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  helpContent: {
    padding: 16,
    borderRadius: 10,
    marginTop: 8,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  helpItemIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  helpItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  instructions: {
    marginVertical: 16,
    lineHeight: 22,
    fontSize: 15,
  },
  checklistItem: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    alignItems: 'center',
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
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemNumber: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  itemDescription: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
  },
  tipIcon: {
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
  spacer: {
    height: 40,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  noticeIcon: {
    marginRight: 8,
  },
  noticeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TestingChecklistPart1; 