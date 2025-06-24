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
      const response = await fetch(AI_CONFIG.openRouter.baseURL, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }
      
      const data: OpenRouterResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from AI');
      }
      
      
      return data.choices[0].message.content;
      
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
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.chatWithRetry(messages, options, retries - 1);
      }
      throw error;
    }
  }
}

export default new OpenRouterService();