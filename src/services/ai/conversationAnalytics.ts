import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../storageService';
import { categorizeInput } from './contextBuilder';

interface ConversationMetrics {
  totalConversations: number;
  averageMessageLength: number;
  commonCategories: { [category: string]: number };
  responseRate: number;
  engagementScore: number;
  mostActiveTimeOfDay: string;
  effectivenessRate: number;
  premiumConversionPotential: number;
}

interface DailyMetrics {
  date: string;
  conversations: number;
  categories: { [category: string]: number };
  avgMessageLength: number;
  cacheHitRate: number;
  apiCalls: number;
}

export class ConversationAnalytics {
  private static readonly ANALYTICS_KEY = '@ai_wellness_analytics';
  private static readonly DAILY_METRICS_KEY = '@ai_wellness_daily_metrics';
  
  static async trackConversation(
    userId: string,
    userInput: string,
    aiResponse: string,
    category: string,
    wasCached: boolean = false
  ): Promise<void> {
    try {
      // Update daily metrics
      const today = new Date().toISOString().split('T')[0];
      const dailyKey = `${this.DAILY_METRICS_KEY}_${today}`;
      const existingDaily = await AsyncStorage.getItem(dailyKey);
      const dailyMetrics: DailyMetrics = existingDaily ? JSON.parse(existingDaily) : {
        date: today,
        conversations: 0,
        categories: {},
        avgMessageLength: 0,
        cacheHitRate: 0,
        apiCalls: 0
      };
      
      // Update metrics
      dailyMetrics.conversations++;
      dailyMetrics.categories[category] = (dailyMetrics.categories[category] || 0) + 1;
      
      // Update average message length
      const currentTotal = dailyMetrics.avgMessageLength * (dailyMetrics.conversations - 1);
      dailyMetrics.avgMessageLength = (currentTotal + userInput.length) / dailyMetrics.conversations;
      
      // Update cache hit rate
      if (!wasCached) dailyMetrics.apiCalls++;
      dailyMetrics.cacheHitRate = (dailyMetrics.conversations - dailyMetrics.apiCalls) / dailyMetrics.conversations;
      
      await AsyncStorage.setItem(dailyKey, JSON.stringify(dailyMetrics));
      
      // Update user-specific analytics
      const userKey = `${this.ANALYTICS_KEY}_${userId}`;
      const existing = await AsyncStorage.getItem(userKey);
      const analytics = existing ? JSON.parse(existing) : {
        firstUse: Date.now(),
        lastUse: Date.now(),
        totalMessages: 0,
        categories: {},
        timeOfDayUsage: {},
        wordCount: 0,
        effectivenessResponses: 0,
        positiveEffectiveness: 0
      };
      
      analytics.lastUse = Date.now();
      analytics.totalMessages++;
      analytics.categories[category] = (analytics.categories[category] || 0) + 1;
      analytics.wordCount += userInput.split(' ').length;
      
      // Track time of day usage
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      analytics.timeOfDayUsage[timeOfDay] = (analytics.timeOfDayUsage[timeOfDay] || 0) + 1;
      
      await AsyncStorage.setItem(userKey, JSON.stringify(analytics));
    } catch (error) {
      console.error('Error tracking conversation analytics:', error);
    }
  }
  
  static async trackEffectivenessResponse(
    userId: string,
    effectiveness: 'YES' | 'SOMEWHAT' | 'NO'
  ): Promise<void> {
    try {
      const userKey = `${this.ANALYTICS_KEY}_${userId}`;
      const existing = await AsyncStorage.getItem(userKey);
      if (!existing) return;
      
      const analytics = JSON.parse(existing);
      analytics.effectivenessResponses = (analytics.effectivenessResponses || 0) + 1;
      
      if (effectiveness === 'YES') {
        analytics.positiveEffectiveness = (analytics.positiveEffectiveness || 0) + 1;
      }
      
      await AsyncStorage.setItem(userKey, JSON.stringify(analytics));
    } catch (error) {
      console.error('Error tracking effectiveness response:', error);
    }
  }
  
  static async getUserMetrics(userId: string): Promise<ConversationMetrics> {
    try {
      const userKey = `${this.ANALYTICS_KEY}_${userId}`;
      const data = await AsyncStorage.getItem(userKey);
      
      if (!data) {
        return this.getEmptyMetrics();
      }
      
      const analytics = JSON.parse(data);
      const daysSinceFirst = Math.max(1, Math.floor((Date.now() - analytics.firstUse) / (1000 * 60 * 60 * 24)));
      
      // Calculate engagement score (0-100)
      const messagesPerDay = analytics.totalMessages / daysSinceFirst;
      const avgWordCount = analytics.wordCount / analytics.totalMessages;
      const engagementScore = Math.min(100, 
        (messagesPerDay * 20) + // Up to 40 points for frequency
        (avgWordCount * 2) + // Up to 40 points for message length
        (analytics.effectivenessResponses / analytics.totalMessages * 20) // Up to 20 points for feedback
      );
      
      // Calculate effectiveness rate
      const effectivenessRate = analytics.effectivenessResponses > 0
        ? analytics.positiveEffectiveness / analytics.effectivenessResponses
        : 0;
      
      // Find most active time
      const timeEntries = Object.entries(analytics.timeOfDayUsage || {});
      const mostActiveTime = timeEntries.length > 0
        ? timeEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0]
        : 'afternoon';
      
      // Calculate premium conversion potential (0-100)
      const conversionPotential = this.calculateConversionPotential(analytics, engagementScore);
      
      return {
        totalConversations: analytics.totalMessages,
        averageMessageLength: avgWordCount,
        commonCategories: analytics.categories,
        responseRate: analytics.effectivenessResponses / analytics.totalMessages,
        engagementScore: Math.round(engagementScore),
        mostActiveTimeOfDay: mostActiveTime,
        effectivenessRate,
        premiumConversionPotential: Math.round(conversionPotential)
      };
    } catch (error) {
      console.error('Error getting user metrics:', error);
      return this.getEmptyMetrics();
    }
  }
  
  static async getWeeklyReport(): Promise<{
    totalUsers: number;
    totalConversations: number;
    avgEngagement: number;
    topCategories: string[];
    cacheEfficiency: number;
    projectedCost: number;
  }> {
    try {
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      let totalUsers = 0;
      let totalConversations = 0;
      let totalCacheHits = 0;
      let totalApiCalls = 0;
      const categoryCount: { [key: string]: number } = {};
      
      // Get all daily metrics for the past week
      for (let i = 0; i < 7; i++) {
        const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
        const dateStr = date.toISOString().split('T')[0];
        const dailyKey = `${this.DAILY_METRICS_KEY}_${dateStr}`;
        
        const data = await AsyncStorage.getItem(dailyKey);
        if (data) {
          const metrics: DailyMetrics = JSON.parse(data);
          totalConversations += metrics.conversations;
          totalApiCalls += metrics.apiCalls;
          totalCacheHits += (metrics.conversations - metrics.apiCalls);
          
          // Aggregate categories
          Object.entries(metrics.categories).forEach(([cat, count]) => {
            categoryCount[cat] = (categoryCount[cat] || 0) + count;
          });
        }
      }
      
      // Get unique users (approximate)
      totalUsers = Math.ceil(totalConversations / 14); // Assume 2 messages/day average
      
      // Calculate cache efficiency
      const cacheEfficiency = totalConversations > 0 
        ? totalCacheHits / totalConversations 
        : 0;
      
      // Project monthly cost
      const avgDailyCost = (totalApiCalls * 0.001) / 7; // $0.001 per API call
      const projectedCost = avgDailyCost * 30;
      
      // Get top categories
      const topCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);
      
      return {
        totalUsers,
        totalConversations,
        avgEngagement: totalUsers > 0 ? totalConversations / totalUsers : 0,
        topCategories,
        cacheEfficiency,
        projectedCost
      };
    } catch (error) {
      console.error('Error generating weekly report:', error);
      return {
        totalUsers: 0,
        totalConversations: 0,
        avgEngagement: 0,
        topCategories: [],
        cacheEfficiency: 0,
        projectedCost: 0
      };
    }
  }
  
  private static calculateConversionPotential(analytics: any, engagementScore: number): number {
    let potential = engagementScore * 0.5; // Base on engagement
    
    // Bonus for hitting limits
    if (analytics.categories['limit_reached']) {
      potential += 20;
    }
    
    // Bonus for regular usage
    const daysSinceFirst = Math.max(1, Math.floor((Date.now() - analytics.firstUse) / (1000 * 60 * 60 * 24)));
    const usageConsistency = Math.min(1, analytics.totalMessages / (daysSinceFirst * 2));
    potential += usageConsistency * 30;
    
    return Math.min(100, potential);
  }
  
  private static getEmptyMetrics(): ConversationMetrics {
    return {
      totalConversations: 0,
      averageMessageLength: 0,
      commonCategories: {},
      responseRate: 0,
      engagementScore: 0,
      mostActiveTimeOfDay: 'afternoon',
      effectivenessRate: 0,
      premiumConversionPotential: 0
    };
  }
}

export default ConversationAnalytics;