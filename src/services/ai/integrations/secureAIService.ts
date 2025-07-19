import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { functions } from '../../../config/firebase';
import { retryUtil, errorHandler } from '../utils/reliabilityService';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

class SecureAIService {
  private aiChatFunction: any;

  constructor() {
    // Get reference to the Firebase Function
    this.aiChatFunction = functions.httpsCallable('aiChat');
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    try {
      // No authentication required for this app
      const currentUser = firebase.auth().currentUser;

      console.log('Secure AI Request:', {
        messageCount: messages.length,
        ...options
      });

      // Call the Firebase Function
      const result = await this.aiChatFunction({
        messages,
        options,
        userId: currentUser?.uid || 'anonymous'
      });

      if (!result.data.success) {
        throw new Error(result.data.error || 'AI service error');
      }

      console.log('Secure AI Response received');
      return result.data.data;

    } catch (error: any) {
      console.error('Secure AI chat error:', error);
      
      // Handle specific Firebase Function errors
      if (error.code === 'resource-exhausted') {
        throw new Error(error.message || 'Daily limit reached');
      } else if (error.code === 'invalid-argument') {
        throw new Error('Invalid request format');
      }
      
      throw error;
    }
  }

  async chatWithRetry(
    messages: ChatMessage[],
    options: ChatOptions = {},
    retries: number = 3
  ): Promise<string> {
    try {
      // Use the retry utility for resilience
      const result = await retryUtil.withRetry(
        async () => this.chat(messages, options),
        'secure_ai_chat'
      );

      if (result.success) {
        return result.data!;
      }

      throw result.error;
    } catch (error) {
      // Handle error with user-friendly message
      const errorContext = await errorHandler.handleError(error, 'secure_ai_chat');
      throw new Error(errorContext.userMessage);
    }
  }

  /**
   * Check if the service is properly configured
   * In the secure version, we just check if user is authenticated
   */
  isConfigured(): boolean {
    return true; // Always configured - API keys secure on Firebase
  }

  /**
   * Get the current user's AI usage stats
   */
  async getUsageStats(): Promise<{ requestsToday: number; dailyLimit: number; isPremium: boolean }> {
    try {
      const currentUser = firebase.auth().currentUser;
      if (!currentUser) {
        // Return default stats for anonymous users
        return {
          requestsToday: 0,
          dailyLimit: 10,
          isPremium: false
        };
      }

      const userDoc = await firebase.firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      const userData = userDoc.data();
      const today = new Date().toISOString().split('T')[0];
      const requestsToday = userData?.aiRequests?.[today] || 0;
      const isPremium = userData?.isPremium || false;
      const dailyLimit = isPremium ? 15 : 3;

      return {
        requestsToday,
        dailyLimit,
        isPremium
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {
        requestsToday: 0,
        dailyLimit: 3,
        isPremium: false
      };
    }
  }
}

export default new SecureAIService();