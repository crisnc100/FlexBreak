import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Modal, ScrollView, Animated, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import aiWellnessService from '../../services/ai/core/aiWellnessService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../services/storageService';
import { usePremium } from '../../context/PremiumContext';

interface AIWellnessModalProps {
  visible: boolean;
  onClose: () => void;
  initialMessage?: string;
}

// Quick response options for common wellness states
const QUICK_RESPONSES = [
  { emoji: '😊', text: 'Great!', fullText: "I'm feeling great today! Full of energy." },
  { emoji: '😐', text: 'Okay', fullText: "I'm feeling okay, nothing special but doing alright." },
  { emoji: '😓', text: 'Tired', fullText: "I'm feeling quite tired and could use some rest." },
  { emoji: '🤕', text: 'Sore', fullText: "I'm feeling sore, especially in my neck/back/shoulders." },
];

export const AIWellnessModal: React.FC<AIWellnessModalProps> = ({ 
  visible, 
  onClose,
  initialMessage = "Hey! How's your body and mind feeling today?"
}) => {
  const { theme } = useTheme();
  const { isPremium } = usePremium();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [showQuickResponses, setShowQuickResponses] = useState(true);
  const [conversationHistory, setConversationHistory] = useState<Array<{type: 'user' | 'ai', text: string}>>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isReady, setIsReady] = useState(false);
  
  // Ensure modal is ready before showing content
  useEffect(() => {
    if (visible) {
      setIsReady(true);
    } else {
      // Clean up when closing
      setTimeout(() => setIsReady(false), 300);
    }
  }, [visible]);

  const handleSend = async (messageToSend?: string) => {
    const textToSend = messageToSend || message.trim();
    if (!textToSend || isLoading) return;

    const userMessage = { type: 'user' as const, text: textToSend };
    setConversationHistory(prev => [...prev, userMessage]);
    setMessage('');
    setShowQuickResponses(false);
    setIsLoading(true);

    try {
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      const result = await aiWellnessService.processWellnessCheckIn(textToSend, userId);
      
      const aiMessage = { type: 'ai' as const, text: result.response };
      setConversationHistory(prev => [...prev, aiMessage]);
      
      // Check if AI wellness is disabled and show special handling
      if (result.category === 'disabled') {
        // Show settings button or close modal after showing message
        setTimeout(() => {
          Alert.alert(
            'AI Wellness Coach Disabled',
            'Would you like to enable it in settings?',
            [
              { text: 'Not Now', style: 'cancel', onPress: onClose },
              { text: 'Go to Settings', onPress: () => {
                onClose();
                // Navigate to settings if you have navigation available
              }}
            ]
          );
        }, 1500);
      }
      
      // Animate new message
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      const errorMessage = { type: 'ai' as const, text: "Oops! Something went wrong. Try again or check your connection." };
      setConversationHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickResponse = (response: typeof QUICK_RESPONSES[0]) => {
    handleSend(response.fullText);
  };

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setConversationHistory([]);
      setMessage('');
      setResponse('');
      setShowQuickResponses(true);
      setIsLoading(false);
      fadeAnim.setValue(0);
    }
  }, [visible]);


  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setIsReady(true)}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          {/* Drag Handle */}
          <View style={styles.dragHandle}>
            <View style={[styles.dragBar, { backgroundColor: theme.border }]} />
          </View>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.coachAvatar, { backgroundColor: theme.accent + '20' }]}>
                <Text style={styles.coachEmoji}>🤖</Text>
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>AI Flex Coach</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {isPremium ? 'Premium Wellness Support' : 'Wednesday Check-in'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Chat Area */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.chatContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Initial message */}
            <View style={[styles.aiMessageBubble, { backgroundColor: theme.background }]}>
              <Text style={[styles.messageText, { color: theme.text }]}>
                Hey! How are you feeling today? 💪
              </Text>
            </View>

            {/* Conversation history */}
            {conversationHistory.map((msg, index) => (
              <Animated.View 
                key={index}
                style={[
                  msg.type === 'user' ? styles.userMessageBubble : styles.aiMessageBubble,
                  { 
                    backgroundColor: msg.type === 'user' ? theme.accent : theme.background,
                    opacity: index === conversationHistory.length - 1 ? fadeAnim : 1 
                  }
                ]}
              >
                <Text style={[
                  styles.messageText, 
                  { color: msg.type === 'user' ? '#FFF' : theme.text }
                ]}>
                  {msg.text}
                </Text>
              </Animated.View>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <View style={[styles.aiMessageBubble, { backgroundColor: theme.background }]}>
                <View style={styles.typingIndicator}>
                  <Text style={[styles.typingDot, { color: theme.textSecondary }]}>●</Text>
                  <Text style={[styles.typingDot, { color: theme.textSecondary }]}>●</Text>
                  <Text style={[styles.typingDot, { color: theme.textSecondary }]}>●</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick Responses */}
          {showQuickResponses && !isLoading && (
            <View style={styles.quickResponseContainer}>
              <Text style={[styles.quickResponseTitle, { color: theme.textSecondary }]}>
                Quick responses:
              </Text>
              <View style={styles.quickResponseGrid}>
                {QUICK_RESPONSES.map((response, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.quickResponseButton, { 
                      backgroundColor: theme.background,
                      borderColor: theme.border 
                    }]}
                    onPress={() => handleQuickResponse(response)}
                  >
                    <Text style={styles.quickResponseEmoji}>{response.emoji}</Text>
                    <Text style={[styles.quickResponseText, { color: theme.text }]}>
                      {response.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Input Area */}
          <View style={[styles.inputContainer, { borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                color: theme.text,
                borderColor: theme.border 
              }]}
              placeholder="Type your response..."
              placeholderTextColor={theme.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={300}
              editable={!isLoading}
              onFocus={() => setShowQuickResponses(false)}
            />
            <TouchableOpacity 
              style={[styles.sendButton, { 
                backgroundColor: theme.accent,
                opacity: isLoading || !message.trim() ? 0.5 : 1 
              }]}
              onPress={() => handleSend()}
              disabled={isLoading || !message.trim()}
            >
              {isLoading ? (
                <Ionicons name="hourglass" size={20} color="#FFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Help text */}
          <Text style={[styles.helpText, { color: theme.textSecondary }]}>
            💡 Pro tip: Use "tap & hold" on notifications for faster replies!
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 0,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    maxHeight: '75%',
    minHeight: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  dragHandle: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coachAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  coachEmoji: {
    fontSize: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  chatContainer: {
    flex: 1,
    minHeight: 150,
    maxHeight: 250,
    paddingHorizontal: 4,
  },
  aiMessageBubble: {
    padding: 12,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    marginBottom: 10,
    maxWidth: '80%',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  userMessageBubble: {
    padding: 12,
    borderRadius: 18,
    borderTopRightRadius: 4,
    marginBottom: 10,
    maxWidth: '80%',
    alignSelf: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  typingDot: {
    fontSize: 12,
    marginRight: 3,
  },
  quickResponseContainer: {
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  quickResponseTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
    marginLeft: 2,
    opacity: 0.7,
  },
  quickResponseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickResponseButton: {
    width: '49%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  quickResponseEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  quickResponseText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 0.5,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 80,
    fontSize: 15,
    minHeight: 42,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  helpText: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    opacity: 0.6,
  },
});