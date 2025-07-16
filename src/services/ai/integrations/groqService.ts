import { AI_CONFIG } from '../../../config/aiConfig';

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
  private headers: HeadersInit;
  
  constructor() {
    this.headers = {
      'Authorization': `Bearer ${AI_CONFIG.groq.apiKey}`,
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
      model = AI_CONFIG.groq.defaultModel,
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
      console.log('Groq Request:', {
        model,
        messageCount: messages.length,
        maxTokens,
        temperature
      });
      
      const response = await fetch(AI_CONFIG.groq.baseURL, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq API error response:', errorText);
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }
      
      const data: GroqResponse = await response.json();
      
      console.log('Groq Response:', {
        model,
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        usage: data.usage
      });
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Groq AI');
      }
      
      const content = data.choices[0].message.content;
      
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
    return !!AI_CONFIG.groq.apiKey && AI_CONFIG.groq.apiKey.length > 0;
  }
}

export default new GroqService();