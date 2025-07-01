import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_CONFIG } from '../../../config/aiConfig';

interface CostMetrics {
  totalTokensUsed: number;
  totalCost: number;
  dailyCost: number;
  monthlyCost: number;
  lastReset: number;
  warningThreshold: number;
  hardLimit: number;
}

interface ModelCost {
  inputCostPer1k: number;
  outputCostPer1k: number;
}

interface UsageAlert {
  type: 'warning' | 'critical' | 'limit_reached';
  message: string;
  currentCost: number;
  limit: number;
}

class CostMonitor {
  private static instance: CostMonitor;
  private readonly COST_KEY = '@ai_cost_metrics';
  private readonly DAILY_LIMIT_KEY = '@ai_daily_limit';
  private readonly ALERT_CALLBACK_KEY = 'cost_alert_callbacks';
  
  // Model costs per 1k tokens (in USD)
  private readonly MODEL_COSTS: Record<string, ModelCost> = {
    'mistralai/mistral-7b-instruct': { inputCostPer1k: 0.00025, outputCostPer1k: 0.00025 },
    'mistralai/mistral-7b-instruct:free': { inputCostPer1k: 0, outputCostPer1k: 0 },
    'meta-llama/llama-3.1-8b-instruct': { inputCostPer1k: 0.00018, outputCostPer1k: 0.00018 },
    'anthropic/claude-3-haiku': { inputCostPer1k: 0.00025, outputCostPer1k: 0.00125 },
    // Google Speech API: $0.006 per 15 seconds
    'google-speech': { inputCostPer1k: 0.006, outputCostPer1k: 0 }
  };
  
  // Default limits (in USD)
  private readonly DEFAULT_LIMITS = {
    free: {
      daily: 0.05,    // $0.05/day
      monthly: 1.00,  // $1/month
      warning: 0.80   // Warn at 80%
    },
    premium: {
      daily: 0.50,    // $0.50/day
      monthly: 10.00, // $10/month
      warning: 0.80   // Warn at 80%
    }
  };
  
  private alertCallbacks: Set<(alert: UsageAlert) => void> = new Set();
  
  private constructor() {}
  
  static getInstance(): CostMonitor {
    if (!CostMonitor.instance) {
      CostMonitor.instance = new CostMonitor();
    }
    return CostMonitor.instance;
  }
  
  /**
   * Tracks token usage and calculates cost
   */
  async trackUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
    isPremium: boolean = false
  ): Promise<void> {
    try {
      const metrics = await this.getMetrics();
      const modelCost = this.MODEL_COSTS[model] || this.MODEL_COSTS['mistralai/mistral-7b-instruct'];
      
      // Calculate cost
      const inputCost = (inputTokens / 1000) * modelCost.inputCostPer1k;
      const outputCost = (outputTokens / 1000) * modelCost.outputCostPer1k;
      const totalCost = inputCost + outputCost;
      
      // Update metrics
      metrics.totalTokensUsed += inputTokens + outputTokens;
      metrics.totalCost += totalCost;
      metrics.dailyCost += totalCost;
      metrics.monthlyCost += totalCost;
      
      // Check if we need to reset daily/monthly counters
      await this.checkAndResetCounters(metrics);
      
      // Save updated metrics
      await this.saveMetrics(metrics);
      
      // Check limits and trigger alerts
      await this.checkLimitsAndAlert(metrics, isPremium);
      
      // Log for monitoring
      console.log('Cost tracking:', {
        model,
        inputTokens,
        outputTokens,
        cost: totalCost.toFixed(4),
        dailyTotal: metrics.dailyCost.toFixed(4),
        monthlyTotal: metrics.monthlyCost.toFixed(4)
      });
      
    } catch (error) {
      console.error('Error tracking cost:', error);
    }
  }
  
  /**
   * Tracks Google Speech API usage
   */
  async trackSpeechUsage(durationSeconds: number): Promise<void> {
    // Google charges $0.006 per 15 seconds
    const cost = Math.ceil(durationSeconds / 15) * 0.006;
    await this.trackUsage('google-speech', 1000, 0); // Use 1000 as proxy for cost calculation
  }
  
  /**
   * Gets current cost metrics
   */
  async getMetrics(): Promise<CostMetrics> {
    try {
      const stored = await AsyncStorage.getItem(this.COST_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading cost metrics:', error);
    }
    
    // Return default metrics
    return {
      totalTokensUsed: 0,
      totalCost: 0,
      dailyCost: 0,
      monthlyCost: 0,
      lastReset: Date.now(),
      warningThreshold: 0.8,
      hardLimit: 1.0
    };
  }
  
  /**
   * Checks and resets daily/monthly counters
   */
  private async checkAndResetCounters(metrics: CostMetrics): Promise<void> {
    const now = new Date();
    const lastReset = new Date(metrics.lastReset);
    
    // Reset daily counter
    if (now.getDate() !== lastReset.getDate() || 
        now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear()) {
      metrics.dailyCost = 0;
    }
    
    // Reset monthly counter
    if (now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear()) {
      metrics.monthlyCost = 0;
    }
    
    metrics.lastReset = now.getTime();
  }
  
  /**
   * Saves metrics to storage
   */
  private async saveMetrics(metrics: CostMetrics): Promise<void> {
    await AsyncStorage.setItem(this.COST_KEY, JSON.stringify(metrics));
  }
  
  /**
   * Checks limits and triggers alerts
   */
  private async checkLimitsAndAlert(metrics: CostMetrics, isPremium: boolean): Promise<void> {
    const limits = isPremium ? this.DEFAULT_LIMITS.premium : this.DEFAULT_LIMITS.free;
    
    // Check daily limit
    if (metrics.dailyCost >= limits.daily) {
      this.triggerAlert({
        type: 'limit_reached',
        message: 'Daily AI usage limit reached. Service paused until tomorrow.',
        currentCost: metrics.dailyCost,
        limit: limits.daily
      });
      return;
    }
    
    // Check daily warning threshold
    if (metrics.dailyCost >= limits.daily * limits.warning) {
      this.triggerAlert({
        type: 'warning',
        message: `Approaching daily limit: $${metrics.dailyCost.toFixed(2)} of $${limits.daily}`,
        currentCost: metrics.dailyCost,
        limit: limits.daily
      });
    }
    
    // Check monthly limit
    if (metrics.monthlyCost >= limits.monthly) {
      this.triggerAlert({
        type: 'limit_reached',
        message: 'Monthly AI usage limit reached. Service paused until next month.',
        currentCost: metrics.monthlyCost,
        limit: limits.monthly
      });
      return;
    }
    
    // Check monthly warning threshold
    if (metrics.monthlyCost >= limits.monthly * limits.warning) {
      this.triggerAlert({
        type: 'critical',
        message: `Approaching monthly limit: $${metrics.monthlyCost.toFixed(2)} of $${limits.monthly}`,
        currentCost: metrics.monthlyCost,
        limit: limits.monthly
      });
    }
  }
  
  /**
   * Registers a callback for cost alerts
   */
  onAlert(callback: (alert: UsageAlert) => void): () => void {
    this.alertCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.alertCallbacks.delete(callback);
    };
  }
  
  /**
   * Triggers alert to all registered callbacks
   */
  private triggerAlert(alert: UsageAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
    
    // Also log to console
    console.warn('Cost Alert:', alert);
  }
  
  /**
   * Checks if usage is within limits
   */
  async canMakeRequest(isPremium: boolean): Promise<boolean> {
    const metrics = await this.getMetrics();
    const limits = isPremium ? this.DEFAULT_LIMITS.premium : this.DEFAULT_LIMITS.free;
    
    return metrics.dailyCost < limits.daily && metrics.monthlyCost < limits.monthly;
  }
  
  /**
   * Gets cost summary for display
   */
  async getCostSummary(isPremium: boolean): Promise<{
    daily: { used: number; limit: number; percentage: number };
    monthly: { used: number; limit: number; percentage: number };
    canUse: boolean;
  }> {
    const metrics = await this.getMetrics();
    const limits = isPremium ? this.DEFAULT_LIMITS.premium : this.DEFAULT_LIMITS.free;
    
    return {
      daily: {
        used: metrics.dailyCost,
        limit: limits.daily,
        percentage: (metrics.dailyCost / limits.daily) * 100
      },
      monthly: {
        used: metrics.monthlyCost,
        limit: limits.monthly,
        percentage: (metrics.monthlyCost / limits.monthly) * 100
      },
      canUse: metrics.dailyCost < limits.daily && metrics.monthlyCost < limits.monthly
    };
  }
  
  /**
   * Resets all cost metrics (admin use only)
   */
  async resetMetrics(): Promise<void> {
    const metrics: CostMetrics = {
      totalTokensUsed: 0,
      totalCost: 0,
      dailyCost: 0,
      monthlyCost: 0,
      lastReset: Date.now(),
      warningThreshold: 0.8,
      hardLimit: 1.0
    };
    
    await this.saveMetrics(metrics);
  }
}

export default CostMonitor.getInstance();