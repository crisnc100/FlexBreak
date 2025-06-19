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
      
      // Check if this is the first interaction and we don't have a name
      if (!context.userName && userId) {
        const conversationCount = await this.getConversationCount(userId);
        const data = context.notificationData;
        
        // Check if this is from the welcome notification
        if (conversationCount === 0 || data?.isWelcome) {
          return {
            response: "Hey there! 👋 I'm your AI Flex Coach. Just type your first name (like 'Sarah' or 'Mike') and I'll remember it for our chats!",
            category: 'name_collection',
            suggestedActions: []
          };
        }
      }
      
      // Check if user is providing their name
      if (await this.isNameResponse(userInput, userId)) {
        const name = this.extractName(userInput);
        if (name) {
          await AsyncStorage.setItem(KEYS.AI_WELLNESS.USER_NAME, name);
          
          // Track intro message
          await this.trackIntroMessage(userId);
          
          // Check if they also included how they're feeling
          const feelingPattern = /(?:and|,|\.|!)\s*(.+)/i;
          const feelingMatch = userInput.match(feelingPattern);
          
          if (feelingMatch && feelingMatch[1].trim().length > 5) {
            // They provided both name and feeling - process the feeling part
            const feeling = feelingMatch[1].trim();
            
            // Update context with their name
            context.userName = name;
            
            // Continue to process their wellness input
            // (Let the rest of the function handle it)
            userInput = feeling;
          } else {
            // Just name provided, ask for feeling
            return {
              response: `Nice to meet you, ${name}! 🌟 How are you feeling today? Share what's going on - tired, stressed, sore back, anything! I'll help with personalized tips.`,
              category: 'greeting',
              suggestedActions: []
            };
          }
        }
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
      
      // Track intro messages if applicable
      const hasName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
      if (!hasName || category === 'greeting') {
        await this.trackIntroMessage(userId);
      }
      
      // Check if intro is complete and schedule regular notifications
      await this.checkIntroComplete(userId);
      
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
    if (isPremium === 'true') {
      return { canAccess: true };
    }
    
    // Check if user is in intro conversation
    const introCount = await AsyncStorage.getItem(KEYS.AI_WELLNESS.INTRO_MESSAGES_COUNT);
    const introMessages = introCount ? parseInt(introCount) : 0;
    const hasName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
    
    // Allow up to 3 messages during intro (name collection + 2 wellness messages)
    if (introMessages < 3 && !hasName) {
      return { canAccess: true };
    }
    
    // Free users: Check if it's Wednesday
    const today = new Date().getDay();
    if (today !== 3) {
      return { 
        canAccess: false, 
        message: "AI Wellness Coach is available on Wednesdays for free users. Upgrade to premium for daily access! 💎" 
      };
    }
    
    // Check daily usage for free users
    const todayStr = new Date().toDateString();
    const usageKey = `@ai_usage_${userId}_${todayStr}`;
    const usage = await AsyncStorage.getItem(usageKey);
    const usageCount = usage ? parseInt(usage) : 0;
    
    if (usageCount >= AI_CONFIG.limits.free.dailyRequests) {
      return { 
        canAccess: false, 
        message: "You've used your free AI wellness chat for today. Come back next Wednesday or upgrade to premium for unlimited daily access! 🌟" 
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
    const conversationCount = await this.getConversationCount(userId);
    const hasName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
    
    // If no name saved and this is early in conversation
    if (!hasName && conversationCount <= 1) {
      // Check if input looks like a name
      const trimmed = input.trim();
      
      // Single word that could be a name (2-20 letters)
      if (/^[A-Za-z]{2,20}$/.test(trimmed)) {
        return true;
      }
      
      // Common name patterns
      const namePatterns = [
        /^(i'm |i am |my name is |call me |it's |its |hi i'm |hello i'm )/i,
      ];
      
      return namePatterns.some(pattern => pattern.test(trimmed));
    }
    
    return false;
  }
  
  private extractName(input: string): string | null {
    // Remove common prefixes
    let cleaned = input.trim()
      .replace(/^(i'm |i am |my name is |call me |it's |its |hi i'm |hello i'm )/i, '')
      .trim();
    
    // Check if they included their feeling too (e.g., "Sarah and I'm tired")
    const andPattern = /^([A-Za-z]+)\s+(and|,|\.|!|\s+I'm|\s+I\s+am|\s+feeling)/i;
    const match = cleaned.match(andPattern);
    
    let name = match ? match[1] : cleaned.split(/\s+/)[0];
    
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
  
  private async trackIntroMessage(userId?: string): Promise<void> {
    if (!userId) return;
    
    try {
      const countStr = await AsyncStorage.getItem(KEYS.AI_WELLNESS.INTRO_MESSAGES_COUNT);
      const count = countStr ? parseInt(countStr) : 0;
      await AsyncStorage.setItem(KEYS.AI_WELLNESS.INTRO_MESSAGES_COUNT, (count + 1).toString());
      console.log(`Intro message count: ${count + 1}`);
    } catch (error) {
      console.error('Error tracking intro message:', error);
    }
  }
  
  private async checkIntroComplete(userId?: string): Promise<void> {
    if (!userId) return;
    
    try {
      const hasName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
      const introCount = await AsyncStorage.getItem(KEYS.AI_WELLNESS.INTRO_MESSAGES_COUNT);
      const messages = introCount ? parseInt(introCount) : 0;
      
      // If user has provided name and had at least 2 messages, intro is complete
      if (hasName && messages >= 2) {
        // Check if we've already scheduled regular notifications
        const scheduled = await AsyncStorage.getItem('@ai_wellness_regular_scheduled');
        if (!scheduled) {
          console.log('Intro complete! Scheduling regular check-ins...');
          
          // Import scheduler to avoid circular dependency
          const { scheduleAICheckIns } = await import('./aiWellnessScheduler');
          const isPremium = await AsyncStorage.getItem('@user_premium') === 'true';
          
          // Schedule regular check-ins (not initial setup)
          await scheduleAICheckIns(isPremium, false);
          await AsyncStorage.setItem('@ai_wellness_regular_scheduled', 'true');
        }
      }
    } catch (error) {
      console.error('Error checking intro complete:', error);
    }
  }
}

export default new AIWellnessService();