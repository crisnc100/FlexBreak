import openRouterService from './openRouterService';
import { WELLNESS_COACH_PROMPT, FALLBACK_RESPONSES } from './promptTemplates';
import { buildUserContext, categorizeInput } from './contextBuilder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_CONFIG } from '../../config/aiConfig';
import { KEYS } from '../storageService';
import simpleMemory from './simpleMemory';
import costTracker from './costTracker';
import { formatAIResponse } from './responseFormatter';

export interface WellnessResponse {
  response: string;
  suggestedActions?: string[];
  category?: string;
  fallback?: boolean;
}

export class AIWellnessService {
  // Removed conversation history - using persistent memory system instead
  
  async processWellnessCheckIn(
    userInput: string,
    userId?: string,
    isNotification: boolean = false
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
      
      // Get user's name from AI wellness storage
      const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
      
      // SIMPLIFIED - Just pass the essential info, no fake memories
      console.log('AI Processing:', {
        userInput,
        detectedLanguage: context.detectedLanguage,
        isFirstInteraction: context.isFirstInteraction
      });
      
      // Get language and build context
      const languageCode = context.detectedLanguage || 'en';
      
      // Update language preference in memory
      await simpleMemory.updateMemory(userId!, { language: languageCode });
      
      // Extract and store wellness data from user input
      await simpleMemory.extractAndStore(userId!, userInput, languageCode);
      
      // Build context from memory
      const memoryContext = await simpleMemory.buildContext(userId!, languageCode);
      
      // Build full context with name (userName already retrieved above)
      const fullContext = userName 
        ? `User's name: ${userName}. ${memoryContext}`
        : memoryContext;
      
      // Get language-specific prompt and inject context
      let systemPrompt = WELLNESS_COACH_PROMPT[languageCode]
        .replace('{context}', fullContext);
      
      // Add notification-specific instructions
      if (isNotification) {
        const notificationInstructions = {
          en: '\nKEEP RESPONSE UNDER 80 CHARACTERS for notification. One actionable tip only.',
          es: '\nRESPUESTA BAJO 80 CARACTERES para notificación. Solo un consejo práctico.',
          zh: '\n回复限制80字符以内。只给一个实用建议。'
        };
        systemPrompt += notificationInstructions[languageCode];
      }
      
      // Add language-specific instructions for Chinese
      if (languageCode === 'zh') {
        systemPrompt += '\n请用中文回复。确保回复内容充实有帮助。';
      }
      
      console.log('AI Processing:', {
        language: languageCode,
        context: memoryContext,
        promptLength: systemPrompt.length
      });
      
      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt
        },
        {
          role: 'user' as const,
          content: userInput
        }
      ];
      
      // REMOVED: Conversation history - causes confusion and wastes tokens
      // The memory system provides better personalization
      
      // Select model based on language and user type
      const isPremium = await AsyncStorage.getItem(KEYS.USER.PREMIUM) === 'true';
      let tokenLimit = isPremium ? AI_CONFIG.limits.premium.maxOutputTokens : AI_CONFIG.limits.free.maxOutputTokens;
      
      // Override token limit for notifications
      if (isNotification) {
        tokenLimit = 50;  // Very short for notifications
      }
      
      let modelConfig = {
        model: AI_CONFIG.models.fast,  // Claude Haiku by default
        maxTokens: tokenLimit,
        temperature: 0.8
      };
      
      // Use better models for non-English languages
      if (languageCode === 'zh') {
        // Claude Haiku is much better for Chinese
        modelConfig = {
          model: AI_CONFIG.models.powerful, // Claude Haiku
          maxTokens: 150,
          temperature: 0.8
        };
      } else if (languageCode === 'es') {
        // Llama works OK for Spanish but give it more tokens
        modelConfig.maxTokens = 120;
      }
      
      // Get AI response
      let aiResponse = await openRouterService.chatWithRetry(messages, modelConfig);
      
      // Validate response - check for empty or invalid responses
      if (!aiResponse || aiResponse.trim().length < 10) {
        console.warn('Received empty or too short response, retrying...');
        
        // Try once more with a slightly different approach
        let retrySystemContent = systemPrompt;
        if (languageCode === 'zh') {
          // More explicit Chinese instructions
          retrySystemContent = `你是FlexBreak的AI健康教练。请用中文回复用户的问题。
用户问题：${userInput}
请提供关于运动、拉伸或健康的具体建议。`;
        } else {
          retrySystemContent = `${systemPrompt} Remember to always provide a helpful response.`;
        }
        
        // Simpler messages without history for retry
        const retryMessages = [
          {
            role: 'system' as const,
            content: retrySystemContent
          },
          {
            role: 'user' as const,
            content: userInput
          }
        ];
        
        // Try with a more powerful model
        aiResponse = await openRouterService.chatWithRetry(retryMessages, {
          model: AI_CONFIG.models.balanced,  // Try Llama 70B
          maxTokens: tokenLimit,
          temperature: 0.9,
          top_p: 0.95
        });
        
        // If still empty, use fallback
        if (!aiResponse || aiResponse.trim().length < 10) {
          console.error('AI response still empty, using fallback');
          aiResponse = await this.getFallbackResponse(userInput, userId);
        }
      }
      
      // Format the response for better display
      const formattedResponse = formatAIResponse(aiResponse, isNotification);
      
      // Track costs (estimate ~50 input tokens + 50 output tokens)
      await costTracker.trackTokenUsage(
        systemPrompt.length + userInput.length, // Rough token estimate
        aiResponse.length,
        'llama'
      );
      
      // Parse response for actions
      const suggestedActions = this.extractActions(formattedResponse);
      const category = categorizeInput(userInput);
      
      // Store in conversation history
      if (userId) {
        // Conversation history removed - using memory system instead
        // Extract any mentioned solutions that worked
        if (formattedResponse.toLowerCase().includes('helped') || 
            formattedResponse.toLowerCase().includes('better')) {
          await simpleMemory.addEffectiveSolution(userId, userInput.substring(0, 50));
        }
        
        // Store conversation to AsyncStorage for persistence
        await this.storeConversation(userId, userInput, formattedResponse);
      }
      
      await this.trackUsage(userId);
      
      // Update last check-in time in memory
      if (userId) {
        await simpleMemory.updateMemory(userId, {
          usage: {
            lastCheckIn: Date.now(),
            weeklyCount: (await simpleMemory.getMemory(userId)).usage.weeklyCount + 1,
            isPremium: await AsyncStorage.getItem(KEYS.USER.PREMIUM) === 'true'
          }
        });
      }
      
      // DISABLED - Memory system causing fake memories
      // TODO: Properly implement memory system later
      
      // Note: Regular check-ins are now scheduled in the notification handler
      // after the user responds to the welcome message
      
      return {
        response: formattedResponse,
        suggestedActions,
        category
      };
      
    } catch (error) {
      console.error('AI Wellness processing error:', error);
      
      // Return fallback response
      const fallbackResponse = await this.getFallbackResponse(userInput, userId);
      return {
        response: formatAIResponse(fallbackResponse, isNotification),
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
    
    console.log('AI Access Check:', {
      isPremium: isPremium === 'true',
      userId,
      today: new Date().getDay(),
      dayName: new Date().toLocaleDateString('en-US', { weekday: 'long' })
    });
    
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
    
    // Free users can only use on Wednesdays (day 3) - EXCEPT for welcome messages
    const today = new Date().getDay();
    if (today !== 3 && usageCount > 0) {
      return { 
        canAccess: false, 
        message: "AI Flex Coach is available on Wednesdays for free users. Upgrade to premium for daily access! 💎" 
      };
    }
    
    if (usageCount >= AI_CONFIG.limits.free.dailyRequests) {
      return { 
        canAccess: false, 
        message: "You've used your 3 free AI Flex Coach chats for today. Come back next Wednesday or upgrade to premium for unlimited daily access! 🌟" 
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
  
  
  private async getFallbackResponse(input: string, userId?: string): Promise<string> {
    const category = categorizeInput(input);
    
    // Get user's language preference
    let language: 'en' | 'es' | 'zh' = 'en';
    if (userId) {
      const memory = await simpleMemory.getMemory(userId);
      language = memory.language;
    }
    
    const responses = FALLBACK_RESPONSES[language];
    
    if (responses[category]) {
      return responses[category];
    }
    
    return responses.general;
  }
  

  // Conversation history methods removed - using memory system instead
  
  private async getEffectiveActions(_userId?: string): Promise<string[]> {
    return [];
  }
}

export default new AIWellnessService();