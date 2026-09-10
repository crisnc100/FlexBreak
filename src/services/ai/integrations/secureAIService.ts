import { callBackend } from '../../security/backendClient';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
}

class SecureAIService {
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    // Model/premium selection is server-owned; never send arbitrary model IDs or
    // a caller-controlled identity to a provider-backed endpoint.
    return callBackend<string>('ai-chat-v2', {
      messages,
      options: { maxTokens: options.maxTokens, temperature: options.temperature },
    });
  }

}

export default new SecureAIService();
