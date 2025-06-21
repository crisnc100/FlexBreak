import openRouterService from './openRouterService';
import { WELLNESS_COACH_PROMPT, FALLBACK_RESPONSES } from './promptTemplates';
import { buildUserContext, categorizeInput } from './contextBuilder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_CONFIG } from '../../config/aiConfig';
import { KEYS } from '../storageService';
import responseCache from './responseCache';
import ConversationAnalytics from './conversationAnalytics';

export interface WellnessResponse {
  response: string;
  suggestedActions?: string[];
  category?: string;
  fallback?: boolean;
}

export class AIWellnessService {
  private conversationHistory: Map<string, any[]> = new Map();
  
  async processWellnessCheckIn(
    userInput: string,
    userId?: string
  ): Promise<WellnessResponse> {
    try {
      // Check day and usage limits for free users
      const accessCheck = await this.checkAccessAndLimits(userId);
      if (!accessCheck.canAccess) {
        return {
          response: accessCheck.message || "You've reached your AI wellness limit. Upgrade to premium for unlimited access!",
          category: 'limit_reached',
          suggestedActions: ['Upgrade to Premium']
        };
      }
      
      // Build context
      const context = await buildUserContext(userInput, userId);
      
      // Skip name collection - not needed anymore
      
      // Check cache first for common queries
      const cachedResponse = await responseCache.getCachedResponse(userInput, context.timeOfDay);
      if (cachedResponse) {
        console.log('Using cached response for common query');
        
        // Still track usage and conversation
        if (userId) {
          await this.storeConversation(userId, userInput, cachedResponse);
        }
        await this.trackUsage(userId);
        
        const category = categorizeInput(userInput);
        const suggestedActions = this.extractActions(cachedResponse);
        
        // Track analytics
        await ConversationAnalytics.trackConversation(
          userId || 'anonymous',
          userInput,
          cachedResponse,
          category,
          true // wasCached
        );
        
        return {
          response: cachedResponse,
          suggestedActions,
          category
        };
      }
      
      // Get effectiveness data for better suggestions
      const effectiveActions = await this.getEffectiveActions(userId);
      
      // Prepare messages
      const contextData: any = {
        timeOfDay: context.timeOfDay,
        dayOfWeek: context.dayOfWeek,
        effectiveActions: effectiveActions.length > 0 ? effectiveActions : undefined
      };
      
      if (context.userName) {
        contextData.userName = context.userName;
      }
      
      const messages = [
        {
          role: 'system' as const,
          content: WELLNESS_COACH_PROMPT
        },
        {
          role: 'user' as const,
          content: `Context: ${JSON.stringify(contextData)}\n\nUser says: ${userInput}`
        }
      ];
      
      // Add conversation history if exists
      if (userId && this.conversationHistory.has(userId)) {
        const history = this.conversationHistory.get(userId);
        // Only include last 2 exchanges to save tokens
        messages.push(...history.slice(-4));
      }
      
      // Get AI response
      const aiResponse = await openRouterService.chatWithRetry(messages, {
        model: AI_CONFIG.models.fast,
        maxTokens: 150,
        temperature: 0.7
      });
      
      // Parse response for actions
      const suggestedActions = this.extractActions(aiResponse);
      const category = categorizeInput(userInput);
      
      // Store in conversation history
      if (userId) {
        const history = this.conversationHistory.get(userId) || [];
        history.push(
          { role: 'user', content: userInput },
          { role: 'assistant', content: aiResponse }
        );
        this.conversationHistory.set(userId, history);
        
        // Store conversation to AsyncStorage for persistence
        await this.storeConversation(userId, userInput, aiResponse);
      }
      
      // Track usage
      await this.trackUsage(userId);
      
      // Track analytics
      await ConversationAnalytics.trackConversation(
        userId || 'anonymous',
        userInput,
        aiResponse,
        category,
        false // not cached
      );
      
      // If this was a welcome message response, schedule regular check-ins
      if (context.notificationData?.isWelcome) {
        const { scheduleRegularCheckInsAfterWelcome } = await import('./aiWellnessScheduler');
        await scheduleRegularCheckInsAfterWelcome();
      }
      
      return {
        response: aiResponse,
        suggestedActions,
        category
      };
      
    } catch (error) {
      console.error('AI Wellness processing error:', error);
      
      // Return fallback response
      return {
        response: this.getFallbackResponse(userInput),
        category: 'error',
        fallback: true
      };
    }
  }
  
  private async checkAccessAndLimits(userId?: string): Promise<{ canAccess: boolean; message?: string }> {
    if (!userId) {
      return { 
        canAccess: false, 
        message: "Please enable AI Wellness Coach in settings to get started!" 
      };
    }
    
    const isPremium = await AsyncStorage.getItem('@user_premium');
    
    // Check daily usage first (applies to all users)
    const todayStr = new Date().toDateString();
    const usageKey = `@ai_usage_${userId}_${todayStr}`;
    const usage = await AsyncStorage.getItem(usageKey);
    const usageCount = usage ? parseInt(usage) : 0;
    
    // Premium users have higher limits
    if (isPremium === 'true') {
      if (usageCount >= AI_CONFIG.limits.premium.dailyRequests) {
        return { 
          canAccess: false, 
          message: "You've reached your daily limit. Even premium users need breaks! 😊" 
        };
      }
      return { canAccess: true };
    }
    
    // Free users: Check if it's Wednesday (unless it's their first message today)
    const today = new Date().getDay();
    if (today !== 3 && usageCount > 0) {
      return { 
        canAccess: false, 
        message: "AI Wellness Coach is available on Wednesdays for free users. Upgrade to premium for daily access! 💎" 
      };
    }
    
    // Free users get 1 message any day as their first, then Wednesday only
    if (usageCount >= AI_CONFIG.limits.free.dailyRequests) {
      return { 
        canAccess: false, 
        message: "You've used your 3 free AI wellness chats for today. Come back next Wednesday or upgrade to premium for unlimited daily access! 🌟" 
      };
    }
    
    return { canAccess: true };
  }
  
  private async trackUsage(userId?: string): Promise<void> {
    if (!userId) return;
    
    const today = new Date().toDateString();
    const usageKey = `@ai_usage_${userId}_${today}`;
    const usage = await AsyncStorage.getItem(usageKey);
    const usageCount = usage ? parseInt(usage) : 0;
    
    await AsyncStorage.setItem(usageKey, (usageCount + 1).toString());
  }
  
  private async storeConversation(userId: string, userInput: string, aiResponse: string): Promise<void> {
    try {
      const conversationKey = `@ai_wellness_conversations_${userId}`;
      const existing = await AsyncStorage.getItem(conversationKey);
      const conversations = existing ? JSON.parse(existing) : [];
      
      conversations.push({
        timestamp: Date.now(),
        userInput,
        aiResponse,
        category: categorizeInput(userInput)
      });
      
      // Keep only last 50 conversations
      if (conversations.length > 50) {
        conversations.splice(0, conversations.length - 50);
      }
      
      await AsyncStorage.setItem(conversationKey, JSON.stringify(conversations));
    } catch (error) {
      console.error('Error storing conversation:', error);
    }
  }
  
  private extractActions(response: string): string[] {
    // Extract specific actions from the response
    const actions = [];
    const lowerResponse = response.toLowerCase();
    
    // Look for specific stretch types
    if (lowerResponse.includes('neck stretch') || lowerResponse.includes('neck roll')) {
      actions.push('neck stretches');
    } else if (lowerResponse.includes('shoulder')) {
      actions.push('shoulder rolls');
    } else if (lowerResponse.includes('back stretch') || lowerResponse.includes('cat-cow')) {
      actions.push('back stretches');
    } else if (lowerResponse.includes('stretch')) {
      actions.push('stretches');
    }
    
    if (lowerResponse.includes('walk')) actions.push('short walk');
    if (lowerResponse.includes('breathe') || lowerResponse.includes('breathing')) actions.push('breathing exercises');
    if (lowerResponse.includes('water') || lowerResponse.includes('hydrate')) actions.push('water break');
    if (lowerResponse.includes('eye') && lowerResponse.includes('rest')) actions.push('eye rest');
    
    // Only return the first action to avoid multiple effectiveness checks
    return actions.slice(0, 1);
  }
  
  
  private getFallbackResponse(input: string): string {
    const category = categorizeInput(input);
    
    if (FALLBACK_RESPONSES[category]) {
      return FALLBACK_RESPONSES[category];
    }
    
    return FALLBACK_RESPONSES.general;
  }
  
  async getConversationHistory(userId: string): Promise<any[]> {
    try {
      const conversationKey = `@ai_wellness_conversations_${userId}`;
      const data = await AsyncStorage.getItem(conversationKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }
  
  async clearConversationHistory(userId: string): Promise<void> {
    try {
      const conversationKey = `@ai_wellness_conversations_${userId}`;
      await AsyncStorage.removeItem(conversationKey);
      this.conversationHistory.delete(userId);
    } catch (error) {
      console.error('Error clearing conversation history:', error);
    }
  }
  
  private async getEffectiveActions(userId?: string): Promise<string[]> {
    if (!userId) return [];
    
    try {
      const summaryKey = `@ai_wellness_patterns_${userId}`;
      const existing = await AsyncStorage.getItem(summaryKey);
      if (!existing) return [];
      
      const summary = JSON.parse(existing);
      
      // Get actions with effectiveness >= 0.7 (70%)
      const effectiveActions = Object.entries(summary)
        .filter(([_, data]: [string, any]) => data.averageEffectiveness >= 0.7)
        .sort(([_, a]: [string, any], [__, b]: [string, any]) => 
          b.averageEffectiveness - a.averageEffectiveness
        )
        .slice(0, 3) // Top 3 effective actions
        .map(([action, _]) => action);
      
      return effectiveActions;
    } catch (error) {
      console.error('Error getting effective actions:', error);
      return [];
    }
  }
  

  async getCostReport(): Promise<string> {
    try {
      const { getAICostReport } = await import('../../utils/aiWellness/costMonitor');
      return await getAICostReport();
    } catch (error) {
      console.error('Error getting cost report:', error);
      return 'Cost report unavailable';
    }
  }

  async getCacheStats(): Promise<any> {
    return await responseCache.getCacheStats();
  }

  async getUserAnalytics(userId: string): Promise<any> {
    return await ConversationAnalytics.getUserMetrics(userId);
  }

  async getWeeklyAnalytics(): Promise<any> {
    return await ConversationAnalytics.getWeeklyReport();
  }
}

export default new AIWellnessService();