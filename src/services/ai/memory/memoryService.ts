import AsyncStorage from '@react-native-async-storage/async-storage';

// Unified memory system with validation, confidence scoring, and backward compatibility
export interface UnifiedUserMemory {
  language: 'en' | 'es' | 'zh';
  wellness_data: {
    // Store with confidence scores and timestamps
    physical_issues: Array<{
      issue: string;
      confidence: number; // 0-1
      mentions: number;
      lastMentioned: number;
    }>;
    effective_solutions: Array<{
      solution: string;
      context: string;
      confirmedEffective: boolean;
      timestamp: number;
    }>;
    patterns: Array<{
      type: 'stress' | 'energy' | 'pain' | 'mood';
      pattern: string;
      frequency: number;
      lastOccurred: number;
    }>;
    // From simpleMemory - simplified storage
    stress_patterns: string[]; // Legacy support
    goals: string[]; // User goals from simpleMemory
  };
  preferences: {
    responseStyle: 'encouraging' | 'practical' | 'gentle';
    preferredExercises: string[];
  };
  usage: {
    lastCheckIn: number;
    totalInteractions: number;
    weeklyCount: number; // From simpleMemory
    isPremium: boolean;
  };
}

// Legacy simple memory interface for backward compatibility
export interface SimpleUserMemory {
  language: 'en' | 'es' | 'zh';
  wellness_data: {
    physical_issues: string[];
    stress_patterns: string[];
    effective_solutions: string[];
    goals: string[];
  };
  usage: {
    lastCheckIn: number;
    weeklyCount: number;
    isPremium: boolean;
  };
}

class UnifiedMemoryService {
  private readonly MEMORY_PREFIX = '@ai_improved_memory_';
  private readonly SIMPLE_MEMORY_PREFIX = '@ai_simple_memory_';
  private readonly CONFIDENCE_THRESHOLD = 0.7;
  private readonly MAX_ITEMS = 5;
  
  private getKey(userId: string): string {
    return `${this.MEMORY_PREFIX}${userId}`;
  }
  
  private getSimpleKey(userId: string): string {
    return `${this.SIMPLE_MEMORY_PREFIX}${userId}`;
  }
  
  async getMemory(userId: string): Promise<UnifiedUserMemory> {
    try {
      // First try to load improved memory
      const data = await AsyncStorage.getItem(this.getKey(userId));
      if (data) {
        const parsed = JSON.parse(data);
        // Ensure all required fields exist
        return this.ensureMemoryStructure(parsed);
      }
      
      // Check for legacy simple memory
      const simpleData = await AsyncStorage.getItem(this.getSimpleKey(userId));
      if (simpleData) {
        console.log('Migrating from simple memory to unified memory');
        const migrated = await this.migrateFromSimpleMemory(userId, JSON.parse(simpleData));
        await this.saveMemory(userId, migrated);
        // Clean up old simple memory
        await AsyncStorage.removeItem(this.getSimpleKey(userId));
        return migrated;
      }
    } catch (error) {
      console.log('Error loading memory:', error);
    }
    
    // Default memory
    return {
      language: 'en',
      wellness_data: {
        physical_issues: [],
        effective_solutions: [],
        patterns: [],
        stress_patterns: [],
        goals: []
      },
      preferences: {
        responseStyle: 'encouraging',
        preferredExercises: []
      },
      usage: {
        lastCheckIn: Date.now(),
        totalInteractions: 0,
        weeklyCount: 0,
        isPremium: false
      }
    };
  }
  
  /**
   * Ensure memory has all required fields (for backward compatibility)
   */
  private ensureMemoryStructure(memory: any): UnifiedUserMemory {
    return {
      language: memory.language || 'en',
      wellness_data: {
        physical_issues: memory.wellness_data?.physical_issues || [],
        effective_solutions: memory.wellness_data?.effective_solutions || [],
        patterns: memory.wellness_data?.patterns || [],
        stress_patterns: memory.wellness_data?.stress_patterns || [],
        goals: memory.wellness_data?.goals || []
      },
      preferences: memory.preferences || {
        responseStyle: 'encouraging',
        preferredExercises: []
      },
      usage: {
        lastCheckIn: memory.usage?.lastCheckIn || Date.now(),
        totalInteractions: memory.usage?.totalInteractions || 0,
        weeklyCount: memory.usage?.weeklyCount || 0,
        isPremium: memory.usage?.isPremium || false
      }
    };
  }
  
  /**
   * Migrate from simple memory format to unified format
   */
  private async migrateFromSimpleMemory(userId: string, simpleMemory: SimpleUserMemory): Promise<UnifiedUserMemory> {
    return {
      language: simpleMemory.language || 'en',
      wellness_data: {
        // Convert simple strings to confidence-based format
        physical_issues: simpleMemory.wellness_data.physical_issues.map(issue => ({
          issue,
          confidence: 0.8, // Assume high confidence for migrated data
          mentions: 1,
          lastMentioned: simpleMemory.usage.lastCheckIn || Date.now()
        })),
        effective_solutions: simpleMemory.wellness_data.effective_solutions.map(solution => ({
          solution,
          context: 'Migrated from previous system',
          confirmedEffective: true,
          timestamp: simpleMemory.usage.lastCheckIn || Date.now()
        })),
        patterns: simpleMemory.wellness_data.stress_patterns.map(pattern => ({
          type: 'stress' as const,
          pattern,
          frequency: 1,
          lastOccurred: simpleMemory.usage.lastCheckIn || Date.now()
        })),
        // Keep legacy arrays for compatibility
        stress_patterns: simpleMemory.wellness_data.stress_patterns || [],
        goals: simpleMemory.wellness_data.goals || []
      },
      preferences: {
        responseStyle: 'encouraging',
        preferredExercises: []
      },
      usage: {
        lastCheckIn: simpleMemory.usage.lastCheckIn || Date.now(),
        totalInteractions: simpleMemory.usage.weeklyCount || 0,
        weeklyCount: simpleMemory.usage.weeklyCount || 0,
        isPremium: simpleMemory.usage.isPremium || false
      }
    };
  }
  
  async saveMemory(userId: string, memory: UnifiedUserMemory): Promise<void> {
    try {
      // Clean up old entries before saving
      memory = this.cleanupMemory(memory);
      await AsyncStorage.setItem(this.getKey(userId), JSON.stringify(memory));
    } catch (error) {
      console.error('Error saving improved memory:', error);
    }
  }
  
  /**
   * Extract and validate wellness information from user input
   */
  async extractAndStore(userId: string, userInput: string, aiResponse: string, language: 'en' | 'es' | 'zh'): Promise<void> {
    const memory = await this.getMemory(userId);
    const input = userInput.toLowerCase();
    const response = aiResponse.toLowerCase();
    
    // Only extract if user explicitly mentions issues
    const explicitIndicators = {
      en: ['i have', 'my', 'feeling', 'been having', 'suffering from', 'dealing with'],
      es: ['tengo', 'mi', 'siento', 'he tenido', 'sufro de', 'lidio con'],
      zh: ['我有', '我的', '感觉', '一直有', '患有']
    };
    
    const hasExplicitMention = explicitIndicators[language].some(indicator => input.includes(indicator));
    
    if (hasExplicitMention) {
      // Extract physical issues with validation
      await this.extractPhysicalIssues(memory, userInput, language);
      
      // Extract patterns only from repeated mentions
      await this.extractPatterns(memory, userInput, language);
    }
    
    // Extract effective solutions only if user confirms they helped
    if (this.userConfirmedEffectiveness(userInput, aiResponse, language)) {
      await this.extractEffectiveSolution(memory, userInput, aiResponse);
    }
    
    // Update usage stats
    memory.usage.lastCheckIn = Date.now();
    memory.usage.totalInteractions++;
    memory.language = language;
    
    await this.saveMemory(userId, memory);
  }
  
  /**
   * Build context string with confidence-based filtering
   */
  async buildContext(userId: string, language: 'en' | 'es' | 'zh'): Promise<string> {
    const memory = await this.getMemory(userId);
    const parts: string[] = [];
    
    // Only include high-confidence physical issues
    const confirmedIssues = memory.wellness_data.physical_issues
      .filter(item => item.confidence >= this.CONFIDENCE_THRESHOLD && item.mentions >= 2)
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 3)
      .map(item => item.issue);
    
    if (confirmedIssues.length > 0) {
      const label = {
        en: 'User has mentioned',
        es: 'Usuario ha mencionado',
        zh: '用户提到过'
      }[language];
      parts.push(`${label}: ${confirmedIssues.join(', ')}`);
    }
    
    // Only include confirmed effective solutions
    const confirmedSolutions = memory.wellness_data.effective_solutions
      .filter(item => item.confirmedEffective)
      .slice(-2)
      .map(item => item.solution);
    
    if (confirmedSolutions.length > 0) {
      const label = {
        en: 'Previously helped',
        es: 'Anteriormente ayudó',
        zh: '之前有帮助'
      }[language];
      parts.push(`${label}: ${confirmedSolutions.join(', ')}`);
    }
    
    // Include frequency patterns
    const frequentPatterns = memory.wellness_data.patterns
      .filter(item => item.frequency >= 3)
      .slice(0, 2)
      .map(item => item.pattern);
    
    if (frequentPatterns.length > 0) {
      const label = {
        en: 'Recurring',
        es: 'Recurrente',
        zh: '经常出现'
      }[language];
      parts.push(`${label}: ${frequentPatterns.join(', ')}`);
    }
    
    // Add interaction history context
    if (memory.usage.totalInteractions > 5) {
      const daysSinceStart = Math.floor((Date.now() - memory.usage.lastCheckIn) / (1000 * 60 * 60 * 24 * 7));
      if (daysSinceStart > 0) {
        parts.push(`Regular user for ${daysSinceStart} weeks`);
      }
    }
    
    return parts.length > 0 ? parts.join('. ') : '';
  }
  
  /**
   * Extract physical issues with validation
   */
  private async extractPhysicalIssues(memory: UnifiedUserMemory, input: string, language: string): Promise<void> {
    // More specific patterns with body parts
    const bodyParts = {
      en: ['back', 'neck', 'shoulder', 'knee', 'wrist', 'ankle', 'hip', 'elbow', 'head'],
      es: ['espalda', 'cuello', 'hombro', 'rodilla', 'muñeca', 'tobillo', 'cadera', 'codo', 'cabeza'],
      zh: ['背', '脖子', '肩膀', '膝盖', '手腕', '脚踝', '臀部', '肘部', '头']
    };
    
    const painWords = {
      en: ['hurt', 'pain', 'ache', 'sore', 'stiff', 'tension'],
      es: ['duele', 'dolor', 'adolorido', 'tenso', 'rigidez'],
      zh: ['疼', '痛', '酸痛', '僵硬', '紧张']
    };
    
    const parts = bodyParts[language as keyof typeof bodyParts] || bodyParts.en;
    const pains = painWords[language as keyof typeof painWords] || painWords.en;
    
    for (const part of parts) {
      if (input.includes(part)) {
        for (const pain of pains) {
          if (input.includes(pain)) {
            const issue = `${part} ${pain}`;
            
            // Check if already exists
            const existing = memory.wellness_data.physical_issues.find(i => i.issue === issue);
            if (existing) {
              existing.mentions++;
              existing.confidence = Math.min(1, existing.confidence + 0.2);
              existing.lastMentioned = Date.now();
            } else {
              memory.wellness_data.physical_issues.push({
                issue,
                confidence: 0.6,
                mentions: 1,
                lastMentioned: Date.now()
              });
            }
            break;
          }
        }
      }
    }
  }
  
  /**
   * Extract patterns from repeated mentions
   */
  private async extractPatterns(memory: UnifiedUserMemory, input: string, language: string): Promise<void> {
    const patterns = {
      stress: {
        en: ['stress', 'anxious', 'overwhelmed', 'worried'],
        es: ['estrés', 'ansioso', 'abrumado', 'preocupado'],
        zh: ['压力', '焦虑', '不知所措', '担心']
      },
      energy: {
        en: ['tired', 'exhausted', 'fatigue', 'no energy'],
        es: ['cansado', 'agotado', 'fatiga', 'sin energía'],
        zh: ['累', '疲惫', '疲劳', '没精神']
      }
    };
    
    for (const [type, words] of Object.entries(patterns)) {
      const langWords = words[language as keyof typeof words] || words.en;
      for (const word of langWords) {
        if (input.includes(word)) {
          const existing = memory.wellness_data.patterns.find(p => p.type === type as any);
          if (existing) {
            existing.frequency++;
            existing.lastOccurred = Date.now();
          } else {
            memory.wellness_data.patterns.push({
              type: type as any,
              pattern: word,
              frequency: 1,
              lastOccurred: Date.now()
            });
          }
          break;
        }
      }
    }
  }
  
  /**
   * Check if user confirmed something was effective
   */
  private userConfirmedEffectiveness(userInput: string, aiResponse: string, language: string): boolean {
    const confirmations = {
      en: ['that helped', 'feel better', 'worked', 'thank', 'great advice'],
      es: ['eso ayudó', 'me siento mejor', 'funcionó', 'gracias', 'buen consejo'],
      zh: ['有帮助', '感觉好多了', '有效', '谢谢', '好建议']
    };
    
    const langConfirm = confirmations[language as keyof typeof confirmations] || confirmations.en;
    return langConfirm.some(phrase => userInput.toLowerCase().includes(phrase));
  }
  
  /**
   * Extract effective solution with context
   */
  private async extractEffectiveSolution(memory: UnifiedUserMemory, userInput: string, aiResponse: string): Promise<void> {
    // Extract the main advice from AI response (usually first sentence)
    const firstSentence = aiResponse.split(/[.!?]/)[0].trim();
    
    if (firstSentence.length > 10 && firstSentence.length < 100) {
      memory.wellness_data.effective_solutions.push({
        solution: firstSentence,
        context: userInput.substring(0, 50),
        confirmedEffective: true,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Add methods from simpleMemory for backward compatibility
   */
  async updateMemory(userId: string, update: Partial<UnifiedUserMemory>): Promise<void> {
    try {
      const current = await this.getMemory(userId);
      const updated = { ...current, ...update };
      
      // Keep arrays limited to 5 items max (from simpleMemory)
      if (updated.wellness_data) {
        // Limit simple arrays
        if (updated.wellness_data.stress_patterns?.length > 5) {
          updated.wellness_data.stress_patterns = updated.wellness_data.stress_patterns.slice(-5);
        }
        if (updated.wellness_data.goals?.length > 5) {
          updated.wellness_data.goals = updated.wellness_data.goals.slice(-5);
        }
      }
      
      await this.saveMemory(userId, updated);
    } catch (error) {
      console.error('Error updating memory:', error);
    }
  }
  
  async addPhysicalIssue(userId: string, issue: string): Promise<void> {
    const memory = await this.getMemory(userId);
    
    // Check if already exists in confidence-based format
    const existing = memory.wellness_data.physical_issues.find(i => i.issue === issue);
    if (existing) {
      existing.mentions++;
      existing.confidence = Math.min(1, existing.confidence + 0.2);
      existing.lastMentioned = Date.now();
    } else {
      memory.wellness_data.physical_issues.push({
        issue,
        confidence: 0.6,
        mentions: 1,
        lastMentioned: Date.now()
      });
    }
    
    await this.saveMemory(userId, memory);
  }
  
  async addStressPattern(userId: string, pattern: string): Promise<void> {
    const memory = await this.getMemory(userId);
    
    // Add to simple array for compatibility
    if (!memory.wellness_data.stress_patterns.includes(pattern)) {
      memory.wellness_data.stress_patterns.push(pattern);
    }
    
    // Also add to patterns array with confidence
    const existing = memory.wellness_data.patterns.find(p => p.pattern === pattern);
    if (existing) {
      existing.frequency++;
      existing.lastOccurred = Date.now();
    } else {
      memory.wellness_data.patterns.push({
        type: 'stress',
        pattern,
        frequency: 1,
        lastOccurred: Date.now()
      });
    }
    
    await this.saveMemory(userId, memory);
  }
  
  async addEffectiveSolution(userId: string, solution: string): Promise<void> {
    const memory = await this.getMemory(userId);
    
    // Check if already exists
    const exists = memory.wellness_data.effective_solutions.some(s => s.solution === solution);
    if (!exists) {
      memory.wellness_data.effective_solutions.push({
        solution,
        context: 'Added via simple API',
        confirmedEffective: true,
        timestamp: Date.now()
      });
      await this.saveMemory(userId, memory);
    }
  }
  
  async addGoal(userId: string, goal: string): Promise<void> {
    const memory = await this.getMemory(userId);
    if (!memory.wellness_data.goals.includes(goal)) {
      memory.wellness_data.goals.push(goal);
      await this.updateMemory(userId, { wellness_data: memory.wellness_data });
    }
  }
  
  /**
   * Clean up old entries to maintain memory limits
   */
  private cleanupMemory(memory: UnifiedUserMemory): UnifiedUserMemory {
    // Remove low confidence items older than 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    memory.wellness_data.physical_issues = memory.wellness_data.physical_issues
      .filter(item => item.confidence >= 0.5 || item.lastMentioned > thirtyDaysAgo)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.MAX_ITEMS);
    
    memory.wellness_data.effective_solutions = memory.wellness_data.effective_solutions
      .filter(item => item.timestamp > thirtyDaysAgo)
      .slice(-this.MAX_ITEMS);
    
    memory.wellness_data.patterns = memory.wellness_data.patterns
      .filter(item => item.lastOccurred > thirtyDaysAgo)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, this.MAX_ITEMS);
    
    return memory;
  }
  
  /**
   * Clear all memory for a user
   */
  async clearMemory(userId: string): Promise<void> {
    await AsyncStorage.removeItem(this.getKey(userId));
  }
  
  /**
   * Get recent insights for export (for AIDataManagement component)
   */
  async getRecentInsights(userId: string, limit: number = 50): Promise<any[]> {
    const memory = await this.getMemory(userId);
    const insights: any[] = [];
    
    // Convert physical issues to insights
    memory.wellness_data.physical_issues.forEach(issue => {
      insights.push({
        type: 'physical_issue',
        content: issue.issue,
        confidence: issue.confidence,
        frequency: issue.mentions,
        timestamp: issue.lastMentioned
      });
    });
    
    // Convert effective solutions to insights
    memory.wellness_data.effective_solutions.forEach(solution => {
      insights.push({
        type: 'effective_solution',
        content: solution.solution,
        context: solution.context,
        timestamp: solution.timestamp
      });
    });
    
    // Convert patterns to insights
    memory.wellness_data.patterns.forEach(pattern => {
      insights.push({
        type: 'pattern',
        category: pattern.type,
        content: pattern.pattern,
        frequency: pattern.frequency,
        timestamp: pattern.lastOccurred
      });
    });
    
    // Sort by timestamp and limit
    return insights
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  /**
   * Get user's name (for compatibility)
   */
  async getUserName(userId: string): Promise<string | null> {
    try {
      // First check AsyncStorage for the name
      const userName = await AsyncStorage.getItem('@ai_wellness_user_name');
      return userName;
    } catch (error) {
      console.error('Error getting user name:', error);
      return null;
    }
  }
  
  /**
   * Get memory with additional compatibility fields
   */
  async getMemoryWithCompatibility(userId: string): Promise<any> {
    const memory = await this.getMemory(userId);
    
    // Add compatibility fields for components expecting old format
    return {
      ...memory,
      totalInteractions: memory.usage.totalInteractions,
      lastCheckIn: memory.usage.lastCheckIn,
      userName: await this.getUserName(userId)
    };
  }
}

// Create a unified instance that supports both simple and improved memory
const unifiedMemoryService = new UnifiedMemoryService();

// Export as default for improved memory compatibility
export default unifiedMemoryService;

// Also export as simpleMemory for backward compatibility
export const simpleMemory = unifiedMemoryService;