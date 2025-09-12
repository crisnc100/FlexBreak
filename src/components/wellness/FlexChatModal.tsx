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
import aiWellnessService from '../../services/ai/core/aiWellnessService';
import { AI_CONFIG } from '../../config/aiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import voiceRecordingService from '../../services/ai/integrations/voiceRecordingService';
import memoryService from '../../services/ai/memory/memoryService';
import { KEYS } from '../../services/storageService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_HEIGHT = 120;
const MAX_HEIGHT = SCREEN_HEIGHT * 0.85;
const COLLAPSED_HEIGHT = 80;
const CONVERSATION_EXPIRY_HOURS = 2; // Conversations expire after 2 hours

// Typewriter effect configuration - EASY TO TOGGLE ON/OFF
const ENABLE_TYPEWRITER_EFFECT = true; // Set to false to revert to original behavior
const TYPEWRITER_BASE_SPEED = 30; // Base speed for short messages
const TYPEWRITER_FAST_SPEED = 15; // Faster speed for long messages
const TYPEWRITER_THRESHOLD = 100; // Character count to switch to fast speed
const ENABLE_HAPTICS = true; // Set to false to disable haptics
const HAPTIC_INTERVAL = 3; // Haptic feedback every N characters (to reduce battery drain)

interface Message {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: Date;
  // suggestedActions removed - no longer showing quick reply buttons
  role?: 'user' | 'assistant'; // Added for compatibility
  content?: string; // Added for compatibility
  quickReplies?: any[]; // Added for compatibility
  isTypewriting?: boolean; // Flag to enable typewriter effect
  routineParams?: import('../../types').RoutineParams; // Optional routine params for CTA
}

interface FlexChatModalProps {
  visible: boolean;
  onClose: () => void;
}

// Typewriter component for animated text
const TypewriterText: React.FC<{
  text: string;
  style: any;
  onComplete?: () => void;
  isActive: boolean;
}> = ({ text, style, onComplete, isActive }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (!isActive || !ENABLE_TYPEWRITER_EFFECT) {
      setDisplayedText(text);
      onComplete?.();
      return;
    }
    
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text, isActive]);
  
  useEffect(() => {
    if (!isActive || !ENABLE_TYPEWRITER_EFFECT || currentIndex >= text.length) {
      if (currentIndex >= text.length) {
        onComplete?.();
      }
      return;
    }
    
    const timer = setTimeout(() => {
      setDisplayedText(prev => prev + text[currentIndex]);
      setCurrentIndex(currentIndex + 1);
      
      // Haptic feedback at intervals
      if (ENABLE_HAPTICS && currentIndex % HAPTIC_INTERVAL === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, text.length > TYPEWRITER_THRESHOLD ? TYPEWRITER_FAST_SPEED : TYPEWRITER_BASE_SPEED);
    
    return () => clearTimeout(timer);
  }, [currentIndex, text, isActive, onComplete]);
  
  return <Text style={style}>{displayedText}</Text>;
};

export const FlexChatModal: React.FC<FlexChatModalProps> = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showVoiceIntro, setShowVoiceIntro] = useState(false);
  const [currentTypewritingId, setCurrentTypewritingId] = useState<string | null>(null);
  const [aiWellnessEnabled, setAiWellnessEnabled] = useState<boolean | null>(null);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentHeight = useRef(new Animated.Value(MAX_HEIGHT * 0.7)).current;
  const collapseAnim = useRef(new Animated.Value(1)).current;
  const recordingPulse = useRef(new Animated.Value(1)).current;
  const voiceButtonGlow = useRef(new Animated.Value(0)).current;
  const voiceButtonScale = useRef(new Animated.Value(1)).current;
  const soundWave1 = useRef(new Animated.Value(0)).current;
  const soundWave2 = useRef(new Animated.Value(0)).current;
  const soundWave3 = useRef(new Animated.Value(0)).current;

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
    console.log('[FlexChatModal] useEffect triggered - visible:', visible, 'isLoading:', isLoading);
    if (visible && !isLoading) {
      console.log('[FlexChatModal] Calling loadInitialState, animateIn, and startVoiceButtonGlow...');
      
      // Check AI Wellness status
      const checkAIWellnessStatus = async () => {
        const enabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED);
        setAiWellnessEnabled(enabled === 'true');
      };
      checkAIWellnessStatus();
      
      loadInitialState();
      animateIn();
      startVoiceButtonGlow();
    } else {
      console.log('[FlexChatModal] Skipping initialization - conditions not met');
    }
  }, [visible]);

  // Voice button glow animation
  const startVoiceButtonGlow = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(voiceButtonGlow, {
          toValue: 0.6,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(voiceButtonGlow, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Subtle intro animation for voice button when showing intro
  useEffect(() => {
    if (showVoiceIntro) {
      // Just a gentle single pulse
      Animated.sequence([
        Animated.timing(voiceButtonScale, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(voiceButtonScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showVoiceIntro]);

  // Save conversation to AsyncStorage
  const saveConversation = async (messagesToSave: Message[]) => {
    try {
      const conversationData = {
        messages: messagesToSave,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem('@flexchat_conversation', JSON.stringify(conversationData));
    } catch (error) {
      console.error('[FlexChatModal] Error saving conversation:', error);
    }
  };

  // Load conversation from AsyncStorage
  const loadSavedConversation = async (): Promise<Message[] | null> => {
    try {
      const savedData = await AsyncStorage.getItem('@flexchat_conversation');
      if (!savedData) return null;
      
      const conversationData = JSON.parse(savedData);
      const lastUpdated = new Date(conversationData.lastUpdated);
      const now = new Date();
      const hoursSinceLastUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      // If conversation is too old, return null
      if (hoursSinceLastUpdate > CONVERSATION_EXPIRY_HOURS) {
        await AsyncStorage.removeItem('@flexchat_conversation');
        return null;
      }
      
      // Convert saved messages back to proper Message objects
      return conversationData.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    } catch (error) {
      console.error('[FlexChatModal] Error loading conversation:', error);
      return null;
    }
  };

  const loadInitialState = async () => {
    console.log('[FlexChatModal] Loading initial state...');
    try {
      // Check for saved conversation first
      const savedMessages = await loadSavedConversation();
      
      if (savedMessages && savedMessages.length > 0) {
        // Resume previous conversation
        console.log('[FlexChatModal] Resuming previous conversation with', savedMessages.length, 'messages');
        setMessages(savedMessages);
        setConversationLoaded(true);
        
        // Scroll to bottom after a delay
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 300);
        return;
      }
      
      // No saved conversation, create new greeting
      console.log('[FlexChatModal] Starting new conversation...');
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      const memory = await memoryService.getMemory(userId);
      const userName = await AsyncStorage.getItem('@ai_wellness_user_name');
      
      const greeting = userName ? `Hi ${userName}! 👋` : 'Hi there! 👋';
      const followUp = memory.usage.totalInteractions > 0 
        ? "How have you been feeling since our last check-in?"
        : "How are you feeling today? I'm here to help you stay active and energized!";
      
      // Check if this is first time seeing voice feature
      const hasSeenVoiceIntro = await AsyncStorage.getItem('@ai_wellness_voice_intro_seen');
      let voiceIntro = '';
      if (!hasSeenVoiceIntro) {
        voiceIntro = '\n\n🎤 ✨ NEW: Try speaking to me! Tap the glowing microphone button to use your voice instead of typing. Just like having a conversation with a real wellness coach!';
        await AsyncStorage.setItem('@ai_wellness_voice_intro_seen', 'true');
        setShowVoiceIntro(true);
      }
      
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        message: `${greeting}\n\n${followUp}${voiceIntro}`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setConversationLoaded(true);
      console.log('[FlexChatModal] Set greeting message:', welcomeMessage.message.substring(0, 50) + '...');
    } catch (error) {
      console.error('[FlexChatModal] Error loading initial state:', error);
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
      // Don't clear messages - they'll be saved
      setIsCollapsed(false);
      setConversationLoaded(false);
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
    // Keep keyboard open for continuous conversation

    // P0.5: Enforce input clamp with brief notice
    let outboundText = messageText;
    try {
      const isPremium = (await AsyncStorage.getItem(KEYS.USER.PREMIUM)) === 'true';
      const maxLen = isPremium ? AI_CONFIG.limits.premium.maxInputLength : AI_CONFIG.limits.free.maxInputLength;
      if (outboundText.length > maxLen) {
        outboundText = outboundText.slice(0, maxLen);
        Alert.alert('Message trimmed', 'Your message was quite long, so I trimmed it to keep the reply concise.');
      }
    } catch {}

    // Add user message (possibly trimmed)
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      message: outboundText,
      timestamp: new Date(),
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Save conversation after adding user message
    await saveConversation(updatedMessages);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Process with AI
    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      // Pass conversation history to AI service for context
      // Limit to last 10 messages to prevent token overflow
      const recentMessages = messages.slice(-10);
      const result = await aiWellnessService.processWellnessCheckIn(
        outboundText, 
        userId,
        false, // isNotification
        recentMessages // Pass the recent conversation history
      );
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: result.response,
        timestamp: new Date(),
        isTypewriting: ENABLE_TYPEWRITER_EFFECT,
        routineParams: result.routineParams,
        // suggestedActions removed
      };
      
      const updatedMessagesWithAI = [...messages, userMessage, aiMessage];
      setMessages(updatedMessagesWithAI);
      
      // Save conversation after AI response
      await saveConversation(updatedMessagesWithAI);
      
      // Set this message as currently typewriting
      if (ENABLE_TYPEWRITER_EFFECT) {
        setCurrentTypewritingId(aiMessage.id);
      }
      
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
      const updatedMessagesWithError = [...messages, userMessage, errorMessage];
      setMessages(updatedMessagesWithError);
      await saveConversation(updatedMessagesWithError);
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
        
        if (transcribedText && transcribedText.trim().length > 0) {
          // Check if it's a temporary message
          if (transcribedText.includes("coming soon") || transcribedText.includes("disponible pronto")) {
            Alert.alert(
              "Voice Coming Soon! 🎙️",
              transcribedText,
              [{ text: "OK" }]
            );
          } else {
            // Real transcription - send it
            await handleSend(transcribedText);
          }
        } else {
          // Silent fail - no alert needed, just don't send anything
          console.log('No speech detected or transcription failed silently');
        }
        setIsLoading(false);
      }
    } else {
      // Start recording
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const started = await voiceRecordingService.startRecording();
      
      if (started) {
        setIsRecording(true);
        setShowVoiceIntro(false); // Hide intro once they start using voice
        
        // Start subtle recording animations
        Animated.parallel([
          // Gentle pulse animation for the button
          Animated.loop(
            Animated.sequence([
              Animated.timing(recordingPulse, {
                toValue: 1.1,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(recordingPulse, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
            ])
          ),
          // Subtle sound wave animations
          Animated.loop(
            Animated.stagger(300, [
              Animated.sequence([
                Animated.timing(soundWave1, { toValue: 0.4, duration: 800, useNativeDriver: true }),
                Animated.timing(soundWave1, { toValue: 0, duration: 800, useNativeDriver: true }),
              ]),
              Animated.sequence([
                Animated.timing(soundWave2, { toValue: 0.3, duration: 800, useNativeDriver: true }),
                Animated.timing(soundWave2, { toValue: 0, duration: 800, useNativeDriver: true }),
              ]),
              Animated.sequence([
                Animated.timing(soundWave3, { toValue: 0.2, duration: 800, useNativeDriver: true }),
                Animated.timing(soundWave3, { toValue: 0, duration: 800, useNativeDriver: true }),
              ]),
            ])
          ),
        ]).start();
      } else {
        Alert.alert(
          "Recording Failed",
          "Please check your microphone permissions.",
          [{ text: "OK" }]
        );
      }
    }
  };

  // handleSuggestedAction removed - no longer needed

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
        
        {/* Show different content based on AI Wellness status */}
        {aiWellnessEnabled === false ? (
          // AI Wellness is disabled - show enable message
          <View style={[styles.disabledContainer, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}>
            <View style={styles.disabledContent}>
              <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.accent} />
              </View>
              
              <Text style={[styles.disabledTitle, { color: theme.text }]}>
                AI Flex Coach is Disabled
              </Text>
              
              <Text style={[styles.disabledMessage, { color: theme.textSecondary }]}>
                To chat with your AI wellness coach, please enable it in settings.
              </Text>
              
              <TouchableOpacity
                style={[styles.enableButton, { backgroundColor: theme.accent }]}
                onPress={() => {
                  // Close modal and set flag to open settings
                  onClose();
                  setTimeout(() => {
                    AsyncStorage.setItem('@flexbreak:reopen_settings', 'true');
                    // Navigate to settings if navigation is available
                    if ((global as any).navigateToSettings) {
                      (global as any).navigateToSettings();
                    }
                  }, 300);
                }}
              >
                <Text style={styles.enableButtonText}>Go to Settings</Text>
                <Ionicons name="arrow-forward" size={20} color="#ffffff" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // AI Wellness is enabled - show normal chat interface
          <>

        {/* Chat Modal */}
        <Animated.View
          style={[
            styles.modal,
            {
              backgroundColor: theme.background,
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
                <View style={styles.headerRight}>
                  {/* New conversation button - only show if there's an existing conversation */}
                  {messages.length > 1 && !isCollapsed && (
                    <TouchableOpacity 
                      onPress={async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        await AsyncStorage.removeItem('@flexchat_conversation');
                        setConversationLoaded(false);
                        await loadInitialState();
                      }} 
                      style={styles.newChatButton}
                    >
                      <Ionicons name="refresh-outline" size={20} color={isDark ? '#ffffff' : '#1a1a2e'} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={toggleCollapse} style={styles.collapseButton}>
                    <Ionicons 
                      name={isCollapsed ? "chevron-up" : "chevron-down"} 
                      size={24} 
                      color={isDark ? '#ffffff' : '#1a1a2e'} 
                    />
                  </TouchableOpacity>
                </View>
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
                  {/* Show continuation indicator if resuming conversation */}
                  {conversationLoaded && messages.length > 1 && (
                    <View style={styles.continuationIndicator}>
                      <Text style={[styles.continuationText, { color: theme.textSecondary }]}>
                        Continuing previous conversation...
                      </Text>
                    </View>
                  )}
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
                          <View style={[styles.aiBubbleContent, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.03)' }]}>
                            {msg.isTypewriting && currentTypewritingId === msg.id ? (
                              <TypewriterText
                                text={msg.message}
                                style={[styles.messageText, { color: isDark ? '#ffffff' : theme.text }]}
                                isActive={true}
                                onComplete={() => {
                                  setCurrentTypewritingId(null);
                                  // Scroll to end when typewriting completes
                                  setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                  }, 100);
                                }}
                              />
                            ) : (
                              <Text style={[styles.messageText, { color: isDark ? '#ffffff' : theme.text }]}>
                                {msg.message}
                              </Text>
                            )}
                            {msg.type === 'ai' && msg.routineParams && (
                              <View style={[styles.routineCtaBox, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
                                <Text style={[styles.routineTitle, { color: theme.text }]}>Ready to start?</Text>
                                <Text style={[styles.routineMeta, { color: theme.textSecondary }]}>
                                  {msg.routineParams.area} • {msg.routineParams.duration} min • {msg.routineParams.position}
                                </Text>
                                <TouchableOpacity
                                  onPress={async () => {
                                    try {
                                      const userId = (await AsyncStorage.getItem('@user_id')) || 'anonymous';
                                      await memoryService.recordRoutineNote(userId, msg.routineParams!);
                                      if ((global as any).navigateToRoutine) {
                                        (global as any).navigateToRoutine(msg.routineParams!);
                                        // Close chat after navigating to routine
                                        onClose();
                                      } else {
                                        console.warn('[FlexChatModal] navigateToRoutine not available');
                                      }
                                    } catch (e) {
                                      console.error('[FlexChatModal] Failed to navigate to Routine', e);
                                    }
                                  }}
                                  style={[styles.startButton, { backgroundColor: theme.accent }]}
                                  activeOpacity={0.9}
                                >
                                  <Text style={styles.startButtonText}>Start Routine</Text>
                                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                      {/* Suggested Actions removed - users type their own responses */}
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
                  <View style={[styles.recordingIndicator, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }]}>
                    <LinearGradient
                      colors={isDark ? ['rgba(239, 68, 68, 0.25)', 'rgba(239, 68, 68, 0.15)'] : ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.08)']}
                      style={styles.recordingIndicatorContent}
                    >
                      <View style={styles.recordingIconContainer}>
                        <Animated.View style={[
                          styles.recordingDot, 
                          { opacity: recordingPulse }
                        ]} />
                        <Ionicons name="radio-outline" size={16} color="#ef4444" style={{ marginLeft: 4 }} />
                      </View>
                      <Text style={styles.recordingText}>
                        🎙️ Listening... Tap mic to send
                      </Text>
                    </LinearGradient>
                  </View>
                )}

                {/* Input Area */}
                <View style={[styles.inputContainer, { 
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  marginBottom: keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0,
                }]}>
                    <TouchableOpacity 
                      onPress={handleVoiceRecord}
                      style={styles.voiceButtonContainer}
                      activeOpacity={0.8}
                    >
                      <Animated.View style={[
                        styles.voiceButtonWrapper,
                        {
                          transform: [
                            { scale: recordingPulse },
                            { scale: voiceButtonScale }
                          ]
                        }
                      ]}>
                        {/* Glow effect */}
                        <Animated.View style={[
                          styles.voiceButtonGlow,
                          {
                            opacity: isRecording ? 0 : voiceButtonGlow,
                            backgroundColor: showVoiceIntro ? '#4ade80' : 'transparent'
                          }
                        ]} />
                        
                        {/* Main button */}
                        <LinearGradient
                          colors={isRecording 
                            ? ['#ef4444', '#dc2626'] 
                            : showVoiceIntro 
                              ? ['#4ade80', '#22c55e', '#16a34a']
                              : ['#4ade80', '#22c55e']
                          }
                          style={[
                            styles.voiceButton,
                            isRecording && styles.voiceButtonActive
                          ]}
                        >
                          <Ionicons 
                            name={isRecording ? "mic" : "mic"} 
                            size={isRecording ? 28 : 26} 
                            color="#ffffff" 
                          />
                        </LinearGradient>
                        
                        {/* Recording sound waves */}
                        {isRecording && (
                          <View style={styles.soundWaves}>
                            <Animated.View style={[
                              styles.soundWave,
                              { 
                                opacity: soundWave1,
                                transform: [{ scale: soundWave1.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [1, 1.8]
                                })}]
                              }
                            ]} />
                            <Animated.View style={[
                              styles.soundWave,
                              { 
                                opacity: soundWave2,
                                transform: [{ scale: soundWave2.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [1, 2.2]
                                })}]
                              }
                            ]} />
                            <Animated.View style={[
                              styles.soundWave,
                              { 
                                opacity: soundWave3,
                                transform: [{ scale: soundWave3.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [1, 2.6]
                                })}]
                              }
                            ]} />
                          </View>
                        )}
                        
                        {/* NEW badge for voice intro */}
                        {showVoiceIntro && !isRecording && (
                          <View style={styles.newBadge}>
                            <LinearGradient
                              colors={['#fbbf24', '#f59e0b']}
                              style={styles.newBadgeGradient}
                            >
                              <Text style={styles.newBadgeText}>NEW</Text>
                            </LinearGradient>
                          </View>
                        )}
                      </Animated.View>
                    </TouchableOpacity>

                    <TextInput
                      style={[styles.input, { 
                        color: theme.text,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                      }]}
                      placeholder={isRecording 
                        ? "🎙️ Recording... Tap mic to stop" 
                        : showVoiceIntro 
                          ? "Try voice! 🎤 Or type here..."
                          : "Type your message or use voice 🎤"
                      }
                      placeholderTextColor={theme.textSecondary}
                      value={message}
                      onChangeText={setMessage}
                      onSubmitEditing={() => handleSend()}
                      returnKeyType="send"
                      multiline
                      // Allow longer input in UI; we'll clamp per tier in handler
                      maxLength={1000}
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
                style={[styles.minimizedBar, { backgroundColor: isDark ? 'rgba(74, 222, 128, 0.1)' : 'rgba(34, 197, 94, 0.1)' }]}
                onPress={toggleCollapse}
                activeOpacity={0.8}
              >
                <Text style={styles.minimizedText}>Tap to continue conversation</Text>
                <Ionicons name="chatbubble-ellipses" size={20} color="#4ade80" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
        </>
        )}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newChatButton: {
    padding: 4,
    marginRight: 8,
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
  // Routine CTA styles
  routineCtaBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  routineTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  routineMeta: {
    fontSize: 13,
    marginBottom: 10,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  startButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  // Styles removed - no longer showing suggested actions
  // suggestedActions: {
  //   flexDirection: 'row',
  //   flexWrap: 'wrap',
  //   marginTop: 8,
  //   gap: 8,
  // },
  // actionChip: {
  //   paddingHorizontal: 14,
  //   paddingVertical: 8,
  //   borderRadius: 16,
  //   borderWidth: 1,
  // },
  // actionText: {
  //   fontSize: 13,
  // },
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
  },
  voiceButtonContainer: {
    marginRight: 12,
    position: 'relative',
  },
  voiceButtonWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.3,
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  voiceButtonActive: {
    shadowColor: '#ef4444',
    shadowOpacity: 0.5,
  },
  soundWaves: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundWave: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  newBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
  },
  newBadgeGradient: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
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
    color: '#4ade80',
    fontWeight: '500',
  },
  recordingIndicator: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  recordingIndicatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  recordingIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  recordingText: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '600',
  },
  // Disabled state styles
  disabledContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 350,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  disabledTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  disabledMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  enableButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 16,
  },
  continuationIndicator: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  continuationText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
