import AsyncStorage from '@react-native-async-storage/async-storage';

// COST TRACKING: Monitor API usage and costs
export interface CostMetrics {
  totalTokensUsed: number;
  totalCost: number; // In USD
  speechMinutesUsed: number;
  lastReset: number; // Monthly reset timestamp
}

class CostTracker {
  private readonly COSTS = {
    // OpenRouter GPT-3.5 Turbo pricing
    gptInputToken: 0.0000005, // $0.50 per 1M tokens
    gptOutputToken: 0.0000015, // $1.50 per 1M tokens
    
    // Alternative: Llama 3.1 8B (much cheaper)
    llamaToken: 0.00000005, // $0.05 per 1M tokens
    
    // Google Speech-to-Text
    speechPerMinute: 0.024, // After 60 free minutes
    freeSpeechMinutes: 60
  };

  private getKey(): string {
    return '@ai_cost_metrics';
  }

  async getMetrics(): Promise<CostMetrics> {
    try {
      const data = await AsyncStorage.getItem(this.getKey());
      if (data) {
        const metrics = JSON.parse(data);
        
        // Reset monthly if needed
        const now = Date.now();
        const monthAgo = now - (30 * 24 * 60 * 60 * 1000);
        if (metrics.lastReset < monthAgo) {
          return this.resetMetrics();
        }
        
        return metrics;
      }
    } catch (error) {
      console.log('Error loading cost metrics:', error);
    }
    
    return this.resetMetrics();
  }

  private async resetMetrics(): Promise<CostMetrics> {
    const metrics: CostMetrics = {
      totalTokensUsed: 0,
      totalCost: 0,
      speechMinutesUsed: 0,
      lastReset: Date.now()
    };
    
    await AsyncStorage.setItem(this.getKey(), JSON.stringify(metrics));
    return metrics;
  }

  async trackTokenUsage(inputTokens: number, outputTokens: number, model: 'gpt' | 'llama' = 'gpt'): Promise<void> {
    try {
      const metrics = await this.getMetrics();
      
      let cost = 0;
      if (model === 'gpt') {
        cost = (inputTokens * this.COSTS.gptInputToken) + (outputTokens * this.COSTS.gptOutputToken);
      } else {
        cost = (inputTokens + outputTokens) * this.COSTS.llamaToken;
      }
      
      metrics.totalTokensUsed += inputTokens + outputTokens;
      metrics.totalCost += cost;
      
      await AsyncStorage.setItem(this.getKey(), JSON.stringify(metrics));
      
      console.log('Cost Update:', {
        inputTokens,
        outputTokens,
        cost: cost.toFixed(6),
        totalCost: metrics.totalCost.toFixed(6)
      });
    } catch (error) {
      console.error('Error tracking token usage:', error);
    }
  }

  async trackSpeechUsage(minutes: number): Promise<void> {
    try {
      const metrics = await this.getMetrics();
      metrics.speechMinutesUsed += minutes;
      
      // Calculate speech cost (free for first 60 minutes)
      if (metrics.speechMinutesUsed > this.COSTS.freeSpeechMinutes) {
        const billableMinutes = metrics.speechMinutesUsed - this.COSTS.freeSpeechMinutes;
        const speechCost = billableMinutes * this.COSTS.speechPerMinute;
        metrics.totalCost += speechCost;
      }
      
      await AsyncStorage.setItem(this.getKey(), JSON.stringify(metrics));
    } catch (error) {
      console.error('Error tracking speech usage:', error);
    }
  }

  // Estimate costs for different user tiers
  async getProjections(): Promise<{free: number, premium: number}> {
    const avgTokensPerMessage = 100; // Conservative estimate
    
    // Free users: 3 messages per Wednesday = ~12 per month
    const freeMonthlyTokens = 12 * avgTokensPerMessage;
    const freeMonthlyCost = freeMonthlyTokens * this.COSTS.gptInputToken;
    
    // Premium users: 15 messages per day = ~450 per month
    const premiumMonthlyTokens = 450 * avgTokensPerMessage;
    const premiumMonthlyCost = premiumMonthlyTokens * this.COSTS.gptInputToken;
    
    return {
      free: freeMonthlyCost,
      premium: premiumMonthlyCost
    };
  }
}

export default new CostTracker();