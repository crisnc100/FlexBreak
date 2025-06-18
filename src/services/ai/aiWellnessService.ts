import openRouterService from './openRouterService';
import { WELLNESS_COACH_PROMPT, FALLBACK_RESPONSES } from './promptTemplates';
import { buildUserContext, categorizeInput } from './contextBuilder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_CONFIG } from '../../config/aiConfig';

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
      // Check usage limits
      const canUse = await this.checkUsageLimit(userId);
      if (!canUse) {
        return {
          response: "You've reached your daily AI wellness limit. Upgrade to premium for unlimited access!",
          category: 'limit_reached'
        };
      }
      
      // Build context
      const context = await buildUserContext(userInput, userId);
      
      // Check if this is the first interaction and we don't have a name
      if (!context.userName && userId) {
        const conversationCount = await this.getConversationCount(userId);
        if (conversationCount === 0) {
          // First time user - ask for their name
          return {
            response: "Hi there! I'm your AI wellness coach. What should I call you? (Just your first name is fine!)",
            category: 'name_collection',
            suggestedActions: []
          };
        }
      }
      
      // Check if user is providing their name
      if (await this.isNameResponse(userInput, userId)) {
        const name = this.extractName(userInput);
        if (name) {
          await AsyncStorage.setItem('@ai_wellness_user_name', name);
          return {
            response: `Nice to meet you, ${name}! How are you feeling today?`,
            category: 'greeting',
            suggestedActions: []
          };
        }
      }
      
      // Prepare messages
      const contextData: any = {
        timeOfDay: context.timeOfDay,
        dayOfWeek: context.dayOfWeek
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
  
  private async checkUsageLimit(userId?: string): Promise<boolean> {
    if (!userId) return true; // Anonymous users get limited access
    
    const isPremium = await AsyncStorage.getItem('@user_premium');
    if (isPremium === 'true') return true;
    
    // Check daily usage for free users
    const today = new Date().toDateString();
    const usageKey = `@ai_usage_${userId}_${today}`;
    const usage = await AsyncStorage.getItem(usageKey);
    const usageCount = usage ? parseInt(usage) : 0;
    
    return usageCount < AI_CONFIG.limits.free.dailyRequests;
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
  
  private async getConversationCount(userId: string): Promise<number> {
    try {
      const conversationKey = `@ai_wellness_conversations_${userId}`;
      const existing = await AsyncStorage.getItem(conversationKey);
      const conversations = existing ? JSON.parse(existing) : [];
      return conversations.length;
    } catch (error) {
      return 0;
    }
  }
  
  private async isNameResponse(input: string, userId: string): Promise<boolean> {
    // Check if we're expecting a name (last message was name collection)
    const conversations = this.conversationHistory.get(userId) || [];
    if (conversations.length > 0) {
      const lastAssistantMessage = conversations[conversations.length - 1];
      if (lastAssistantMessage?.content?.includes("What should I call you")) {
        return true;
      }
    }
    
    // Check for common name response patterns
    const namePatterns = [
      /^(i'm |i am |my name is |call me |it's |its )/i,
      /^[A-Z][a-z]+$/  // Single capitalized word
    ];
    
    return namePatterns.some(pattern => pattern.test(input.trim()));
  }
  
  private extractName(input: string): string | null {
    // Remove common prefixes
    let name = input.trim()
      .replace(/^(i'm |i am |my name is |call me |it's |its )/i, '')
      .trim();
    
    // Take only the first word (first name)
    name = name.split(/\s+/)[0];
    
    // Basic validation - should be letters only, reasonable length
    if (/^[A-Za-z]{2,20}$/.test(name)) {
      // Capitalize first letter
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
    
    return null;
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
}

export default new AIWellnessService();