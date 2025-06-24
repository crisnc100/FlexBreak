import openRouterService from './openRouterService';
import { WELLNESS_COACH_PROMPT, FALLBACK_RESPONSES } from './promptTemplates';
import { buildUserContext, categorizeInput } from './contextBuilder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_CONFIG } from '../../config/aiConfig';
import { KEYS } from '../storageService';

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
      const accessCheck = await this.checkAccessAndLimits(userId);
      if (!accessCheck.canAccess) {
        return {
          response: accessCheck.message || "You've reached your AI wellness limit. Upgrade to premium for unlimited access!",
          category: 'limit_reached',
          suggestedActions: ['Upgrade to Premium']
        };
      }
      
      const context = await buildUserContext(userInput, userId);
      
      // Skip name collection - not needed anymore
      
      // Cache functionality removed for MVP simplification
      
      const effectiveActions = await this.getEffectiveActions(userId);
      
      // Prepare messages
      const contextData: any = {
        timeOfDay: context.timeOfDay,
        dayOfWeek: context.dayOfWeek,
        effectiveActions: effectiveActions.length > 0 ? effectiveActions : undefined,
        isPremium: context.isPremium,
        isFirstInteraction: context.isFirstInteraction
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
      
      await this.trackUsage(userId);
      
      // Analytics tracking removed for MVP
      
      // Note: Regular check-ins are now scheduled in the notification handler
      // after the user responds to the welcome message
      
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
          message: "You've reached your 15 daily message exchanges. Even premium users need breaks! 😊" 
        };
      }
      return { canAccess: true };
    }
    
    const today = new Date().getDay();
    if (today !== 3 && usageCount > 0) {
      return { 
        canAccess: false, 
        message: "AI Wellness Coach is available on Wednesdays for free users. Upgrade to premium for daily access! 💎" 
      };
    }
    
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
      // Only store anonymized metrics, not full conversations
      const metricsKey = `@ai_wellness_metrics_${userId}`;
      const existing = await AsyncStorage.getItem(metricsKey);
      const metrics = existing ? JSON.parse(existing) : {
        totalInteractions: 0,
        categories: {},
        moodPatterns: {},
        lastInteraction: null
      };
      
      // Update metrics without storing actual message content
      metrics.totalInteractions++;
      metrics.lastInteraction = Date.now();
      
      // Store category counts
      const category = categorizeInput(userInput);
      metrics.categories[category] = (metrics.categories[category] || 0) + 1;
      
      // Extract mood indicators (anonymized)
      const mood = this.extractMoodIndicator(userInput);
      if (mood) {
        metrics.moodPatterns[mood] = (metrics.moodPatterns[mood] || 0) + 1;
      }
      
      await AsyncStorage.setItem(metricsKey, JSON.stringify(metrics));
    } catch (error) {
      console.error('Error storing anonymized metrics:', error);
    }
  }
  
  private extractMoodIndicator(input: string): string | null {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('great') || lowerInput.includes('good') || lowerInput.includes('happy')) {
      return 'positive';
    } else if (lowerInput.includes('stressed') || lowerInput.includes('anxious') || lowerInput.includes('worried')) {
      return 'stressed';
    } else if (lowerInput.includes('tired') || lowerInput.includes('exhausted') || lowerInput.includes('fatigue')) {
      return 'tired';
    } else if (lowerInput.includes('sore') || lowerInput.includes('pain') || lowerInput.includes('ache')) {
      return 'discomfort';
    }
    
    return null;
  }
  
  private extractActions(response: string): string[] {
    // Extract specific actions from the response
    const actions = [];
    const lowerResponse = response.toLowerCase();
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
  
  private async getEffectiveActions(_userId?: string): Promise<string[]> {
    return [];
  }
}

export default new AIWellnessService();