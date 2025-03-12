/**
 * Utility functions for monitoring performance in the app
 */

// Store operation timings
const operationTimings: Record<string, number[]> = {};

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