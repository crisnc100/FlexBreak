import AsyncStorage from '@react-native-async-storage/async-storage';

interface UsageMetrics {
  date: string;
  requests: number;
  totalTokens: number;
  estimatedCost: number;
  modelUsage: {
    [model: string]: {
      requests: number;
      tokens: number;
    };
  };
}

export class AIWellnessCostMonitor {
  private static readonly METRICS_KEY = '@ai_wellness_metrics';
  private static readonly COST_PER_1K_TOKENS = {
    'openai/gpt-3.5-turbo': 0.001,
    'anthropic/claude-instant-v1': 0.0008,
    'meta-llama/llama-2-70b-chat': 0.0007
  };

  static async trackUsage(model: string, tokens: number) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const metrics = await this.getMetrics(today);
      
      // Update request count
      metrics.requests += 1;
      metrics.totalTokens += tokens;
      
      // Update model-specific usage
      if (!metrics.modelUsage[model]) {
        metrics.modelUsage[model] = { requests: 0, tokens: 0 };
      }
      metrics.modelUsage[model].requests += 1;
      metrics.modelUsage[model].tokens += tokens;
      
      // Calculate estimated cost
      const costPer1k = this.COST_PER_1K_TOKENS[model] || 0.001;
      const cost = (tokens / 1000) * costPer1k;
      metrics.estimatedCost += cost;
      
      await this.saveMetrics(today, metrics);
      
      // Check for cost alerts
      await this.checkCostAlerts(metrics);
      
    } catch (error) {
      console.error('Error tracking AI usage:', error);
    }
  }

  static async getMetrics(date: string): Promise<UsageMetrics> {
    try {
      const key = `${this.METRICS_KEY}_${date}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        return JSON.parse(data);
      }
      
      return {
        date,
        requests: 0,
        totalTokens: 0,
        estimatedCost: 0,
        modelUsage: {}
      };
    } catch (error) {
      return {
        date,
        requests: 0,
        totalTokens: 0,
        estimatedCost: 0,
        modelUsage: {}
      };
    }
  }

  static async saveMetrics(date: string, metrics: UsageMetrics) {
    try {
      const key = `${this.METRICS_KEY}_${date}`;
      await AsyncStorage.setItem(key, JSON.stringify(metrics));
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }

  static async checkCostAlerts(metrics: UsageMetrics) {
    // Alert if daily cost exceeds $1
    if (metrics.estimatedCost > 1.0) {
      console.warn(`⚠️ High API costs detected: $${metrics.estimatedCost.toFixed(2)} today`);
      // In production, send alert to monitoring service
    }
    
    // Alert if requests exceed 1000/day
    if (metrics.requests > 1000) {
      console.warn(`⚠️ High request volume: ${metrics.requests} requests today`);
    }
  }

  static async getDailyCostReport(): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const metrics = await this.getMetrics(today);
    
    let report = `📊 AI Wellness Cost Report - ${today}\n\n`;
    report += `Total Requests: ${metrics.requests}\n`;
    report += `Total Tokens: ${metrics.totalTokens}\n`;
    report += `Estimated Cost: $${metrics.estimatedCost.toFixed(4)}\n\n`;
    
    report += `Model Usage:\n`;
    Object.entries(metrics.modelUsage).forEach(([model, usage]) => {
      const modelCost = (usage.tokens / 1000) * (this.COST_PER_1K_TOKENS[model] || 0.001);
      report += `  ${model}:\n`;
      report += `    Requests: ${usage.requests}\n`;
      report += `    Tokens: ${usage.tokens}\n`;
      report += `    Cost: $${modelCost.toFixed(4)}\n`;
    });
    
    // Calculate average cost per user
    const uniqueUsers = await this.getUniqueUserCount();
    if (uniqueUsers > 0) {
      const costPerUser = metrics.estimatedCost / uniqueUsers;
      report += `\nAverage cost per user: $${costPerUser.toFixed(4)}\n`;
    }
    
    return report;
  }

  static async getWeeklyCostSummary(): Promise<{
    totalCost: number;
    totalRequests: number;
    averageCostPerDay: number;
    projectedMonthlyCost: number;
  }> {
    let totalCost = 0;
    let totalRequests = 0;
    const days = 7;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const metrics = await this.getMetrics(dateStr);
      totalCost += metrics.estimatedCost;
      totalRequests += metrics.requests;
    }
    
    const averageCostPerDay = totalCost / days;
    const projectedMonthlyCost = averageCostPerDay * 30;
    
    return {
      totalCost,
      totalRequests,
      averageCostPerDay,
      projectedMonthlyCost
    };
  }

  private static async getUniqueUserCount(): Promise<number> {
    // In production, this would query actual user usage
    // For now, estimate based on request patterns
    const today = new Date().toISOString().split('T')[0];
    const metrics = await this.getMetrics(today);
    
    // Rough estimate: assume 2 requests per active user
    return Math.floor(metrics.requests / 2);
  }

  static async optimizeCosts(): Promise<string[]> {
    const recommendations: string[] = [];
    const weeklyStats = await this.getWeeklyCostSummary();
    
    // Check if costs are too high
    if (weeklyStats.projectedMonthlyCost > 50) {
      recommendations.push('Consider using cheaper models for simple queries');
      recommendations.push('Implement response caching for common questions');
      recommendations.push('Reduce max token limits for responses');
    }
    
    // Check request patterns
    if (weeklyStats.averageCostPerDay > 2) {
      recommendations.push('Review prompt engineering to reduce token usage');
      recommendations.push('Consider implementing request throttling');
    }
    
    return recommendations;
  }
}

// Export for use in AI wellness service
export const trackAIUsage = AIWellnessCostMonitor.trackUsage.bind(AIWellnessCostMonitor);
export const getAICostReport = AIWellnessCostMonitor.getDailyCostReport.bind(AIWellnessCostMonitor);