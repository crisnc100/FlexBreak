import { retryUtil, errorHandler } from '../utils/reliabilityService';
import { AI_CONFIG } from '../../../config/aiConfig';
import secureAIService from './secureAIService';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class GroqService {
  async chat(
    messages: ChatMessage[], 
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    // Delegate to secure AI service which now uses Supabase
    // Override model to use Groq's model
    return secureAIService.chat(messages, {
      ...options,
      model: options.model || AI_CONFIG.groq.defaultModel
    });
  }
  
  async chatWithRetry(
    messages: ChatMessage[],
    options: any = {},
    retries: number = AI_CONFIG.groq.maxRetries
  ): Promise<string> {
    // Delegate to secure AI service which handles retries
    return secureAIService.chatWithRetry(messages, {
      ...options,
      model: options.model || AI_CONFIG.groq.defaultModel
    }, retries);
  }
  
  isConfigured(): boolean {
    // Always configured since API keys are on server
    return true;
  }
}

export default new GroqService();