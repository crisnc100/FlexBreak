/**
 * Testing utilities for the DeskStretch gamification system
 */

import GamificationSimulator, { 
  SimulationRecord, 
  DailyCycleResult, 
  StreakResult 
} from './GamificationSimulator';

import { runSimulations } from './SimulationRunner';

// Export all the testing tools and types
export {
  GamificationSimulator,
  SimulationRecord,
  DailyCycleResult,
  StreakResult,
  runSimulations
};

// Default export for convenient importing
export default GamificationSimulator; 