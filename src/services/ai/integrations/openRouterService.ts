import { AI_CONFIG } from '../../../config/aiConfig';
import { retryUtil, errorHandler } from '../utils/reliabilityService';
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
  private headers: HeadersInit;
  
  constructor() {
    this.headers = {
      'Authorization': `Bearer ${AI_CONFIG.openRouter.apiKey}`,
      'HTTP-Referer': AI_CONFIG.openRouter.appUrl,
      'X-Title': 'FlexBreak Wellness Coach',
      'Content-Type': 'application/json',
    };
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
      model = AI_CONFIG.openRouter.defaultModel,
      maxTokens = 150,
      temperature = 0.7
    } = options;
    
    try {
      const requestBody = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      };
      
      // Debug logging
      console.log('OpenRouter Request:', {
        model,
        messageCount: messages.length,
        systemPrompt: messages[0]?.content?.substring(0, 100) + '...',
        userInput: messages.find(m => m.role === 'user')?.content,
        maxTokens,
        temperature
      });
      
      const response = await fetch(AI_CONFIG.openRouter.baseURL, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }
      
      const data: OpenRouterResponse = await response.json();
      
      console.log('OpenRouter Response:', {
        model,
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        messageContent: data.choices?.[0]?.message?.content?.substring(0, 50) + '...',
        usage: data.usage
      });
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from AI');
      }
      
      const content = data.choices[0].message.content;
      
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