import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  PanResponder,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import aiWellnessService from '../../services/ai/aiWellnessService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import voiceRecordingService from '../../services/ai/voiceRecordingService';
import wellnessMemory from '../../services/ai/wellnessMemory';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_HEIGHT = 120;
const MAX_HEIGHT = SCREEN_HEIGHT * 0.85;
const COLLAPSED_HEIGHT = 80;

interface Message {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: Date;
  suggestedActions?: string[];
}

interface FlexChatModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FlexChatModal: React.FC<FlexChatModalProps> = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentHeight = useRef(new Animated.Value(MAX_HEIGHT * 0.7)).current;
  const collapseAnim = useRef(new Animated.Value(1)).current;
  const recordingPulse = useRef(new Animated.Value(1)).current;

  // Pan responder for drag to dismiss/collapse
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 0; // Only respond to downward swipes
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          // Close if dragged down more than 150px
          handleClose();
        } else if (gestureState.dy > 50) {
          // Collapse if dragged down more than 50px
          toggleCollapse();
        } else {
          // Spring back to position
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
          }).start();
        }
      },
    })
  ).current;

  // Keyboard handling
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Auto scroll to bottom when keyboard opens
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Load initial state when modal opens
  useEffect(() => {
    if (visible && !isLoading) {
      loadInitialState();
      animateIn();
    }
  }, [visible]);

  const loadInitialState = async () => {
    try {
      // Check for stored response from notification
      const storedResponse = await AsyncStorage.getItem('@ai_wellness_last_response');
      if (storedResponse) {
        const { response, timestamp } = JSON.parse(storedResponse);
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          const aiMessage: Message = {
            id: Date.now().toString(),
            type: 'ai',
            message: response,
            timestamp: new Date(timestamp),
            suggestedActions: ['I feel better now', 'Tell me more', 'Suggest a stretch'],
          };
          setMessages([aiMessage]);
        }
        await AsyncStorage.removeItem('@ai_wellness_last_response');
      } else {
        // Load greeting message
        const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
        const memory = await wellnessMemory.getMemory(userId);
        const userName = await AsyncStorage.getItem('@ai_wellness_user_name');
        
        const greeting = userName ? `Hi ${userName}! 👋` : 'Hi there! 👋';
        const followUp = memory.totalInteractions > 0 
          ? "How have you been feeling since our last check-in?"
          : "How are you feeling today? I'm here to help you stay active and energized!";
        
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          message: `${greeting}\n\n${followUp}`,
          timestamp: new Date(),
          suggestedActions: ['Feeling good 😊', 'A bit tired 😴', 'Need a stretch 🤸'],
        };
        setMessages([welcomeMessage]);
      }

      // Check if voice mode was requested
      const voiceMode = await AsyncStorage.getItem('@ai_wellness_voice_mode');
      if (voiceMode === 'true') {
        await AsyncStorage.removeItem('@ai_wellness_voice_mode');
        // Auto-start voice recording after a small delay
        setTimeout(() => handleVoiceRecord(), 500);
      }
    } catch (error) {
      console.error('Error loading initial state:', error);
    }
  };

  const animateIn = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 8,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMessages([]);
      setIsCollapsed(false);
      onClose();
    });
  };

  const toggleCollapse = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const toValue = isCollapsed ? 1 : 0;
    setIsCollapsed(!isCollapsed);
    
    Animated.spring(collapseAnim, {
      toValue,
      useNativeDriver: true,
      tension: 40,
    }).start();
  };

  const handleSend = async (text?: string) => {
    const messageText = text || message.trim();
    if (!messageText || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Clear input
    setMessage('');
    Keyboard.dismiss();

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      message: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Process with AI
    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      const result = await aiWellnessService.processWellnessCheckIn(messageText, userId);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: result.response,
        timestamp: new Date(),
        suggestedActions: result.suggestedActions || ['Tell me more', 'Suggest a stretch', 'That helps!'],
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: "I'm having trouble connecting. Please try again!",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      // Stop recording
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsRecording(false);
      
      const audioUri = await voiceRecordingService.stopRecording();
      if (audioUri) {
        setIsLoading(true);
        const transcribedText = await voiceRecordingService.transcribeAudio(audioUri);
        
        if (transcribedText) {
          // Check if it's a temporary message
          if (transcribedText.includes("coming soon") || transcribedText.includes("disponible pronto")) {
            Alert.alert(
              "Voice Coming Soon! 🎙️",
              transcribedText,
              [{ text: "OK" }]
            );
          } else {
            // Real transcription
            await handleSend(transcribedText);
          }
        } else {
          Alert.alert(
            "Voice Error",
            "Could not process voice recording. Please try typing instead.",
            [{ text: "OK" }]
          );
        }
        setIsLoading(false);
      }
    } else {
      // Start recording
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const started = await voiceRecordingService.startRecording();
      
      if (started) {
        setIsRecording(true);
        // Start pulse animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(recordingPulse, {
              toValue: 1.5,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(recordingPulse, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ])
        ).start();
      } else {
        Alert.alert(
          "Recording Failed",
          "Please check your microphone permissions.",
          [{ text: "OK" }]
        );
      }
    }
  };

  const handleSuggestedAction = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSend(action);
  };

  const modalHeight = isCollapsed ? COLLAPSED_HEIGHT : MAX_HEIGHT * 0.7;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View 
          style={[
            styles.backdrop,
            { opacity: backdropOpacity }
          ]}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject} 
            onPress={handleClose}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Chat Modal */}
        <Animated.View
          style={[
            styles.modal,
            {
              height: keyboardHeight > 0 ? SCREEN_HEIGHT * 0.95 : modalHeight + insets.bottom,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.content, { paddingBottom: insets.bottom }]}>
            {/* Drag Handle */}
            <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
              <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
            </View>

            {/* Header */}
            <LinearGradient
              colors={isDark ? ['#1a1a2e', '#16213e'] : ['#e8f5e9', '#c8e6c9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.header}
            >
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <LinearGradient
                    colors={['#4ade80', '#22c55e']}
                    style={styles.avatarContainer}
                  >
                    <Text style={styles.avatar}>✨</Text>
                  </LinearGradient>
                  <View>
                    <Text style={[styles.title, { color: isDark ? '#ffffff' : '#1a1a2e' }]}>AI Flex Coach</Text>
                    <Text style={[styles.subtitle, { color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(26, 26, 46, 0.7)' }]}>
                      {isCollapsed ? 'Tap to expand' : 'Your personal wellness companion'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={toggleCollapse} style={styles.collapseButton}>
                  <Ionicons 
                    name={isCollapsed ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={isDark ? '#ffffff' : '#1a1a2e'} 
                  />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {!isCollapsed && (
              <Animated.View 
                style={[
                  styles.chatContainer,
                  { opacity: collapseAnim }
                ]}
              >
                {/* Messages */}
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.messagesContainer}
                  contentContainerStyle={[styles.messagesContent, { paddingBottom: keyboardHeight > 0 ? 20 : 80 }]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {messages.map((msg) => (
                    <View key={msg.id} style={styles.messageWrapper}>
                      <View
                        style={[
                          styles.messageBubble,
                          msg.type === 'user' ? styles.userBubble : styles.aiBubble,
                        ]}
                      >
                        {msg.type === 'user' ? (
                          <LinearGradient
                            colors={['#4ade80', '#22c55e']}
                            style={styles.gradientBubble}
                          >
                            <Text style={[styles.messageText, { color: '#ffffff' }]}>
                              {msg.message}
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View style={[styles.aiBubbleContent, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]}>
                            <Text style={[styles.messageText, { color: theme.text }]}>
                              {msg.message}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Suggested Actions */}
                      {msg.type === 'ai' && msg.suggestedActions && (
                        <View style={styles.suggestedActions}>
                          {msg.suggestedActions.map((action, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.actionChip,
                                { 
                                  backgroundColor: isDark ? 'rgba(74, 222, 128, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                  borderColor: '#4ade80',
                                }
                              ]}
                              onPress={() => handleSuggestedAction(action)}
                              disabled={isLoading}
                            >
                              <Text style={[styles.actionText, { color: '#22c55e' }]}>
                                {action}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                  
                  {isLoading && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={theme.accent} />
                      <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                        Coach is thinking...
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Recording Indicator */}
                {isRecording && (
                  <LinearGradient
                    colors={['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)']}
                    style={styles.recordingIndicator}
                  >
                    <Animated.View style={[styles.recordingDot, { transform: [{ scale: recordingPulse }] }]} />
                    <Text style={styles.recordingText}>Recording... Tap mic to send</Text>
                  </LinearGradient>
                )}

                {/* Input Area */}
                <View style={[styles.inputContainer, { 
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: isDark ? 'rgba(74, 222, 128, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                  marginBottom: keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0,
                }]}>
                    <TouchableOpacity 
                      onPress={handleVoiceRecord}
                      style={[
                        styles.voiceButton,
                        isRecording && styles.voiceButtonActive
                      ]}
                    >
                      <Ionicons 
                        name={isRecording ? "mic" : "mic-outline"} 
                        size={24} 
                        color={isRecording ? '#ef4444' : '#4ade80'} 
                      />
                    </TouchableOpacity>

                    <TextInput
                      style={[styles.input, { 
                        color: theme.text,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                      }]}
                      placeholder={isRecording ? "Recording... Tap mic to stop" : "Type your message..."}
                      placeholderTextColor={theme.textSecondary}
                      value={message}
                      onChangeText={setMessage}
                      onSubmitEditing={() => handleSend()}
                      returnKeyType="send"
                      multiline
                      maxLength={500}
                      editable={!isLoading && !isRecording}
                    />

                    <TouchableOpacity
                      onPress={() => handleSend()}
                      disabled={!message.trim() || isLoading}
                      style={[
                        styles.sendButton,
                        (!message.trim() || isLoading) && styles.sendButtonDisabled
                      ]}
                    >
                      <Ionicons 
                        name="send" 
                        size={20} 
                        color={!message.trim() || isLoading ? theme.textSecondary : '#22c55e'} 
                      />
                    </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* Minimized Bar */}
            {isCollapsed && (
              <TouchableOpacity 
                style={styles.minimizedBar}
                onPress={toggleCollapse}
                activeOpacity={0.8}
              >
                <Text style={styles.minimizedText}>Tap to continue conversation</Text>
                <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  modal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 24,
  },
  content: {
    flex: 1,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  collapseButton: {
    padding: 4,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingBottom: 16,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  gradientBubble: {
    padding: 14,
    borderRadius: 18,
  },
  aiBubbleContent: {
    padding: 14,
    borderRadius: 18,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  suggestedActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  actionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  voiceButtonActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  minimizedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  minimizedText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
});