import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import * as Permissions from 'expo-permissions';
import { Ionicons } from '@expo/vector-icons';
import { parseUserInput, generateRoutineConfig, selectStretches } from '../../utils/generators/routineGenerator';
import { SmartRoutineInput, IssueType, Duration, Stretch, StretchLevel, RestPeriod, BodyArea } from '../../types';
import allStretches from '../../data/stretches';
import { useTheme } from '../../context/ThemeContext';
import * as rewardManager from '../../utils/progress/modules/rewardManager';

interface SmartRoutineGeneratorProps {
  onRoutineGenerated: (
    stretches: Stretch[], 
    inputData?: { 
      description: string; 
      issueType: string; 
      duration: Duration;
      area?: BodyArea;
    }
  ) => void;
}

export const SmartRoutineGenerator: React.FC<SmartRoutineGeneratorProps> = ({ onRoutineGenerated }) => {
  const { theme, isDark } = useTheme();
  const [userInput, setUserInput] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [parsedInput, setParsedInput] = useState<SmartRoutineInput | null>(null);
  const [selectedIssueType, setSelectedIssueType] = useState<IssueType | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<Duration>('5');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [recognizedText, setRecognizedText] = useState('');

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const checkPermissions = async () => {
    // We'll just set this to true to keep the UI clean
    setHasPermission(true);
  };

  const startRecording = async () => {
    // Instead of starting recording, show a message that this feature is coming soon
    Alert.alert(
      "Voice Input Coming Soon",
      "We're working on adding voice recognition to make input even easier. Stay tuned for updates!",
      [{ text: "OK", onPress: () => console.log("Voice alert closed") }]
    );
  };

  const stopRecording = async () => {
    setIsRecording(false);
  };

  const handleGenerate = useCallback(async () => {
    if (!parsedInput || !selectedIssueType) return;

    setIsGenerating(true);
    try {
      const hasPremiumAccess = await rewardManager.isRewardUnlocked('premium_stretches');
      
      const config = generateRoutineConfig(
        parsedInput,
        selectedIssueType,
        selectedDuration
      );

      console.log("Generating routine with config:", JSON.stringify(config));
      const selectedRoutine = await selectStretches(config, allStretches);
      
      const filteredStretches = selectedRoutine
        .filter(item => !('isRest' in item))
        .filter(item => {
          const stretch = item as Stretch;
          return !stretch.premium || hasPremiumAccess;
        }) as Stretch[];
      
      console.log(`Final routine: ${filteredStretches.length} stretches`);
      
      if (filteredStretches.length === 0) {
        console.error("No valid stretches were generated");
        Alert.alert("No suitable stretches", "Try adjusting your description or selections.");
        setIsGenerating(false);
        return;
      }

      console.log(`Sending ${filteredStretches.length} stretches to routine generator`);
      
      onRoutineGenerated(filteredStretches, {
        description: userInput,
        issueType: selectedIssueType || 'stiffness',
        duration: selectedDuration,
        area: parsedInput?.parsedArea && parsedInput.parsedArea.length > 0 ? 
          parsedInput.parsedArea[0] : 'Full Body'
      });
      
      setShowFollowUp(false);
    } catch (error) {
      console.error('Error generating routine:', error);
      Alert.alert('Error', 'Failed to generate routine. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [parsedInput, selectedIssueType, selectedDuration, onRoutineGenerated, allStretches, userInput]);

  const handleInputSubmit = useCallback(() => {
    if (!userInput.trim()) return;
    
    const parsedData = parseUserInput(userInput);
    console.log("Parsed input data:", parsedData);
    setParsedInput(parsedData);
    
    setShowFollowUp(true);
    
    if (parsedData.parsedIssue) {
      setSelectedIssueType(parsedData.parsedIssue);
    }
  }, [userInput]);

  return (
    <View style={styles.container}>
     
      
      <View style={[
        styles.inputContainer, 
        { 
          backgroundColor: isDark ? theme.backgroundLight : '#f0f0f5',
          borderColor: isDark ? theme.border : '#e0e0e5'
        }
      ]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Example: My neck is stiff from working at my desk all day"
          placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
          value={isRecording ? recognizedText : userInput}
          onChangeText={setUserInput}
          onSubmitEditing={handleInputSubmit}
          multiline
          editable={!isRecording}
        />
        <TouchableOpacity
          style={[
            styles.voiceButton, 
            { 
              backgroundColor: isRecording 
                ? theme.accent 
                : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
            }
          ]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons
              name={isRecording ? "mic" : "mic-outline"}
              size={22}
              color={isRecording ? "#FFF" : theme.accent}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: theme.accent }]}
        onPress={handleInputSubmit}
        disabled={isGenerating || (!userInput.trim() && !recognizedText.trim()) || isRecording}
      >
        {isGenerating ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="sparkles-outline" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.submitButtonText}>Generate Smart Routine</Text>
          </>
        )}
      </TouchableOpacity>
      
      <View style={styles.helpSection}>
        <Text style={[styles.helpTitle, { color: theme.textSecondary }]}>
          Try describing:
        </Text>
        
        <View style={styles.examplesGrid}>
          <TouchableOpacity 
            style={[
              styles.exampleChip, 
              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
            ]}
            onPress={() => setUserInput("My lower back hurts after sitting all day")}
          >
            <Ionicons name="body-outline" size={16} color={theme.accent} style={styles.exampleIcon} />
            <Text style={[styles.exampleText, { color: theme.text }]}>
              Lower back pain from sitting
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.exampleChip, 
              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
            ]}
            onPress={() => setUserInput("My shoulders are tight from typing")}
          >
            <Ionicons name="body-outline" size={16} color={theme.accent} style={styles.exampleIcon} />
            <Text style={[styles.exampleText, { color: theme.text }]}>
              Tight shoulders from typing
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.exampleChip, 
              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
            ]}
            onPress={() => setUserInput("I need to stretch before my run")}
          >
            <Ionicons name="walk-outline" size={16} color={theme.accent} style={styles.exampleIcon} />
            <Text style={[styles.exampleText, { color: theme.text }]}>
              Pre-run stretching
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.exampleChip, 
              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
            ]}
            onPress={() => setUserInput("I feel stiff after waking up")}
          >
            <Ionicons name="bed-outline" size={16} color={theme.accent} style={styles.exampleIcon} />
            <Text style={[styles.exampleText, { color: theme.text }]}>
              Morning stiffness
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.exampleChip, 
              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
            ]}
            onPress={() => setUserInput("Quick 5-minute stretch for my full body")}
          >
            <Ionicons name="time-outline" size={16} color={theme.accent} style={styles.exampleIcon} />
            <Text style={[styles.exampleText, { color: theme.text }]}>
              Quick 5-minute full body
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.exampleChip, 
              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
            ]}
            onPress={() => setUserInput("My neck gets sore from looking at my phone")}
          >
            <Ionicons name="phone-portrait-outline" size={16} color={theme.accent} style={styles.exampleIcon} />
            <Text style={[styles.exampleText, { color: theme.text }]}>
              Neck pain from phone use
            </Text>
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.voiceNote, { color: theme.textSecondary }]}>
          <Ionicons name="information-circle-outline" size={14} color={theme.textSecondary} /> 
          Voice input feature coming soon!
        </Text>
      </View>

      <Modal visible={showFollowUp} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? theme.cardBackground : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Quick Follow-up</Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                Let's personalize your routine
              </Text>
            </View>
            
            <View style={styles.questionContainer}>
              <View style={styles.questionNumberBadge}>
                <Text style={styles.questionNumberText}>1</Text>
              </View>
              <Text style={[styles.label, { color: theme.text }]}>What's your main issue?</Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.issueContainer}>
                {['stiffness', 'pain', 'tiredness', 'flexibility'].map((issue) => (
                  <TouchableOpacity
                    key={issue}
                    style={[
                      styles.issueButton,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                      selectedIssueType === issue && [styles.selectedIssue, { backgroundColor: theme.accent }],
                    ]}
                    onPress={() => setSelectedIssueType(issue as IssueType)}
                  >
                    <Text style={[
                      styles.issueText,
                      { color: theme.text },
                      selectedIssueType === issue && styles.selectedIssueText,
                    ]}>
                      {issue.charAt(0).toUpperCase() + issue.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.questionContainer}>
              <View style={styles.questionNumberBadge}>
                <Text style={styles.questionNumberText}>2</Text>
              </View>
              <Text style={[styles.label, { color: theme.text }]}>How long would you like to stretch?</Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.durationContainer}>
                {[5, 10, 15].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationButton,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                      selectedDuration === duration.toString() && [styles.selectedDuration, { backgroundColor: theme.accent }],
                    ]}
                    onPress={() => setSelectedDuration(duration.toString() as Duration)}
                  >
                    <Text style={[
                      styles.durationText,
                      { color: theme.text },
                      selectedDuration === duration.toString() && styles.selectedDurationText,
                    ]}>
                      {duration} min
                    </Text>
                    <Text style={[
                      styles.durationSubtext,
                      { color: theme.textSecondary },
                      selectedDuration === duration.toString() && styles.selectedDurationText,
                    ]}>
                      {duration === 5 ? '(3-5 min)' : 
                       duration === 10 ? '(6-10 min)' : 
                       duration === 15 ? '(11-15 min)' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.generateButton, 
                { 
                  backgroundColor: !selectedIssueType || isGenerating ? 
                    (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)') : 
                    theme.accent,
                  opacity: !selectedIssueType || isGenerating ? 0.7 : 1
                }
              ]}
              onPress={handleGenerate}
              disabled={!selectedIssueType || isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.generateButtonText}>Create My Routine</Text>
                </>
              )}
            </TouchableOpacity>
            
            {selectedIssueType && (
              <View style={styles.summarySectionContainer}>
                <Text style={[styles.summaryTitle, { color: theme.textSecondary }]}>
                  Will generate:
                </Text>
                <View style={[styles.summaryBox, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Area:</Text>
                    <Text style={[styles.summaryValue, { color: theme.text }]}>
                      {parsedInput?.parsedArea ? parsedInput.parsedArea.join(', ') : 'Based on your description'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Issue:</Text>
                    <Text style={[styles.summaryValue, { color: theme.text }]}>
                      {selectedIssueType.charAt(0).toUpperCase() + selectedIssueType.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Duration:</Text>
                    <Text style={[styles.summaryValue, { color: theme.text }]}>
                      {selectedDuration === '5' ? '3-5 minutes' : 
                       selectedDuration === '10' ? '6-10 minutes' : 
                       selectedDuration === '15' ? '11-15 minutes' : 
                       `${selectedDuration} minutes`}
                    </Text>
                  </View>
                  {parsedInput?.parsedActivity && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Activity:</Text>
                      <Text style={[styles.summaryValue, { color: theme.text }]}>
                        {parsedInput.parsedActivity}
                      </Text>
                    </View>
                  )}
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Difficulty:</Text>
                    <Text style={[styles.summaryValue, { color: theme.text }]}>
                      {selectedIssueType === 'pain' ? 'Beginner' : 
                       selectedIssueType === 'stiffness' ? 'Beginner/Intermediate' : 
                       selectedIssueType === 'tiredness' ? 'Beginner' : 
                       selectedIssueType === 'flexibility' ? 'Intermediate/Advanced' : 
                       'Beginner'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Focus:</Text>
                    <Text style={[styles.summaryValue, { color: theme.text }]}>
                      {parsedInput?.parsedActivity ? 
                        `${parsedInput.parsedActivity} recovery` : 
                        'Desk-friendly stretches'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowFollowUp(false)}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  introContainer: {
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  voiceButton: {
    padding: 10,
    borderRadius: 25,
    marginLeft: 8,
  },
  submitButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  helpSection: {
    marginBottom: 20,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  examplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
    width: '48%',
  },
  exampleIcon: {
    marginRight: 6,
  },
  exampleText: {
    fontSize: 13,
    flexShrink: 1,
  },
  voiceNote: {
    fontSize: 12,
    marginTop: 12,
    fontStyle: 'italic',
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  issueContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  issueButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 10,
  },
  selectedIssue: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  issueText: {
    fontSize: 15,
    fontWeight: '500',
  },
  selectedIssueText: {
    color: '#fff',
    fontWeight: '600',
  },
  durationContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  durationButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedDuration: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  durationSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  selectedDurationText: {
    color: '#fff',
  },
  generateButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 16,
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  questionNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  questionNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  summarySectionContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  summaryBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 70,
  },
  summaryValue: {
    fontSize: 14,
    flex: 1,
  },
});

export default SmartRoutineGenerator;
