import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  PanResponder,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
// Remove blur for now - causes issues
// import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import aiWellnessService from '../../services/ai/core/aiWellnessService';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { MoodTracker } from '../../services/ai/moodTracker'; // Removed for MVP
import voiceRecordingService from '../../services/ai/integrations/voiceRecordingService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUBBLE_SIZE = 65;
const EXPANDED_WIDTH = SCREEN_WIDTH * 0.9;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.5; // Half screen height for better fit

interface WellnessBubbleProps {
  visible: boolean;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
}

export const WellnessBubble: React.FC<WellnessBubbleProps> = ({
  visible,
  onClose,
  initialPosition = { x: SCREEN_WIDTH - BUBBLE_SIZE - 20, y: 100 }
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceMode, setShowVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState<Array<{
    type: 'user' | 'ai';
    message: string;
    timestamp: Date;
  }>>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation values - separate native and non-native
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  // Position must use non-native driver for dragging
  const position = useRef(new Animated.ValueXY(initialPosition)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isExpanded,
      onMoveShouldSetPanResponder: () => !isExpanded,
      onPanResponderGrant: () => {
        position.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        position.flattenOffset();
        
        // Snap to edges
        const currentX = (position.x as any)._value;
        const currentY = (position.y as any)._value;
        
        const snapX = currentX < SCREEN_WIDTH / 2 ? 20 : SCREEN_WIDTH - BUBBLE_SIZE - 20;
        const snapY = Math.max(insets.top + 20, Math.min(currentY, SCREEN_HEIGHT - BUBBLE_SIZE - insets.bottom - 20));
        
        Animated.spring(position, {
          toValue: { x: snapX, y: snapY },
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      },
    })
  ).current;

  // Show/hide animation
  useEffect(() => {
    if (visible) {
      // Check if voice mode was requested
      const checkVoiceMode = async () => {
        const voiceMode = await AsyncStorage.getItem('@ai_wellness_voice_mode');
        if (voiceMode === 'true') {
          setShowVoiceMode(true);
          setIsExpanded(true);
          await AsyncStorage.removeItem('@ai_wellness_voice_mode');
        }
      };
      
      // Check for stored response from notification
      const checkStoredResponse = async () => {
        try {
          const storedResponse = await AsyncStorage.getItem('@ai_wellness_last_response');
          if (storedResponse) {
            const { response, timestamp } = JSON.parse(storedResponse);
            // Only show if response is less than 5 minutes old
            if (Date.now() - timestamp < 5 * 60 * 1000) {
              const aiMessage = { type: 'ai' as const, message: response, timestamp: new Date(timestamp) };
              setConversation([aiMessage]);
              setIsExpanded(true);
            }
            // Clear the stored response
            await AsyncStorage.removeItem('@ai_wellness_last_response');
          }
        } catch (error) {
          console.error('Error checking stored response:', error);
        }
      };
      
      checkVoiceMode();
      checkStoredResponse();
      
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 40,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 40,
        }),
      ]).start();
      
      // Start pulse animation for minimized bubble
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
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
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Expand/collapse animation
  const toggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);
    
    Animated.spring(expandAnim, {
      toValue,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start();
  };

  const handleQuickResponse = async (emoji: string, text: string) => {
    setIsLoading(true);
    
    // Add user message to conversation
    const userMessage = { type: 'user' as const, message: text, timestamp: new Date() };
    setConversation(prev => [...prev, userMessage]);
    
    try {
      // Save mood
      // Mood tracking removed for MVP
      
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      const result = await aiWellnessService.processWellnessCheckIn(text, userId);
      
      // Add AI response to conversation
      const aiMessage = { type: 'ai' as const, message: result.response, timestamp: new Date() };
      setConversation(prev => [...prev, aiMessage]);
      
      setIsExpanded(true);
      
      // Scroll to bottom after adding messages
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      const errorMessage = { type: 'ai' as const, message: "I'm having trouble connecting. Please try again!", timestamp: new Date() };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    
    const text = message.trim();
    setMessage('');
    Keyboard.dismiss();
    
    await handleQuickResponse('💬', text);
  };

  const handleVoicePress = async () => {
    if (!showVoiceMode) {
      // First tap - activate voice mode
      setShowVoiceMode(true);
      return;
    }

    if (isRecording) {
      // Stop recording and transcribe
      setIsRecording(false);
      const audioUri = await voiceRecordingService.stopRecording();
      
      if (audioUri) {
        // Show loading state
        setIsLoading(true);
        
        // Transcribe the audio
        const transcribedText = await voiceRecordingService.transcribeAudio(audioUri);
        
        if (transcribedText) {
          setShowVoiceMode(false);
          await handleQuickResponse('🎙️', transcribedText);
        } else {
          Alert.alert(
            "Transcription Failed",
            "Sorry, I couldn't understand the audio. Please try again or type your message.",
            [{ text: "OK" }]
          );
        }
        
        setIsLoading(false);
      }
    } else {
      // Start recording
      const started = await voiceRecordingService.startRecording();
      
      if (started) {
        setIsRecording(true);
      } else {
        Alert.alert(
          "Recording Failed",
          "Unable to start recording. Please check your microphone permissions.",
          [{ text: "OK" }]
        );
      }
    }
  };

  if (!visible) return null;

  // Use state for size instead of animated values
  const currentWidth = isExpanded ? EXPANDED_WIDTH : BUBBLE_SIZE;
  const currentHeight = isExpanded ? EXPANDED_HEIGHT : BUBBLE_SIZE;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <View style={[
          styles.blurContainer, 
          { 
            backgroundColor: '#6366F1', // Indigo for calm wellness
            width: currentWidth,
            height: currentHeight,
          }
        ]}>
        {!isExpanded ? (
          // Minimized bubble with pulse animation
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity onPress={toggleExpand} style={styles.minimizedContent}>
              <View style={[styles.pulseCircle, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]} />
              <Text style={styles.bubbleEmoji}>💚</Text>
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          // Expanded content
          <View style={styles.expandedContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.bubbleIcon}>🤖</Text>
                <Text style={[styles.title, { color: '#FFFFFF' }]}>AI Wellness Coach</Text>
              </View>
              <TouchableOpacity onPress={toggleExpand} style={styles.closeButton}>
                <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {/* Conversation History */}
            <ScrollView 
              ref={scrollViewRef}
              style={styles.conversationContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.conversationContent}
            >
              {conversation.length === 0 ? (
                <Text style={[styles.question, { color: '#FFFFFF' }]}>
                  How are you feeling today?
                </Text>
              ) : (
                conversation.map((msg, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.messageContainer,
                      msg.type === 'user' ? styles.userMessage : styles.aiMessage
                    ]}
                  >
                    <Text style={styles.messageLabel}>
                      {msg.type === 'user' ? '👤 You' : '🤖 Coach'}
                    </Text>
                    <Text style={[
                      styles.messageText,
                      { color: msg.type === 'user' ? '#FFFFFF' : '#333' }
                    ]}>
                      {msg.message}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Voice mode indicator */}
            {showVoiceMode && (
              <View style={[styles.voiceModeIndicator, { 
                backgroundColor: isRecording ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 255, 255, 0.2)' 
              }]}>
                <Ionicons 
                  name={isRecording ? "mic" : "mic-outline"} 
                  size={24} 
                  color={isRecording ? "#FF3B30" : "#FFFFFF"} 
                />
                <Text style={[styles.voiceModeText, { color: '#FFFFFF' }]}>
                  {isRecording ? 'Recording... Tap mic to send' : 'Tap mic to start recording'}
                </Text>
              </View>
            )}

            {/* Text input with voice button */}
            <View style={[styles.inputContainer, { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: 'rgba(255, 255, 255, 0.3)' }]}>
              <TouchableOpacity 
                onPress={handleVoicePress}
                style={[styles.voiceButton, (showVoiceMode || isRecording) && { backgroundColor: isRecording ? 'rgba(255, 59, 48, 0.2)' : 'rgba(0, 0, 0, 0.1)' }]}
              >
                <Ionicons 
                  name={isRecording ? "mic" : (showVoiceMode ? "mic" : "mic-outline")} 
                  size={22} 
                  color={isRecording ? '#FF3B30' : (showVoiceMode ? '#6366F1' : '#666')} 
                />
              </TouchableOpacity>
              
              <TextInput
                style={[styles.input, { color: '#333' }]}
                placeholder="Type or tap 🎙️ for voice..."
                placeholderTextColor="#999"
                value={message}
                onChangeText={setMessage}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                multiline
                maxLength={200}
                editable={!isLoading}
              />
              
              <TouchableOpacity
                onPress={handleSend}
                disabled={!message.trim() || isLoading}
                style={[styles.sendButton, { 
                  backgroundColor: (!message.trim() || isLoading) ? 'transparent' : '#6366F1',
                  opacity: (!message.trim() || isLoading) ? 0.5 : 1 
                }]}
              >
                {isLoading ? (
                  <Ionicons name="hourglass" size={20} color="#6366F1" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Footer with dismiss and privacy */}
            <View style={styles.footer}>
              <TouchableOpacity 
                onPress={() => {
                  Alert.alert(
                    "Privacy Policy",
                    "FlexBreak AI Wellness only stores:\n\n• Anonymized mood patterns\n• Usage counts (no message content)\n• Effectiveness scores\n\nYour conversations are never saved. All data is automatically deleted after retention periods.\n\nFor full details, visit flexbreak-privacy-app.netlify.app",
                    [
                      { text: "View Full Policy", onPress: () => {
                        // In future, could open WebView or browser
                        Alert.alert("Visit flexbreak-privacy-app.netlify.app", "Open this link in your browser to view our complete privacy policy.");
                      }},
                      { text: "OK" }
                    ]
                  );
                }} 
                style={styles.privacyButton}
              >
                <Text style={[styles.privacyText, { color: 'rgba(255, 255, 255, 0.6)' }]}>Privacy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => {
                  setConversation([]); // Clear conversation when closing
                  setShowVoiceMode(false);
                  setIsRecording(false);
                  onClose();
                }} 
                style={styles.dismissButton}
              >
                <Text style={[styles.dismissText, { color: 'rgba(255, 255, 255, 0.8)' }]}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  blurContainer: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  minimizedContent: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleEmoji: {
    fontSize: 32,
  },
  pulseCircle: {
    position: 'absolute',
    width: BUBBLE_SIZE - 10,
    height: BUBBLE_SIZE - 10,
    borderRadius: (BUBBLE_SIZE - 10) / 2,
    opacity: 0.3,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  expandedContent: {
    flex: 1,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  conversationContainer: {
    flex: 1,
    marginBottom: 12,
  },
  conversationContent: {
    paddingBottom: 10,
  },
  messageContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  userMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  aiMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  messageLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubbleIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  question: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  aiResponse: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.7,
  },
  aiResponseText: {
    fontSize: 15,
    lineHeight: 22,
  },
  quickResponses: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  quickButton: {
    alignItems: 'center',
    padding: 8,
  },
  quickEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickText: {
    fontSize: 12,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    marginTop: 'auto',
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 60,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  sendButton: {
    marginLeft: 4,
    marginRight: 4,
    padding: 8,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  privacyButton: {
    padding: 4,
  },
  privacyText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    fontSize: 12,
  },
  voiceModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: 'center',
  },
  voiceModeText: {
    fontSize: 14,
    marginLeft: 8,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    marginRight: 4,
  },
});