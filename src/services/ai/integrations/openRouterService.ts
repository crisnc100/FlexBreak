import { retryUtil, errorHandler } from '../utils/reliabilityService';
import firebase from 'firebase/compat/app';
import { auth, functions } from '../../../config/firebase';
import { AI_CONFIG } from '../../../config/aiConfig';
import groqService from './groqService';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenRouterService {
  private aiChatFunction;
  
  constructor() {
    this.aiChatFunction = functions.httpsCallable('aiChat');
  }
  
  async chat(
    messages: ChatMessage[], 
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    const {
      model = 'meta-llama/llama-3.1-8b-instruct:free',
      maxTokens = 150,
      temperature = 0.7
    } = options;
    
    try {
      // No authentication required for this app

      // Debug logging
      console.log('AI Chat Request:', {
        model,
        messageCount: messages.length,
        systemPrompt: messages[0]?.content?.substring(0, 100) + '...',
        userInput: messages.find(m => m.role === 'user')?.content,
        maxTokens,
        temperature
      });
      
      // Call Firebase function instead of direct API
      const result = await this.aiChatFunction({
        messages,
        options: {
          model,
          maxTokens,
          temperature
        }
      });
      
      const data = result.data as { success: boolean; data?: string; error?: string };
      
      console.log('AI Chat Response:', {
        success: data.success,
        hasData: !!data.data,
        error: data.error
      });
      
      if (!data.success || !data.data) {
        throw new Error(data.error || 'No response from AI');
      }
      
      const content = data.data;
      
      // Additional validation
      if (!content || content.trim().length === 0) {
        console.error('Empty content received from AI model');
        throw new Error('Empty response from AI');
      }
      
      return content;
      
    } catch (error) {
      console.error('OpenRouter chat error:', error);
      throw error;
    }
  }
  
  async chatWithRetry(
    messages: ChatMessage[],
    options: any = {},
    retries: number = AI_CONFIG.openRouter.maxRetries
  ): Promise<string> {
    const fallbackModels = [
      AI_CONFIG.models.fast,
      'mistralai/mistral-7b-instruct:free',
      'meta-llama/llama-3-8b-instruct:free',
      'google/gemma-7b-it:free'
    ];
    
    // Try primary model with retry
    const primaryFn = async () => this.chat(messages, options);
    
    // Create fallback functions
    const fallbackFns = fallbackModels.map(model => 
      async () => this.chat(messages, { ...options, model })
    );
    
    try {
      // Try primary model first
      const result = await retryUtil.withRetry(primaryFn, 'openrouter_chat');
      if (result.success) {
        return result.data!;
      }
      
      // Try fallback models one by one
      for (const fallbackFn of fallbackFns) {
        try {
          return await fallbackFn();
        } catch (fallbackError) {
          continue; // Try next fallback
        }
      }
      
      // If OpenRouter fails completely, try Groq as final fallback
      if (groqService.isConfigured()) {
        console.log('OpenRouter failed, attempting Groq fallback...');
        try {
          const groqResult = await groqService.chat(messages, {
            maxTokens: options.maxTokens || 150,
            temperature: options.temperature || 0.7
          });
          console.log('Groq fallback successful');
          return groqResult;
        } catch (groqError) {
          console.error('Groq fallback also failed:', groqError);
          // Continue to throw the original error
        }
      }
      
      // All attempts failed, throw the original error
      throw result.error;
    } catch (error) {
      // If all attempts fail, throw user-friendly error
      const errorContext = await errorHandler.handleError(error, 'openrouter_chat');
      throw new Error(errorContext.userMessage);
    }
  }
}

export default new OpenRouterService();