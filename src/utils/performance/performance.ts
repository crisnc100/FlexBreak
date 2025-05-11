/**
 * Utility functions for monitoring performance in the app
 */

// Store operation timings
const operationTimings: Record<string, number[]> = {};

// Store app state change metrics
const appStateTimings: {
  lastActiveTimestamp: number | null;
  backgroundDurations: number[];
  appStartTime: number | null;
  componentRenderTimes: Record<string, number[]>;
} = {
  lastActiveTimestamp: null,
  backgroundDurations: [],
  appStartTime: null,
  componentRenderTimes: {}
};

/**
 * Measures the execution time of an async operation
 * 
 * @param operationName A name to identify the operation
 * @param operation The async function to measure
 * @returns The result of the operation
 */
export async function measureAsyncOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Store the timing
    if (!operationTimings[operationName]) {
      operationTimings[operationName] = [];
    }
    operationTimings[operationName].push(duration);
    
    // Log if it's slow (over 500ms)
    if (duration > 500) {
      console.warn(`Slow operation detected: ${operationName} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const endTime = Date.now();
    console.error(`Error in ${operationName} after ${endTime - startTime}ms:`, error);
    throw error;
  }
}

/**
 * Gets performance statistics for a specific operation
 * 
 * @param operationName The name of the operation
 * @returns Performance statistics for the operation
 */
export function getOperationStats(operationName: string) {
  const timings = operationTimings[operationName] || [];
  
  if (timings.length === 0) {
    return {
      count: 0,
      average: 0,
      min: 0,
      max: 0,
    };
  }
  
  const sum = timings.reduce((acc, time) => acc + time, 0);
  const average = sum / timings.length;
  const min = Math.min(...timings);
  const max = Math.max(...timings);
  
  return {
    count: timings.length,
    average,
    min,
    max,
  };
}

/**
 * Gets performance statistics for all operations
 * 
 * @returns Performance statistics for all operations
 */
export function getAllOperationStats() {
  const stats: Record<string, ReturnType<typeof getOperationStats>> = {};
  
  Object.keys(operationTimings).forEach(operationName => {
    stats[operationName] = getOperationStats(operationName);
  });
  
  return stats;
}

/**
 * Clears all stored performance data
 */
export function clearPerformanceData() {
  Object.keys(operationTimings).forEach(key => {
    delete operationTimings[key];
  });
  
  appStateTimings.backgroundDurations = [];
  appStateTimings.componentRenderTimes = {};
}

/**
 * Logs performance statistics to the console
 */
export function logPerformanceStats() {
  const stats = getAllOperationStats();
  console.log('=== Performance Statistics ===');
  
  Object.entries(stats).forEach(([operation, stat]) => {
    console.log(`${operation}:
  Count: ${stat.count}
  Avg: ${stat.average.toFixed(2)}ms
  Min: ${stat.min}ms
  Max: ${stat.max}ms`);
  });
  
  console.log('=============================');
}

/**
 * Track app going to the background
 */
export function trackAppBackground() {
  appStateTimings.lastActiveTimestamp = Date.now();
}

/**
 * Track app coming to the foreground
 */
export function trackAppForeground() {
  if (appStateTimings.lastActiveTimestamp) {
    const now = Date.now();
    const duration = now - appStateTimings.lastActiveTimestamp;
    appStateTimings.backgroundDurations.push(duration);
    appStateTimings.lastActiveTimestamp = null;
    
    // If it was in background for longer than 5 minutes, log it
    if (duration > 5 * 60 * 1000) {
      console.log(`App was in background for ${(duration / 1000 / 60).toFixed(1)} minutes`);
    }
  }
}

/**
 * Mark app start time
 */
export function markAppStart() {
  appStateTimings.appStartTime = Date.now();
}

/**
 * Mark component render time
 */
export function markComponentRender(componentName: string) {
  const now = Date.now();
  
  if (appStateTimings.appStartTime) {
    const duration = now - appStateTimings.appStartTime;
    
    if (!appStateTimings.componentRenderTimes[componentName]) {
      appStateTimings.componentRenderTimes[componentName] = [];
    }
    
    appStateTimings.componentRenderTimes[componentName].push(duration);
    
    // Log first render time
    if (appStateTimings.componentRenderTimes[componentName].length === 1) {
      console.log(`Component ${componentName} first render: ${duration}ms after app start`);
    }
  }
}

/**
 * Get app state performance metrics
 */
export function getAppStatePerformance() {
  const backgroundStats = appStateTimings.backgroundDurations.length > 0 
    ? {
      count: appStateTimings.backgroundDurations.length,
      average: appStateTimings.backgroundDurations.reduce((a, b) => a + b, 0) / appStateTimings.backgroundDurations.length,
      max: Math.max(...appStateTimings.backgroundDurations),
      min: Math.min(...appStateTimings.backgroundDurations),
    }
    : { count: 0, average: 0, max: 0, min: 0 };
    
  const componentRenderStats: Record<string, { time: number }> = {};
  
  Object.entries(appStateTimings.componentRenderTimes).forEach(([component, times]) => {
    if (times.length > 0) {
      componentRenderStats[component] = {
        time: times[0] // First render time
      };
    }
  });
  
  return {
    backgroundStats,
    componentRenderStats,
    appStartTime: appStateTimings.appStartTime
  };
} 