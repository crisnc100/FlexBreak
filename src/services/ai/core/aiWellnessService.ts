import openRouterService from '../integrations/openRouterService';
import { buildUserContext, categorizeInput } from '../contextBuilder';
import { WELLNESS_COACH_PROMPT, FALLBACK_RESPONSES } from './promptManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_CONFIG } from '../../../config/aiConfig';
import { KEYS } from '../../storageService';
import memoryService, { simpleMemory } from '../memory/memoryService';
import costMonitor from '../utils/costMonitor';
import configValidator from '../../security/configValidator';
import { rateLimiter, errorHandler, retryUtil } from '../utils/reliabilityService';
import { conversationManager, formatAIResponse } from './conversationManager';
import { promptManager } from './promptManager';

export interface WellnessResponse {
  response: string;
  suggestedActions?: string[];
  category?: string;
  fallback?: boolean;
}

export class AIWellnessServiceV2 {
  
  async processWellnessCheckIn(
    userInput: string,
    userId?: string,
    isNotification: boolean = false
  ): Promise<WellnessResponse> {
    try {
      // Check rate limits first
      const isPremium = await AsyncStorage.getItem(KEYS.USER.PREMIUM) === 'true';
      const rateLimitKey = isPremium ? 'ai_chat_premium' : 'ai_chat_free';
      const rateCheck = await rateLimiter.checkLimit(rateLimitKey, userId || 'anonymous');
      
      if (!rateCheck.allowed) {
        return {
          response: `${rateCheck.reason} Please try again in ${rateCheck.retryAfter} seconds.`,
          category: 'rate_limited',
          suggestedActions: ['Wait a moment']
        };
      }
      
      // Check cost limits
      const canUseCost = await costMonitor.canMakeRequest(isPremium);
      if (!canUseCost) {
        return {
          response: "AI service temporarily paused due to usage limits. Please try again tomorrow.",
          category: 'cost_limit',
          suggestedActions: ['Try Tomorrow']
        };
      }
      
      const accessCheck = await this.checkAccessAndLimits(userId);
      if (!accessCheck.canAccess) {
        return {
          response: accessCheck.message || "You've reached your AI wellness limit. Upgrade to premium for unlimited access!",
          category: 'limit_reached',
          suggestedActions: ['Upgrade to Premium']
        };
      }
      
      // Add user message to conversation
      if (userId) {
        await conversationManager.addMessage(userId, 'user', userInput);
      }
      
      const context = await buildUserContext(userInput, userId);
      
      // Get user's name from AI wellness storage
      const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
      if (userName) {
        context.userName = userName;
      }
      
      console.log('AI Processing:', {
        userInput,
        detectedLanguage: context.detectedLanguage,
        isFirstInteraction: context.isFirstInteraction
      });
      
      // Get language and build context
      const languageCode = context.detectedLanguage || 'en';
      
      // Get conversation context
      const sessionContext = userId 
        ? await conversationManager.getSessionContext(userId)
        : null;
      
      // Check if this is a negative feedback scenario
      if (sessionContext && sessionContext.isFollowUp && sessionContext.currentSentiment === 'negative') {
        console.log('Detected negative feedback, generating alternative suggestion');
        
        // Get the last failed suggestion
        const lastSuggestion = sessionContext.failedSuggestions[sessionContext.failedSuggestions.length - 1] || '';
        
        // Generate alternative suggestion
        const alternativeResponse = promptManager.generateAlternativeSuggestion(
          userInput,
          lastSuggestion,
          languageCode
        );
        
        // Store the assistant response
        if (userId) {
          await conversationManager.addMessage(userId, 'assistant', alternativeResponse, alternativeResponse);
        }
        
        return {
          response: alternativeResponse,
          suggestedActions: this.extractActions(alternativeResponse),
          category: categorizeInput(userInput)
        };
      }
      
      // Build enhanced context with conversation history
      const memoryContext = await memoryService.buildContext(userId!, languageCode);
      const conversationHistory = sessionContext?.recentMessages || [];
      
      const enhancedPrompt = promptManager.buildEnhancedPrompt({
        userInput,
        userContext: context,
        conversationHistory,
        failedSuggestions: sessionContext?.failedSuggestions || [],
        successfulSuggestions: sessionContext?.successfulSuggestions || [],
        isFollowUp: sessionContext?.isFollowUp || false,
        currentSentiment: sessionContext?.currentSentiment,
        memoryContext
      });
      
      // Add notification-specific instructions
      if (isNotification) {
        const notificationInstructions = {
          en: '\n\nThis is a scheduled check-in notification. Be warm and encouraging.',
          es: '\n\nEsta es una notificación de chequeo programada. Sé cálido y alentador.',
          zh: '\n\n这是定期问候通知。请温暖和鼓励。'
        };
        enhancedPrompt + (notificationInstructions[languageCode] || notificationInstructions.en);
      }
      
      // Get AI response using appropriate model
      const modelConfig = this.getModelConfig(languageCode, isPremium);
      
      let aiResponse: string;
      
      try {
        // Convert to messages format for chat API
        const messages = [
          { role: 'system' as const, content: enhancedPrompt },
          { role: 'user' as const, content: userInput }
        ];
        
        // Use chatWithRetry which includes built-in retry logic
        aiResponse = await openRouterService.chatWithRetry(
          messages,
          {
            model: modelConfig.model,
            maxTokens: modelConfig.maxTokens,
            temperature: 0.7
          }
        );
      } catch (apiError) {
        console.error('API call failed after retries:', apiError);
        
        // Check if we should try free model as fallback
        if (!isPremium && modelConfig.model !== AI_CONFIG.models.free) {
          console.log('Attempting free model fallback');
          
          try {
            const freeModelConfig = { 
              ...modelConfig, 
              model: AI_CONFIG.models.free 
            };
            
            // Recreate messages for fallback call
            const fallbackMessages = [
              { role: 'system' as const, content: enhancedPrompt },
              { role: 'user' as const, content: userInput }
            ];
            
            aiResponse = await openRouterService.chatWithRetry(
              fallbackMessages,
              {
                model: freeModelConfig.model,
                maxTokens: freeModelConfig.maxTokens,
                temperature: 0.7
              }
            );
          } catch (freeModelError) {
            console.error('Free model also failed, using fallback');
            aiResponse = await this.getFallbackResponse(userInput, userId);
          }
        } else {
          // Use fallback for premium users or if free model already tried
          aiResponse = await this.getFallbackResponse(userInput, userId);
        }
      }
      
      // Validate response
      if (!aiResponse || aiResponse.trim().length < 10) {
        console.error('AI response empty, using fallback');
        aiResponse = await this.getFallbackResponse(userInput, userId);
      }
      
      // Format the response for better display
      const formattedResponse = formatAIResponse(aiResponse, isNotification);
      
      // Extract the main suggestion from the response
      const mainSuggestion = this.extractMainSuggestion(formattedResponse);
      
      // Store assistant response in conversation
      if (userId) {
        await conversationManager.addMessage(userId, 'assistant', formattedResponse, mainSuggestion);
      }
      
      // Extract and store wellness data with the AI response for validation
      if (userId) {
        await memoryService.extractAndStore(userId, userInput, formattedResponse, languageCode);
      }
      
      // Track costs with improved token estimation
      const inputTokens = Math.ceil((enhancedPrompt.length + userInput.length) / 4);
      const outputTokens = Math.ceil(aiResponse.length / 4);
      await costMonitor.trackUsage(
        modelConfig.model,
        inputTokens,
        outputTokens,
        isPremium
      );
      
      // Parse response for actions
      const suggestedActions = this.extractActions(formattedResponse);
      const category = categorizeInput(userInput);
      
      // Store conversation to AsyncStorage for persistence
      if (userId) {
        await this.storeConversation(userId, userInput, formattedResponse);
      }
      
      await this.trackUsage(userId);
      
      // Update last check-in time in memory
      if (userId) {
        const currentMemory = await simpleMemory.getMemory(userId);
        await simpleMemory.updateMemory(userId, {
          usage: {
            lastCheckIn: Date.now(),
            totalInteractions: currentMemory.usage.totalInteractions + 1,
            weeklyCount: currentMemory.usage.weeklyCount + 1,
            isPremium: await AsyncStorage.getItem(KEYS.USER.PREMIUM) === 'true'
          }
        });
      }
      
      return {
        response: formattedResponse,
        suggestedActions,
        category
      };
      
    } catch (error) {
      console.error('AI Wellness processing error:', error);
      
      // Handle error with context
      const errorContext = await errorHandler.handleError(error, 'ai_wellness_chat');
      
      // Check if we should use fallback
      if (errorContext.retryable) {
        // Return user-friendly error message
        return {
          response: errorContext.userMessage,
          category: 'error',
          suggestedActions: errorContext.suggestedAction ? [errorContext.suggestedAction] : []
        };
      }
      
      // Use fallback response for non-retryable errors
      const fallbackResponse = await this.getFallbackResponse(userInput, userId);
      return {
        response: formatAIResponse(fallbackResponse, isNotification),
        category: 'error',
        fallback: true
      };
    }
  }
  
  private extractMainSuggestion(response: string): string {
    // Extract the main actionable suggestion from the response
    const tryThisMatch = response.match(/Try this:(.+?)(?:\.|$)/i);
    if (tryThisMatch) {
      return tryThisMatch[1].trim();
    }
    
    // Look for other action patterns
    const actionMatch = response.match(/^([A-Z][a-z]+.+?)(?:\.|$)/);
    if (actionMatch) {
      return actionMatch[1].trim();
    }
    
    // Return full response if no clear suggestion found
    return response.split('.')[0].trim();
  }
  
  private async checkAccessAndLimits(userId?: string): Promise<{ canAccess: boolean; message?: string }> {
    if (!userId) {
      return { 
        canAccess: false, 
        message: "Please enable AI Wellness Coach in settings to get started!" 
      };
    }
    
    const isPremium = await AsyncStorage.getItem(KEYS.USER.PREMIUM) === 'true';
    
    // Check day of week for free users
    if (!isPremium) {
      const today = new Date().getDay();
      // Wednesday is day 3 (Sunday = 0)
      if (today !== 3) {
        return {
          canAccess: false,
          message: "AI Wellness Coach is available on Wednesdays for free users. Upgrade to premium for daily access!"
        };
      }
    }
    
    // Check daily limits
    const dailyLimit = isPremium ? AI_CONFIG.limits.premium.dailyRequests : AI_CONFIG.limits.free.dailyRequests;
    const usageKey = `@ai_wellness_usage_${userId}_${new Date().toDateString()}`;
    const currentUsage = await AsyncStorage.getItem(usageKey);
    const usageCount = currentUsage ? parseInt(currentUsage) : 0;
    
    if (usageCount >= dailyLimit) {
      return {
        canAccess: false,
        message: isPremium 
          ? "You've reached your daily limit of 15 AI wellness sessions. Try again tomorrow!"
          : "You've used all 3 free AI wellness sessions for today. Upgrade to premium for more!"
      };
    }
    
    return { canAccess: true };
  }
  
  private getModelConfig(language: string, isPremium: boolean) {
    // Use Claude Haiku for Chinese, otherwise use based on premium status
    if (language === 'zh') {
      return {
        model: AI_CONFIG.models.powerful,
        maxTokens: isPremium ? AI_CONFIG.limits.premium.maxOutputTokens : AI_CONFIG.limits.free.maxOutputTokens
      };
    }
    
    // Use balanced model for premium, free model for free users
    return {
      model: isPremium ? AI_CONFIG.models.balanced : AI_CONFIG.models.free,
      maxTokens: isPremium ? AI_CONFIG.limits.premium.maxOutputTokens : AI_CONFIG.limits.free.maxOutputTokens
    };
  }
  
  private async getFallbackResponse(userInput: string, userId?: string): Promise<string> {
    const context = await buildUserContext(userInput, userId);
    const category = categorizeInput(userInput);
    const language = context.detectedLanguage || 'en';
    
    return FALLBACK_RESPONSES[language][category] || FALLBACK_RESPONSES[language].general;
  }
  
  private extractActions(response: string): string[] {
    const actions: string[] = [];
    
    // Extract numbered actions
    const numberedActions = response.match(/\d+\.\s*([^.]+)/g);
    if (numberedActions) {
      actions.push(...numberedActions.map(a => a.replace(/^\d+\.\s*/, '')));
    }
    
    // Extract "Try this:" actions
    const tryActions = response.match(/Try this:\s*([^.]+)/gi);
    if (tryActions) {
      actions.push(...tryActions.map(a => a.replace(/Try this:\s*/i, '')));
    }
    
    return actions.slice(0, 3); // Limit to 3 actions
  }
  
  private async storeConversation(userId: string, userInput: string, aiResponse: string) {
    const key = `@ai_wellness_conversation_${userId}`;
    try {
      const existing = await AsyncStorage.getItem(key);
      const conversations = existing ? JSON.parse(existing) : [];
      
      conversations.push({
        timestamp: Date.now(),
        userInput,
        aiResponse
      });
      
      // Keep only last 10 conversations
      const recentConversations = conversations.slice(-10);
      
      await AsyncStorage.setItem(key, JSON.stringify(recentConversations));
    } catch (error) {
      console.error('Error storing conversation:', error);
    }
  }
  
  private async trackUsage(userId?: string) {
    if (!userId) return;
    
    const usageKey = `@ai_wellness_usage_${userId}_${new Date().toDateString()}`;
    const currentUsage = await AsyncStorage.getItem(usageKey);
    const newCount = currentUsage ? parseInt(currentUsage) + 1 : 1;
    
    await AsyncStorage.setItem(usageKey, newCount.toString());
  }
}

// Export singleton instance
export default new AIWellnessServiceV2();