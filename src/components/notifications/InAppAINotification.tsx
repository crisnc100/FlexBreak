import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import aiWellnessService from '../../services/ai/core/aiWellnessService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from 'react-native-toast-notifications';

interface InAppAINotificationProps {
  visible: boolean;
  onDismiss: () => void;
}

export const InAppAINotification: React.FC<InAppAINotificationProps> = ({ 
  visible, 
  onDismiss 
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in from top
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Slide out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -200,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  const handleQuickResponse = async (response: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      const result = await aiWellnessService.processWellnessCheckIn(response, userId);
      
      // Show AI response as toast
      toast.show(result.response, {
        type: 'success',
        placement: 'bottom',
        duration: 4000,
      });
      
      onDismiss();
    } catch (error) {
      toast.show('Failed to process response', { type: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;
    
    const messageToSend = message.trim();
    setMessage('');
    Keyboard.dismiss();
    
    await handleQuickResponse(messageToSend);
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={{
        position: 'absolute',
        top: insets.top,
        left: 0,
        right: 0,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        zIndex: 1000,
      }}
    >
      <View 
        style={{
          backgroundColor: theme.cardBackground,
          marginHorizontal: 12,
          marginTop: 8,
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, marginRight: 6 }}>🤖</Text>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              color: theme.text 
            }}>
              AI Wellness Check
            </Text>
          </View>
          <TouchableOpacity onPress={onDismiss}>
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Message */}
        <Text style={{
          fontSize: 14,
          color: theme.textSecondary,
          paddingHorizontal: 16,
          marginBottom: 12,
        }}>
          How are you feeling right now?
        </Text>

        {/* Quick Actions */}
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          marginBottom: 12,
          gap: 8,
        }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: theme.accent + '20',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 20,
              alignItems: 'center',
            }}
            onPress={() => handleQuickResponse("I'm feeling good!")}
            disabled={isLoading}
          >
            <Text style={{ fontSize: 14 }}>😊 Good</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: theme.accent + '20',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 20,
              alignItems: 'center',
            }}
            onPress={() => handleQuickResponse("I'm feeling stressed")}
            disabled={isLoading}
          >
            <Text style={{ fontSize: 14 }}>😰 Stressed</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: theme.accent + '20',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 20,
              alignItems: 'center',
            }}
            onPress={() => handleQuickResponse("I'm feeling tired")}
            disabled={isLoading}
          >
            <Text style={{ fontSize: 14 }}>😓 Tired</Text>
          </TouchableOpacity>
        </View>

        {/* Text Input */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingBottom: 12,
          gap: 8,
        }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: theme.surface,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              fontSize: 14,
              color: theme.text,
              borderWidth: 1,
              borderColor: theme.border,
            }}
            placeholder="Or type your response..."
            placeholderTextColor={theme.textSecondary}
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            editable={!isLoading}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!message.trim() || isLoading}
            style={{
              backgroundColor: theme.accent,
              width: 32,
              height: 32,
              borderRadius: 16,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: (!message.trim() || isLoading) ? 0.5 : 1,
            }}
          >
            {isLoading ? (
              <Ionicons name="hourglass" size={16} color="#FFF" />
            ) : (
              <Ionicons name="send" size={16} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};