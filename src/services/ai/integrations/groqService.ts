import firebase from 'firebase/compat/app';
import { auth, functions } from '../../../config/firebase';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class GroqService {
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
      model = 'llama3-8b-8192',
      maxTokens = 150,
      temperature = 0.7
    } = options;
    
    try {
      // No authentication required for this app

      // Debug logging
      console.log('AI Chat Request (Groq fallback):', {
        model,
        messageCount: messages.length,
        maxTokens,
        temperature
      });
      
      // Call Firebase function (same as OpenRouter - the function handles fallback)
      const result = await this.aiChatFunction({
        messages,
        options: {
          model,
          maxTokens,
          temperature
        }
      });
      
      const data = result.data as { success: boolean; data?: string; error?: string };
      
      console.log('AI Chat Response (Groq):', {
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
        console.error('Empty content received from Groq model');
        throw new Error('Empty response from Groq AI');
      }
      
      return content;
      
    } catch (error) {
      console.error('Groq chat error:', error);
      throw error;
    }
  }
  
  isConfigured(): boolean {
    // Always configured now - API keys are secure on Firebase
    return true;
  }
}

export default new GroqService();