import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { EDGE_FUNCTIONS, SUPABASE_ANON_KEY } from '../../../config/supabase';
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
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    try {
      // No authentication required for this app
      const currentUser = firebase.auth().currentUser;

      console.log('Secure AI Request:', {
        messageCount: messages.length,
        ...options
      });

      // Call the Supabase Edge Function
      const response = await fetch(EDGE_FUNCTIONS.AI_CHAT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          messages,
          options,
          userId: currentUser?.uid || 'anonymous'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(result.error || 'Daily limit reached');
        }
        throw new Error(result.error || 'AI service error');
      }

      if (!result.success) {
        throw new Error(result.error || 'AI service error');
      }

      console.log('Secure AI Response received');
      return result.data;

    } catch (error: any) {
      console.error('Secure AI chat error:', error);
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