import { retryUtil, errorHandler } from '../utils/reliabilityService';
import { AI_CONFIG } from '../../../config/aiConfig';
import groqService from './groqService';
import secureAIService from './secureAIService';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class OpenRouterService {
  async chat(
    messages: ChatMessage[], 
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    // Delegate to secure AI service which now uses Supabase
    return secureAIService.chat(messages, options);
  }
  
  async chatWithRetry(
    messages: ChatMessage[],
    options: any = {},
    retries: number = AI_CONFIG.openRouter.maxRetries
  ): Promise<string> {
    // Delegate to secure AI service which handles retries
    return secureAIService.chatWithRetry(messages, options, retries);
  }
  
  isConfigured(): boolean {
    // Always configured since API keys are on server
    return true;
  }
}

export default new OpenRouterService();