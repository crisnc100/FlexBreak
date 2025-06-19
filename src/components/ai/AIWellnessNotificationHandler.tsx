import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import aiWellnessService from '../../services/ai/aiWellnessService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../services/storageService';

interface AIWellnessModalProps {
  visible: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export const AIWellnessModal: React.FC<AIWellnessModalProps> = ({ 
  visible, 
  onClose,
  initialMessage = "Hey! How's your body and mind feeling today?"
}) => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const loadUserName = async () => {
      const name = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
      setUserName(name);
    };
    loadUserName();
  }, []);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      const result = await aiWellnessService.processWellnessCheckIn(message, userId);
      setResponse(result.response);
      setMessage('');
    } catch (error) {
      setResponse("Oops! Something went wrong. Try again or check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const greeting = userName ? `Hey ${userName}!` : 'Hey there!';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.content, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>AI Flex Coach 🤖</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.chatContainer}>
            <View style={[styles.messageBubble, { backgroundColor: theme.surface }]}>
              <Text style={[styles.messageText, { color: theme.text }]}>
                {greeting} {initialMessage}
              </Text>
            </View>

            {response ? (
              <View style={[styles.messageBubble, styles.responseBubble, { backgroundColor: theme.accent + '20' }]}>
                <Text style={[styles.messageText, { color: theme.text }]}>
                  {response}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.surface, 
                color: theme.text,
                borderColor: theme.border 
              }]}
              placeholder="Type your response..."
              placeholderTextColor={theme.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={200}
              editable={!isLoading}
            />
            <TouchableOpacity 
              style={[styles.sendButton, { 
                backgroundColor: theme.accent,
                opacity: isLoading || !message.trim() ? 0.5 : 1 
              }]}
              onPress={handleSend}
              disabled={isLoading || !message.trim()}
            >
              {isLoading ? (
                <Text style={styles.sendButtonText}>...</Text>
              ) : (
                <Ionicons name="send" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.helpText, { color: theme.textSecondary }]}>
            💡 Tip: You can also reply directly in notifications by tapping and holding!
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
    minHeight: 200,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: '80%',
  },
  responseBubble: {
    alignSelf: 'flex-end',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});