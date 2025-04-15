import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  Alert,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface TestingChecklistPart1Props {
  onComplete: () => void;
}

// Email for feedback
const FEEDBACK_EMAIL = 'cortegafit@gmail.com';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  feedback: string;
}

const TestingChecklistPart1: React.FC<TestingChecklistPart1Props> = ({ onComplete }) => {
  const { theme } = useTheme();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: '1',
      title: 'Basic Stretching Routines',
      description: 'Complete a 5-minute Neck routine (Beginner difficulty). Verify you earn between 80-140 XP for your first daily routine.',
      isCompleted: false,
      feedback: ''
    },
    {
      id: '2',
      title: 'Multiple Daily Routines',
      description: 'Complete a second routine on the same day (any duration/area). Verify you earn 0 XP for this second routine (as of Apr 15, 2025).',
      isCompleted: false,
      feedback: ''
    },
    {
      id: '3',
      title: 'Body Area Variation',
      description: 'Complete a 10-minute Lower Back routine (Intermediate difficulty). Check that your stats update correctly in the Match screen.',
      isCompleted: false,
      feedback: ''
    },
    {
      id: '4',
      title: 'Favoriting a Routine',
      description: 'Find a routine you like and mark it as a favorite. Verify it appears in your favorites section.',
      isCompleted: false,
      feedback: ''
    },
    {
      id: '5',
      title: 'Setting Reminders',
      description: 'Set up daily reminders for stretching. Verify you receive the notification at the scheduled time.',
      isCompleted: false,
      feedback: ''
    },
    {
      id: '6',
      title: 'Challenges & Rewards',
      description: 'Complete at least one active challenge. Verify you can redeem the XP reward for completing it.',
      isCompleted: false,
      feedback: ''
    },
    {
      id: '7',
      title: 'Achievements Progress',
      description: 'Check your achievements progress. Try to make progress on at least one achievement.',
      isCompleted: false,
      feedback: ''
    },
    {
      id: '8',
      title: 'Smart Suggestions',
      description: 'In the Routine screen, try both "Random Pick" and "Smart Suggestion" features. Verify they suggest appropriate routines.',
      isCompleted: false,
      feedback: ''
    }
  ]);

  const handleToggleItem = (id: string) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    ));
  };

  const handleFeedbackChange = (id: string, text: string) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, feedback: text } : item
    ));
  };

  const completedCount = checklist.filter(item => item.isCompleted).length;
  const progress = (completedCount / checklist.length) * 100;

  const sendFeedbackAndContinue = () => {
    // Prepare feedback email content
    let feedbackContent = '[ANONYMOUS PART 1 TESTING FEEDBACK]\n\n';
    
    checklist.forEach(item => {
      feedbackContent += `${item.id}. ${item.title}\n`;
      feedbackContent += `User Feedback: ${item.feedback || 'No feedback provided'}\n\n`;
    });
    
    const subject = encodeURIComponent('FlexBreak Part 1 Testing Feedback');
    const body = encodeURIComponent(feedbackContent);
    
    // Open email client with feedback
    Alert.alert(
      'Submit Part 1 Feedback',
      'Your detailed feedback will be sent anonymously for Part 1 testing. After this, you will proceed to Part 2 (Gamification Testing).',
      [
        { text: 'Skip', onPress: onComplete },
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

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.progressContainer}>
          <View style={styles.progressTextContainer}>
            <Text style={[styles.progressText, { color: theme.text }]}>
              Part 1 Progress: {completedCount}/{checklist.length}
            </Text>
            <Text style={[styles.progressPercentage, { color: theme.accent }]}>
              {Math.round(progress)}%
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundLight }]}>
            <View 
              style={[
                styles.progressFill, 
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
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Core Features Testing
        </Text>
        
        <Text style={[styles.instructions, { color: theme.textSecondary }]}>
          Complete each task below and check it off when done. Please add feedback for each task.
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
            
            <View style={styles.contentContainer}>
              <View style={styles.titleRow}>
                <Text style={[
                  styles.itemTitle, 
                  { 
                    color: theme.text,
                    textDecorationLine: item.isCompleted ? 'line-through' : 'none' 
                  }
                ]}>
                  {item.title}
                </Text>
                <Text style={[styles.itemNumber, { color: theme.textSecondary }]}>
                  {item.id}
                </Text>
              </View>
              
              <Text style={[styles.itemDescription, { color: theme.textSecondary }]}>
                {item.description}
              </Text>
              
              <View style={[styles.feedbackContainer, { backgroundColor: theme.backgroundLight }]}>
                <TextInput
                  style={[styles.feedbackInput, { color: theme.text }]}
                  placeholder="Add your feedback here (issues, suggestions, etc.)"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  value={item.feedback}
                  onChangeText={(text) => handleFeedbackChange(item.id, text)}
                />
              </View>
            </View>
          </View>
        ))}
        
        <TouchableOpacity
          style={[
            styles.completeButton,
            {
              backgroundColor: completedCount === checklist.length ? theme.accent : theme.backgroundLight,
              opacity: completedCount === checklist.length ? 1 : 0.5
            }
          ]}
          onPress={sendFeedbackAndContinue}
          disabled={completedCount !== checklist.length}
        >
          <Text style={[
            styles.completeButtonText,
            { color: completedCount === checklist.length ? 'white' : theme.textSecondary }
          ]}>
            Continue to Part 2
          </Text>
        </TouchableOpacity>
        
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
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  instructions: {
    marginBottom: 16,
    lineHeight: 20,
  },
  checklistItem: {
    flexDirection: 'row',
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
  checkboxContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    paddingLeft: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  itemNumber: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  itemDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  feedbackContainer: {
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  feedbackInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    padding: 8,
  },
  completeButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  spacer: {
    height: 40,
  }
});

export default TestingChecklistPart1; 