import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserContext, buildUserContext, categorizeInput, detectLanguage } from '../contextBuilder';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  category?: string;
  effectiveness?: boolean;
  suggestionGiven?: string;
}

export interface ConversationSession {
  sessionId: string;
  userId: string;
  startTime: number;
  lastActivity: number;
  messages: ConversationMessage[];
  currentMood?: string;
  failedSuggestions: string[];
  successfulSuggestions: string[];
  context?: UserContext;
}

export interface FeedbackPatterns {
  positive: string[];
  negative: string[];
  neutral: string[];
}

const FEEDBACK_PATTERNS: Record<string, FeedbackPatterns> = {
  en: {
    positive: [
      'helped', 'better', 'thanks', 'great', 'worked', 'good', 'nice',
      'feel better', 'much better', 'improving', 'relief', 'effective'
    ],
    negative: [
      "didn't help", 'not working', 'still hurts', 'worse', "doesn't work",
      'no better', 'same problem', 'not helping', 'still pain', 'still stress',
      'no relief', 'ineffective', 'useless'
    ],
    neutral: [
      'okay', 'alright', 'fine', 'not sure', 'maybe', 'will try'
    ]
  },
  es: {
    positive: [
      'ayudó', 'mejor', 'gracias', 'funcionó', 'bien', 'excelente',
      'me siento mejor', 'alivio', 'efectivo'
    ],
    negative: [
      'no ayudó', 'no funciona', 'sigue doliendo', 'peor', 'igual',
      'no mejora', 'mismo problema', 'no sirve', 'todavía duele'
    ],
    neutral: [
      'está bien', 'quizás', 'tal vez', 'intentaré'
    ]
  },
  zh: {
    positive: [
      '有帮助', '好多了', '谢谢', '有效', '好', '很好', '舒服多了',
      '缓解了', '管用', '不错'
    ],
    negative: [
      '没有帮助', '不管用', '还是疼', '更糟', '没用', '还是痛',
      '没有缓解', '无效', '还是不舒服'
    ],
    neutral: [
      '还好', '一般', '试试看', '可能吧'
    ]
  }
};

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_SESSION_MESSAGES = 20;

export class ConversationManager {
  private sessions: Map<string, ConversationSession> = new Map();
  
  async getOrCreateSession(userId: string): Promise<ConversationSession> {
    const existingSession = this.sessions.get(userId);
    const now = Date.now();
    
    // Check if session exists and is still active
    if (existingSession && (now - existingSession.lastActivity) < SESSION_TIMEOUT) {
      existingSession.lastActivity = now;
      return existingSession;
    }
    
    // Create new session
    const session: ConversationSession = {
      sessionId: `${userId}_${now}`,
      userId,
      startTime: now,
      lastActivity: now,
      messages: [],
      failedSuggestions: [],
      successfulSuggestions: []
    };
    
    this.sessions.set(userId, session);
    
    // Load session from storage if exists
    await this.loadSessionFromStorage(userId, session);
    
    return session;
  }
  
  async addMessage(
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    suggestionGiven?: string
  ): Promise<ConversationMessage> {
    const session = await this.getOrCreateSession(userId);
    
    const message: ConversationMessage = {
      role,
      content,
      timestamp: Date.now(),
      suggestionGiven
    };
    
    // Analyze user messages
    if (role === 'user') {
      const context = await buildUserContext(content, userId);
      session.context = context;
      
      message.sentiment = this.analyzeSentiment(content, context.detectedLanguage || 'en');
      message.category = categorizeInput(content);
      
      // Check if this is feedback to previous suggestion
      if (session.messages.length > 0) {
        const lastAssistantMsg = this.getLastAssistantMessage(session);
        if (lastAssistantMsg && lastAssistantMsg.suggestionGiven) {
          message.effectiveness = this.evaluateEffectiveness(message);
          
          // Track suggestion effectiveness
          if (message.effectiveness === true) {
            session.successfulSuggestions.push(lastAssistantMsg.suggestionGiven);
          } else if (message.effectiveness === false) {
            session.failedSuggestions.push(lastAssistantMsg.suggestionGiven);
          }
        }
      }
    }
    
    // Add message to session
    session.messages.push(message);
    
    // Trim old messages if exceeds limit
    if (session.messages.length > MAX_SESSION_MESSAGES) {
      session.messages = session.messages.slice(-MAX_SESSION_MESSAGES);
    }
    
    // Save to storage
    await this.saveSessionToStorage(session);
    
    return message;
  }
  
  private analyzeSentiment(content: string, language: 'en' | 'es' | 'zh'): 'positive' | 'negative' | 'neutral' {
    const lowerContent = content.toLowerCase();
    const patterns = FEEDBACK_PATTERNS[language];
    
    // Check negative first (higher priority)
    if (patterns.negative.some(pattern => lowerContent.includes(pattern))) {
      return 'negative';
    }
    
    // Then positive
    if (patterns.positive.some(pattern => lowerContent.includes(pattern))) {
      return 'positive';
    }
    
    // Default to neutral
    return 'neutral';
  }
  
  private evaluateEffectiveness(message: ConversationMessage): boolean | undefined {
    if (message.sentiment === 'positive') return true;
    if (message.sentiment === 'negative') return false;
    return undefined;
  }
  
  private getLastAssistantMessage(session: ConversationSession): ConversationMessage | null {
    for (let i = session.messages.length - 1; i >= 0; i--) {
      if (session.messages[i].role === 'assistant') {
        return session.messages[i];
      }
    }
    return null;
  }
  
  async getConversationHistory(userId: string, limit: number = 5): Promise<ConversationMessage[]> {
    const session = await this.getOrCreateSession(userId);
    return session.messages.slice(-limit);
  }
  
  async getSessionContext(userId: string): Promise<{
    recentMessages: ConversationMessage[];
    failedSuggestions: string[];
    successfulSuggestions: string[];
    currentSentiment?: 'positive' | 'negative' | 'neutral';
    isFollowUp: boolean;
  }> {
    const session = await this.getOrCreateSession(userId);
    const recentMessages = session.messages.slice(-5);
    
    // Get current sentiment from last user message
    const lastUserMessage = [...session.messages].reverse().find(m => m.role === 'user');
    
    // Check if this is a follow-up to previous suggestion
    const isFollowUp = session.messages.length > 1 && 
                       lastUserMessage && 
                       lastUserMessage.effectiveness !== undefined;
    
    return {
      recentMessages,
      failedSuggestions: session.failedSuggestions,
      successfulSuggestions: session.successfulSuggestions,
      currentSentiment: lastUserMessage?.sentiment,
      isFollowUp
    };
  }
  
  isResponseToPreviousSuggestion(userInput: string, session: ConversationSession): boolean {
    if (session.messages.length < 2) return false;
    
    const lastAssistantMsg = this.getLastAssistantMessage(session);
    if (!lastAssistantMsg || !lastAssistantMsg.suggestionGiven) return false;
    
    const timeSinceLastMessage = Date.now() - lastAssistantMsg.timestamp;
    
    // If less than 5 minutes since last suggestion, likely a follow-up
    return timeSinceLastMessage < 5 * 60 * 1000;
  }
  
  private async loadSessionFromStorage(userId: string, session: ConversationSession): Promise<void> {
    try {
      const key = `@ai_conversation_session_${userId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        const savedSession = JSON.parse(data);
        
        // Only load if session is recent (within last hour)
        if (Date.now() - savedSession.lastActivity < 60 * 60 * 1000) {
          session.messages = savedSession.messages || [];
          session.failedSuggestions = savedSession.failedSuggestions || [];
          session.successfulSuggestions = savedSession.successfulSuggestions || [];
          session.currentMood = savedSession.currentMood;
        }
      }
    } catch (error) {
      console.error('Error loading conversation session:', error);
    }
  }
  
  private async saveSessionToStorage(session: ConversationSession): Promise<void> {
    try {
      const key = `@ai_conversation_session_${session.userId}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        sessionId: session.sessionId,
        userId: session.userId,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        messages: session.messages,
        failedSuggestions: session.failedSuggestions,
        successfulSuggestions: session.successfulSuggestions,
        currentMood: session.currentMood
      }));
    } catch (error) {
      console.error('Error saving conversation session:', error);
    }
  }
  
  async clearSession(userId: string): Promise<void> {
    this.sessions.delete(userId);
    const key = `@ai_conversation_session_${userId}`;
    await AsyncStorage.removeItem(key);
  }
  
  /**
   * Response formatting methods (merged from responseFormatter.ts)
   */
  
  /**
   * Formats AI responses for better display in the chat interface
   */
  formatAIResponse(response: string, isNotification: boolean = false): string {
    // For notifications, keep it super simple
    if (isNotification) {
      // Remove any bullet points or formatting
      let simplified = response.replace(/[•▪–—]/g, '');
      // Remove line breaks
      simplified = simplified.replace(/\n+/g, ' ');
      // Clean up spaces
      simplified = simplified.replace(/\s+/g, ' ').trim();
      // Truncate if still too long - use platform limits
      const maxLength = 180; // Increased from 100 to show more content
      if (simplified.length > maxLength) {
        // Find the last complete sentence or phrase within limit
        const truncated = simplified.substring(0, maxLength);
        const lastPunctuation = Math.max(
          truncated.lastIndexOf('.'),
          truncated.lastIndexOf('!'),
          truncated.lastIndexOf('?'),
          truncated.lastIndexOf(',')
        );
        
        if (lastPunctuation > maxLength * 0.7) {
          // If we found punctuation in the last 30% of the text, use that
          simplified = truncated.substring(0, lastPunctuation + 1);
        } else {
          // Otherwise, find the last complete word
          const lastSpace = truncated.lastIndexOf(' ');
          if (lastSpace > maxLength * 0.7) {
            simplified = truncated.substring(0, lastSpace) + '...';
          } else {
            simplified = truncated.substring(0, maxLength - 3) + '...';
          }
        }
      }
      return simplified;
    }
    
    // Already well-formatted responses (with bullet points)
    if (response.includes('•') || response.includes('▪')) {
      return response;
    }
    
    // Convert numbered lists to bullet points
    let formatted = response.replace(/^\d+\.\s+/gm, '• ');
    
    // Convert dash lists to bullet points
    formatted = formatted.replace(/^[-*]\s+/gm, '• ');
    
    // Add line breaks before bullet points if missing
    formatted = formatted.replace(/([.!?])\s*•/g, '$1\n\n•');
    
    // Ensure proper spacing between paragraphs
    formatted = formatted.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');
    
    // Clean up excessive line breaks
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Trim whitespace
    return formatted.trim();
  }
  
  /**
   * Formats response specifically for notification display
   */
  formatNotificationResponse(response: string): string {
    return this.formatAIResponse(response, true);
  }
  
  /**
   * Extracts exercise steps from AI response
   */
  extractExerciseSteps(response: string): string[] {
    const steps: string[] = [];
    
    // Match bullet points
    const bulletMatches = response.match(/•\s*([^•\n]+)/g);
    if (bulletMatches) {
      return bulletMatches.map(match => match.replace(/•\s*/, '').trim());
    }
    
    // Match numbered lists
    const numberedMatches = response.match(/\d+\.\s*([^\n]+)/g);
    if (numberedMatches) {
      return numberedMatches.map(match => match.replace(/\d+\.\s*/, '').trim());
    }
    
    return steps;
  }
}

// Export singleton instance
export const conversationManager = new ConversationManager();

// Export formatting functions for backward compatibility
export const formatAIResponse = (response: string, isNotification?: boolean) => 
  conversationManager.formatAIResponse(response, isNotification);
export const formatNotificationResponse = (response: string) => 
  conversationManager.formatNotificationResponse(response);
export const extractExerciseSteps = (response: string) => 
  conversationManager.extractExerciseSteps(response);