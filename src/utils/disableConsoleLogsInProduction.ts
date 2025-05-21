/**
 * This utility disables all console logs in production
 * to improve performance and prevent debug information leakage.
 */

import { Platform } from 'react-native';

/**
 * Call this function at app startup to disable console logs in production
 * It preserves the console object behavior in development mode.
 */
export function disableConsoleLogsInProduction() {
  if (!__DEV__) {
    // Save original console methods
    const originalConsole = {
      log: console.log,
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error
    };

    // Replace with no-op functions in production
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    
    // Keep error and warning methods only on iOS simulator for critical issues
    // On actual devices and in production these will be no-ops
    if (!(Platform.OS === 'ios' && Platform.constants.isMacCatalyst)) {
      console.warn = () => {};
      console.error = () => {};
    } else {
      // For iOS simulator, keep some minimal error logging to help debug critical issues 
      console.warn = (...args) => {
        // Only log first argument and simple messages to minimize output
        if (typeof args[0] === 'string') {
          originalConsole.warn('[WARNING]', args[0]);
        }
      };
      
      console.error = (...args) => {
        // Only log first argument and simple messages to minimize output
        if (typeof args[0] === 'string') {
          originalConsole.error('[ERROR]', args[0]);
        }
      };
    }
  }
} 