import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../storageService';

// Privacy-compliant wellness memory types
export interface WellnessMemory {
  // Anonymized patterns (no PII)
  commonIssues: { [category: string]: number };
  effectiveSolutions: string[];
  preferredStretchTypes: string[];
  
  // Time-based insights
  bestCheckInTimes: string[];
  energyPatterns: { [timeOfDay: string]: 'high' | 'medium' | 'low' };
  
  // Progress tracking (anonymized)
  improvementAreas: string[];
  consistencyScore: number;
  lastCheckIn: number;
  totalInteractions: number;
  
  // User preferences (non-identifying)
  preferredResponseStyle: 'encouraging' | 'practical' | 'gentle';
  userName?: string; // First name only
}

export interface ConversationInsight {
  category: string;
  solution?: string;
  effectiveness?: 'helped' | 'somewhat' | 'not_really';
  timestamp: number;
  timeOfDay: string;
}

/**
 * Privacy-compliant storage of wellness insights
 * Only stores anonymized patterns and preferences, no actual conversation content
 */
export class WellnessMemoryService {
  private readonly MEMORY_KEY = '@ai_wellness_memory';
  private readonly INSIGHTS_KEY = '@ai_wellness_insights';
  private readonly MAX_INSIGHTS = 50; // Keep last 50 interactions

  async getMemory(userId: string): Promise<WellnessMemory> {
    try {
      const memoryData = await AsyncStorage.getItem(`${this.MEMORY_KEY}_${userId}`);
      if (memoryData) {
        return JSON.parse(memoryData);
      }
      
      // Initialize with defaults
      return this.createDefaultMemory();
    } catch (error) {
      console.error('Error loading wellness memory:', error);
      return this.createDefaultMemory();
    }
  }

  async updateMemory(userId: string, updates: Partial<WellnessMemory>): Promise<void> {
    try {
      const currentMemory = await this.getMemory(userId);
      const updatedMemory = { ...currentMemory, ...updates };
      
      await AsyncStorage.setItem(
        `${this.MEMORY_KEY}_${userId}`,
        JSON.stringify(updatedMemory)
      );
    } catch (error) {
      console.error('Error updating wellness memory:', error);
    }
  }

  async addConversationInsight(
    userId: string, 
    insight: Omit<ConversationInsight, 'timestamp'>
  ): Promise<void> {
    try {
      const insightsKey = `${this.INSIGHTS_KEY}_${userId}`;
      const existingData = await AsyncStorage.getItem(insightsKey);
      const insights: ConversationInsight[] = existingData ? JSON.parse(existingData) : [];
      
      // Add new insight
      insights.push({
        ...insight,
        timestamp: Date.now()
      });
      
      // Keep only recent insights
      const recentInsights = insights.slice(-this.MAX_INSIGHTS);
      
      await AsyncStorage.setItem(insightsKey, JSON.stringify(recentInsights));
      
      // Update memory based on insights
      await this.updateMemoryFromInsights(userId, recentInsights);
    } catch (error) {
      console.error('Error adding conversation insight:', error);
    }
  }

  async getRecentInsights(userId: string, count: number = 10): Promise<ConversationInsight[]> {
    try {
      const insightsKey = `${this.INSIGHTS_KEY}_${userId}`;
      const data = await AsyncStorage.getItem(insightsKey);
      
      if (!data) return [];
      
      const insights: ConversationInsight[] = JSON.parse(data);
      return insights.slice(-count);
    } catch (error) {
      console.error('Error getting recent insights:', error);
      return [];
    }
  }

  async getPersonalizedContext(userId: string): Promise<string> {
    const memory = await this.getMemory(userId);
    const recentInsights = await this.getRecentInsights(userId, 5);
    
    console.log('Wellness Memory Debug:', {
      userId,
      totalInteractions: memory.totalInteractions,
      commonIssues: memory.commonIssues,
      effectiveSolutions: memory.effectiveSolutions,
      recentInsights: recentInsights.length
    });
    
    let context = '';
    
    // Add user name if available
    if (memory.userName) {
      context += `User's name: ${memory.userName}\n`;
    }
    
    // Add common issues
    const topIssues = Object.entries(memory.commonIssues)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([issue]) => issue);
    
    if (topIssues.length > 0) {
      context += `Common concerns: ${topIssues.join(', ')}\n`;
    }
    
    // Add effective solutions
    if (memory.effectiveSolutions.length > 0) {
      context += `Previously helpful: ${memory.effectiveSolutions.slice(0, 3).join(', ')}\n`;
    }
    
    // Add time patterns
    const currentHour = new Date().getHours();
    const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';
    const energyLevel = memory.energyPatterns[timeOfDay] || 'medium';
    context += `Usual ${timeOfDay} energy: ${energyLevel}\n`;
    
    // Add recent pattern
    if (recentInsights.length > 0) {
      const lastInsight = recentInsights[recentInsights.length - 1];
      const daysSinceLastCheckIn = Math.floor((Date.now() - lastInsight.timestamp) / (1000 * 60 * 60 * 24));
      if (daysSinceLastCheckIn > 0) {
        context += `Days since last check-in: ${daysSinceLastCheckIn}\n`;
      }
    }
    
    return context;
  }

  private async updateMemoryFromInsights(userId: string, insights: ConversationInsight[]): Promise<void> {
    const memory = await this.getMemory(userId);
    
    // Update common issues count
    insights.forEach(insight => {
      if (insight.category && insight.category !== 'general') {
        memory.commonIssues[insight.category] = (memory.commonIssues[insight.category] || 0) + 1;
      }
    });
    
    // Update effective solutions
    const effectiveInsights = insights.filter(i => i.effectiveness === 'helped' && i.solution);
    const newEffectiveSolutions = effectiveInsights.map(i => i.solution!);
    memory.effectiveSolutions = [...new Set([...memory.effectiveSolutions, ...newEffectiveSolutions])].slice(-10);
    
    // Update energy patterns
    insights.forEach(insight => {
      const energy = insight.category === 'fatigue' ? 'low' : 
                    insight.category === 'positive' ? 'high' : 'medium';
      memory.energyPatterns[insight.timeOfDay] = energy;
    });
    
    // Update interaction count and last check-in
    memory.totalInteractions = insights.length;
    memory.lastCheckIn = insights[insights.length - 1]?.timestamp || Date.now();
    
    // Calculate consistency score (0-100)
    const uniqueDays = new Set(insights.map(i => new Date(i.timestamp).toDateString())).size;
    memory.consistencyScore = Math.min(100, Math.round((uniqueDays / 30) * 100));
    
    await this.updateMemory(userId, memory);
  }

  private createDefaultMemory(): WellnessMemory {
    return {
      commonIssues: {},
      effectiveSolutions: [],
      preferredStretchTypes: [],
      bestCheckInTimes: [],
      energyPatterns: {},
      improvementAreas: [],
      consistencyScore: 0,
      lastCheckIn: Date.now(),
      totalInteractions: 0,
      preferredResponseStyle: 'encouraging'
    };
  }

  async clearMemory(userId: string): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        `${this.MEMORY_KEY}_${userId}`,
        `${this.INSIGHTS_KEY}_${userId}`
      ]);
    } catch (error) {
      console.error('Error clearing wellness memory:', error);
    }
  }
}

export default new WellnessMemoryService();