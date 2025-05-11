import AsyncStorage from '@react-native-async-storage/async-storage';
import * as storageDiagnostics from './storageDiagnostics';
import * as performance from './performance';
import { Platform } from 'react-native';

// Constants for health score calculation
const STORAGE_THRESHOLD_WARNING = 3 * 1024 * 1024; // 3MB
const STORAGE_THRESHOLD_CRITICAL = 5 * 1024 * 1024; // 5MB
const OPERATION_SPEED_THRESHOLD_WARNING = 300; // ms
const OPERATION_SPEED_THRESHOLD_CRITICAL = 500; // ms
const STARTUP_TIME_THRESHOLD_WARNING = 2000; // ms
const STARTUP_TIME_THRESHOLD_CRITICAL = 5000; // ms

export interface AppHealthScore {
  score: number; // 0-100
  storageHealth: number; // 0-100
  performanceHealth: number; // 0-100
  startupHealth: number; // 0-100
  issues: AppHealthIssue[];
  lastChecked: string;
}

export interface AppHealthIssue {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  autoFixAvailable: boolean;
  fixAction?: string;
}

// Get app health score
export const getAppHealthScore = async (): Promise<AppHealthScore> => {
  try {
    // Get storage stats
    const storageStats = await storageDiagnostics.getStorageStats();
    
    // Get performance stats
    const performanceStats = performance.getAllOperationStats();
    
    // Get app state metrics
    const appStateMetrics = performance.getAppStatePerformance();
    
    // Calculate storage health (0-100)
    let storageHealth = 100;
    if (storageStats.totalSize > STORAGE_THRESHOLD_CRITICAL) {
      storageHealth = 30; // Critical
    } else if (storageStats.totalSize > STORAGE_THRESHOLD_WARNING) {
      storageHealth = 60; // Warning
    }
    
    // Calculate performance health (0-100)
    let slowOperationsCount = 0;
    let totalOperations = 0;
    let performanceHealth = 100;
    
    Object.values(performanceStats).forEach(stat => {
      if (stat.count > 0) {
        totalOperations++;
        if (stat.average > OPERATION_SPEED_THRESHOLD_CRITICAL) {
          slowOperationsCount += 2; // Count critical as 2 issues
        } else if (stat.average > OPERATION_SPEED_THRESHOLD_WARNING) {
          slowOperationsCount += 1;
        }
      }
    });
    
    if (totalOperations > 0) {
      // Reduce score based on proportion of slow operations
      const slowRatio = slowOperationsCount / (totalOperations * 2); // Max 2 per operation
      performanceHealth = Math.max(40, 100 - Math.floor(slowRatio * 100));
    }
    
    // Calculate startup health (0-100)
    let startupHealth = 100;
    let mainAppRenderTime = 0;
    
    // Check if we have render times for main components
    if (appStateMetrics.componentRenderStats && 
        appStateMetrics.componentRenderStats['MainApp'] && 
        appStateMetrics.componentRenderStats['MainApp'].time) {
      
      mainAppRenderTime = appStateMetrics.componentRenderStats['MainApp'].time;
      
      if (mainAppRenderTime > STARTUP_TIME_THRESHOLD_CRITICAL) {
        startupHealth = 40; // Critical startup time
      } else if (mainAppRenderTime > STARTUP_TIME_THRESHOLD_WARNING) {
        startupHealth = 70; // Warning startup time
      }
    }
    
    // Detect issues
    const issues: AppHealthIssue[] = [];
    
    // Storage issues
    if (storageStats.totalSize > STORAGE_THRESHOLD_CRITICAL) {
      issues.push({
        id: 'storage-critical',
        type: 'critical',
        title: 'Storage usage very high',
        description: `Your app is using ${storageDiagnostics.formatBytes(storageStats.totalSize)} of storage, which may slow down your experience.`,
        autoFixAvailable: true,
        fixAction: 'optimizeStorage'
      });
    } else if (storageStats.totalSize > STORAGE_THRESHOLD_WARNING) {
      issues.push({
        id: 'storage-warning',
        type: 'warning',
        title: 'Storage usage high',
        description: `Your app is using ${storageDiagnostics.formatBytes(storageStats.totalSize)} of storage.`,
        autoFixAvailable: true,
        fixAction: 'optimizeStorage'
      });
    }
    
    // Performance issues - slow operations
    const slowOps = Object.entries(performanceStats)
      .filter(([_, stat]) => stat.average > OPERATION_SPEED_THRESHOLD_WARNING)
      .sort(([_, a], [__, b]) => b.average - a.average)
      .slice(0, 3); // Top 3 slowest
    
    if (slowOps.length > 0) {
      const slowestOp = slowOps[0];
      if (slowestOp[1].average > OPERATION_SPEED_THRESHOLD_CRITICAL) {
        issues.push({
          id: 'performance-critical',
          type: 'critical',
          title: 'App operations running slowly',
          description: `Some app functions are taking longer than expected. This might affect your experience.`,
          autoFixAvailable: true,
          fixAction: 'clearPerformanceData'
        });
      } else {
        issues.push({
          id: 'performance-warning',
          type: 'warning',
          title: 'App could be faster',
          description: `Some operations could be running faster.`,
          autoFixAvailable: true,
          fixAction: 'clearPerformanceData'
        });
      }
    }
    
    // Startup time issues
    if (mainAppRenderTime > STARTUP_TIME_THRESHOLD_CRITICAL) {
      issues.push({
        id: 'startup-critical',
        type: 'critical',
        title: 'App startup is very slow',
        description: `App took ${(mainAppRenderTime/1000).toFixed(1)} seconds to start. Try restarting or clearing app data.`,
        autoFixAvailable: true,
        fixAction: 'restartApp'
      });
    } else if (mainAppRenderTime > STARTUP_TIME_THRESHOLD_WARNING) {
      issues.push({
        id: 'startup-warning',
        type: 'warning',
        title: 'App startup could be faster',
        description: `App took ${(mainAppRenderTime/1000).toFixed(1)} seconds to start.`,
        autoFixAvailable: true,
        fixAction: 'restartApp'
      });
    }
    
    // Background transitions issues
    if (appStateMetrics.backgroundStats.count > 0 && 
        appStateMetrics.backgroundStats.average > 5 * 60 * 1000) { // 5 minutes average
      issues.push({
        id: 'background-info',
        type: 'info',
        title: 'App frequently in background for long periods',
        description: 'Your app is often left in background, which may impact battery usage and performance.',
        autoFixAvailable: false
      });
    }
    
    // Calculate overall health score (weighted average)
    const score = Math.floor(
      storageHealth * 0.5 + 
      performanceHealth * 0.3 + 
      startupHealth * 0.2
    );
    
    return {
      score,
      storageHealth,
      performanceHealth,
      startupHealth,
      issues,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error calculating app health score:', error);
    return {
      score: 50, // Default middle score when we can't calculate
      storageHealth: 50,
      performanceHealth: 50,
      startupHealth: 50,
      issues: [{
        id: 'error-calculating',
        type: 'info',
        title: 'Unable to calculate complete health score',
        description: 'We encountered an issue while checking your app health.',
        autoFixAvailable: false
      }],
      lastChecked: new Date().toISOString()
    };
  }
};

// Fix storage issues by optimizing storage
export const fixStorageIssues = async (): Promise<{
  success: boolean;
  message: string;
  beforeScore?: number;
  afterScore?: number;
}> => {
  try {
    // Get health score before
    const beforeHealth = await getAppHealthScore();
    
    // Run storage optimization
    await storageDiagnostics.optimizeStorage();
    
    // Run cache cleanup
    await cleanupAppCache();
    
    // Get health score after
    const afterHealth = await getAppHealthScore();
    
    return {
      success: true,
      message: `App health improved from ${beforeHealth.score}% to ${afterHealth.score}%`,
      beforeScore: beforeHealth.score,
      afterScore: afterHealth.score
    };
  } catch (error) {
    console.error('Error fixing storage issues:', error);
    return {
      success: false,
      message: 'Failed to fix storage issues. Please try again later.'
    };
  }
};

// Clear app cache
export const cleanupAppCache = async (): Promise<void> => {
  try {
    // Get all keys
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Find cache keys - typically contain 'cache' in the name
    const cacheKeys = allKeys.filter(key => 
      key.toLowerCase().includes('cache') || 
      key.toLowerCase().includes('temp')
    );
    
    // Remove cache keys
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`Cleared ${cacheKeys.length} cache items`);
    }
  } catch (error) {
    console.error('Error cleaning app cache:', error);
  }
};

// Get simple recommendation based on health score
export const getHealthRecommendation = (score: number): string => {
  if (score < 50) {
    return 'Your app needs optimization. Try clicking "Fix All Issues" below.';
  } else if (score < 80) {
    return 'Your app could use some improvements for better performance.';
  } else {
    return 'Your app is running well! No action needed.';
  }
};

// Fix all detected issues
export const fixAllIssues = async (): Promise<{
  success: boolean;
  message: string;
  beforeScore?: number;
  afterScore?: number;
}> => {
  try {
    // Get health score before
    const beforeHealth = await getAppHealthScore();
    
    // Run storage optimization
    await storageDiagnostics.optimizeStorage();
    
    // Run cache cleanup
    await cleanupAppCache();
    
    // Clear performance data
    performance.clearPerformanceData();
    
    // Get health score after
    const afterHealth = await getAppHealthScore();
    
    return {
      success: true,
      message: `App health improved from ${beforeHealth.score}% to ${afterHealth.score}%`,
      beforeScore: beforeHealth.score,
      afterScore: afterHealth.score
    };
  } catch (error) {
    console.error('Error fixing all issues:', error);
    return {
      success: false,
      message: 'Failed to fix all issues. Please try again later.'
    };
  }
}; 