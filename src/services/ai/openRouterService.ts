import { AI_CONFIG } from '../../config/aiConfig';

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
    try {
      return await this.chat(messages, options);
    } catch (error: any) {
      // If we get a 404, try with fallback models
      if (error.message?.includes('404') && !options.triedFallback) {
        console.log('Model not found, trying fallback models...');
        
        const fallbackModels = [
          'mistralai/mistral-7b-instruct:free',
          'meta-llama/llama-3-8b-instruct:free',
          'google/gemma-7b-it:free',
          'nousresearch/nous-capybara-7b:free'
        ];
        
        for (const fallbackModel of fallbackModels) {
          try {
            console.log(`Trying fallback model: ${fallbackModel}`);
            return await this.chat(messages, { 
              ...options, 
              model: fallbackModel,
              triedFallback: true 
            });
          } catch (fallbackError: any) {
            console.log(`Fallback ${fallbackModel} failed: ${fallbackError.message}`);
          }
        }
      }
      
      if (retries > 0) {
        console.log(`Retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // On last retry, try our free fallback model
        if (retries === 1 && !options.lastResortTried) {
          console.log('Last retry - trying free model as fallback');
          return this.chatWithRetry(messages, { 
            ...options, 
            model: AI_CONFIG.models.free,
            maxTokens: 200,
            temperature: 0.9,
            lastResortTried: true 
          }, retries - 1);
        }
        
        return this.chatWithRetry(messages, options, retries - 1);
      }
      throw error;
    }
  }
}

export default new OpenRouterService();