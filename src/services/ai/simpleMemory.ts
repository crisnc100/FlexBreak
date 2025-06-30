import AsyncStorage from '@react-native-async-storage/async-storage';

// Device-local wellness memory - stores only user-mentioned data
export interface SimpleUserMemory {
  language: 'en' | 'es' | 'zh';
  wellness_data: {
    physical_issues: string[]; // Max 5 items like "back hurts", "neck tension"
    stress_patterns: string[]; // Max 5 items like "work deadlines", "afternoon fatigue"
    effective_solutions: string[]; // Max 5 solutions that worked
    goals: string[]; // Max 5 user goals
  };
  usage: {
    lastCheckIn: number;
    weeklyCount: number;
    isPremium: boolean;
  };
}

class SimpleMemoryService {
  private getKey(userId: string): string {
    return `@ai_simple_memory_${userId}`;
  }

  async getMemory(userId: string): Promise<SimpleUserMemory> {
    try {
      const data = await AsyncStorage.getItem(this.getKey(userId));
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.log('Error loading simple memory:', error);
    }
    
    // Default memory
    return {
      language: 'en',
      wellness_data: {
        physical_issues: [],
        stress_patterns: [],
        effective_solutions: [],
        goals: []
      },
      usage: {
        lastCheckIn: 0,
        weeklyCount: 0,
        isPremium: false
      }
    };
  }

  async updateMemory(userId: string, update: Partial<SimpleUserMemory>): Promise<void> {
    try {
      const current = await this.getMemory(userId);
      const updated = { ...current, ...update };
      
      // Keep arrays limited to 5 items max
      if (updated.wellness_data) {
        for (const key in updated.wellness_data) {
          const arr = updated.wellness_data[key as keyof typeof updated.wellness_data];
          if (Array.isArray(arr) && arr.length > 5) {
            updated.wellness_data[key as keyof typeof updated.wellness_data] = arr.slice(-5);
          }
        }
      }
      
      await AsyncStorage.setItem(this.getKey(userId), JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating simple memory:', error);
    }
  }

  async addPhysicalIssue(userId: string, issue: string): Promise<void> {
    const memory = await this.getMemory(userId);
    if (!memory.wellness_data.physical_issues.includes(issue)) {
      memory.wellness_data.physical_issues.push(issue);
      await this.updateMemory(userId, { wellness_data: memory.wellness_data });
    }
  }

  async addStressPattern(userId: string, pattern: string): Promise<void> {
    const memory = await this.getMemory(userId);
    if (!memory.wellness_data.stress_patterns.includes(pattern)) {
      memory.wellness_data.stress_patterns.push(pattern);
      await this.updateMemory(userId, { wellness_data: memory.wellness_data });
    }
  }

  async addEffectiveSolution(userId: string, solution: string): Promise<void> {
    const memory = await this.getMemory(userId);
    if (!memory.wellness_data.effective_solutions.includes(solution)) {
      memory.wellness_data.effective_solutions.push(solution);
      await this.updateMemory(userId, { wellness_data: memory.wellness_data });
    }
  }

  async addGoal(userId: string, goal: string): Promise<void> {
    const memory = await this.getMemory(userId);
    if (!memory.wellness_data.goals.includes(goal)) {
      memory.wellness_data.goals.push(goal);
      await this.updateMemory(userId, { wellness_data: memory.wellness_data });
    }
  }

  // Build context string for AI prompt
  async buildContext(userId: string, language: 'en' | 'es' | 'zh' = 'en'): Promise<string> {
    const memory = await this.getMemory(userId);
    const parts = [];
    
    const labels = {
      en: { 
        recurring: 'User often has', 
        helps: 'What helps them', 
        lastCheckIn: 'Last check-in',
        goals: 'Working on'
      },
      es: { 
        recurring: 'Usuario frecuentemente tiene', 
        helps: 'Lo que le ayuda', 
        lastCheckIn: 'Último registro',
        goals: 'Trabajando en'
      },
      zh: { 
        recurring: '用户经常有', 
        helps: '有效方法', 
        lastCheckIn: '上次签到',
        goals: '正在努力'
      }
    };
    
    const lang = labels[language];
    
    // Combine and prioritize most recent/frequent issues
    const allIssues = [
      ...memory.wellness_data.physical_issues,
      ...memory.wellness_data.stress_patterns
    ].slice(-3);  // Take most recent 3
    
    if (allIssues.length > 0) {
      parts.push(`${lang.recurring}: ${allIssues.join(', ')}`);
    }
    
    if (memory.wellness_data.effective_solutions.length > 0) {
      parts.push(`${lang.helps}: ${memory.wellness_data.effective_solutions.slice(-2).join(', ')}`);
    }
    
    if (memory.wellness_data.goals.length > 0) {
      parts.push(`${lang.goals}: ${memory.wellness_data.goals[0]}`);
    }
    
    // Add timing context
    if (memory.usage.lastCheckIn > 0) {
      const hoursSinceLastCheckIn = Math.floor((Date.now() - memory.usage.lastCheckIn) / (1000 * 60 * 60));
      if (hoursSinceLastCheckIn < 24) {
        parts.push(`${lang.lastCheckIn}: ${hoursSinceLastCheckIn}h ago`);
      }
    }
    
    return parts.join('. ') || 'First time user';
  }

  // Extract wellness data from user input
  async extractAndStore(userId: string, userInput: string, language: 'en' | 'es' | 'zh'): Promise<void> {
    const input = userInput.toLowerCase();
    
    // Physical issue patterns - extract more context
    const physicalPatterns = {
      en: [
        { pattern: /(my|i have|feeling)?.*(back|neck|shoulder|hip).*(hurt|pain|ache|sore)/i, extract: 'full' },
        { pattern: /(headache|migraine|head.*hurt)/i, extract: 'headache' },
        { pattern: /(stomach|belly|tummy).*(hurt|pain|ache)/i, extract: 'stomach issues' },
        { pattern: /(knee|ankle|wrist|elbow).*(hurt|pain|sore)/i, extract: 'joint pain' }
      ],
      es: [
        { pattern: /(mi|tengo|siento)?.*(espalda|cuello|hombro|cadera).*(duele|dolor)/i, extract: 'full' },
        { pattern: /(dolor de cabeza|migraña)/i, extract: 'dolor de cabeza' },
        { pattern: /(estómago|barriga|panza).*(duele|dolor)/i, extract: 'problemas estomacales' }
      ],
      zh: [
        { pattern: /(背|脖子|肩|臀).{0,5}(疼|痛|酸痛)/i, extract: 'full' },
        { pattern: /头痛|头疼/i, extract: '头痛' },
        { pattern: /(胃|肚子).{0,5}(痛|不舒服)/i, extract: '胃部不适' }
      ]
    };
    
    // Stress patterns - capture context
    const stressPatterns = {
      en: [
        { pattern: /(stressed|anxious|overwhelmed).*(work|deadline|project)/i, extract: 'work stress' },
        { pattern: /(tired|exhausted|fatigue).*(always|constantly|very)/i, extract: 'chronic fatigue' },
        { pattern: /(can't|cannot|trouble).*(sleep|focus|concentrate)/i, extract: 'full' }
      ],
      es: [
        { pattern: /(estresado|ansioso|abrumado).*(trabajo|proyecto)/i, extract: 'estrés laboral' },
        { pattern: /(cansado|agotado|fatiga).*(siempre|mucho|muy)/i, extract: 'fatiga crónica' }
      ],
      zh: [
        { pattern: /(压力|焦虑).{0,5}(工作|项目|任务)/i, extract: '工作压力' },
        { pattern: /(太累|疲惫|疲劳).{0,5}(了|很)/i, extract: '慢性疲劳' }
      ]
    };
    
    // Extract physical issues with context
    const physicalList = physicalPatterns[language] || physicalPatterns.en;
    for (const { pattern, extract } of physicalList) {
      const match = userInput.match(pattern);
      if (match) {
        const issue = extract === 'full' ? match[0].substring(0, 30) : extract;
        await this.addPhysicalIssue(userId, issue);
        break;
      }
    }
    
    // Extract stress patterns with context
    const stressList = stressPatterns[language] || stressPatterns.en;
    for (const { pattern, extract } of stressList) {
      const match = userInput.match(pattern);
      if (match) {
        const stress = extract === 'full' ? match[0].substring(0, 30) : extract;
        await this.addStressPattern(userId, stress);
        break;
      }
    }
    
    // Extract goals if mentioned
    const goalPatterns = {
      en: /(?:want to|need to|trying to|goal is to)\s+([^.!?]+)/i,
      es: /(?:quiero|necesito|tratando de|mi meta es)\s+([^.!?]+)/i,
      zh: /(?:想要|需要|正在|目标是)\s*([^.。!?]+)/i
    };
    
    const goalPattern = goalPatterns[language] || goalPatterns.en;
    const goalMatch = userInput.match(goalPattern);
    if (goalMatch && goalMatch[1]) {
      await this.addGoal(userId, goalMatch[1].trim().substring(0, 40));
    }
  }
}

export default new SimpleMemoryService();