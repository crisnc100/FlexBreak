import { Dimensions } from 'react-native';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Game Configuration
export const GAME_CONFIG = {
  DURATION: 60, // seconds
  PATH_SEGMENTS: 50,
  PATH_WIDTH: 80,
  CALIBRATION_SAMPLES: 10,
  UPDATE_INTERVAL: 100, // milliseconds
  MOTION_UPDATE_INTERVAL: 50, // milliseconds
  PROGRESS_SPEED: 0.008,
  SENSITIVITY: 25,
  DAMPENING: 0.8,
  ORB_SIZE: 40,
  PATH_SEGMENT_SIZE: 30,
  
  // Scoring
  BASE_XP: 25,
  MAX_CENTERED_BONUS: 50,
  MAX_SERENITY_BONUS: 25,
  MAX_XP: 100,
  
  // Visual
  PATH_AMPLITUDE: SCREEN_WIDTH * 0.15,
  PATH_FREQUENCY: 3,
  START_Y: SCREEN_HEIGHT * 0.8,
  END_Y: SCREEN_HEIGHT * 0.2,
  
  // Audio
  AMBIENT_VOLUME: 0.3,
  MIN_SERENITY_VOLUME: 0.1,
  MAX_SERENITY_VOLUME: 0.5,
  
  // New visual effects
  INTRO_MESSAGE_DURATION: 3000, // 3 seconds
  ORB_GLOW_RADIUS: 60,
  PATH_GLOW_WIDTH: 40,
  RIPPLE_EFFECT_DURATION: 1000,
  FOG_OPACITY_MAX: 0.6,
  
  // Scoring thresholds
  FULL_BALANCE_THRESHOLD: 0.8, // 80%
  PARTIAL_BALANCE_THRESHOLD: 0.5, // 50%
};

// Messages
export const GAME_MESSAGES = {
  INTRO: "Balance is not stillness. It is movement with control.",
  COMPLETION: {
    FULL_BALANCE: "You moved with breath. You balanced with intent. The center is within reach.",
    PARTIAL_BALANCE: "You found moments of stillness within the flow. Balance grows with practice.",
    RESTLESS: "Every step on the path teaches. Your journey toward center continues."
  }
};

// Balance Categories
export enum BalanceCategory {
  FULL_BALANCE = 'full_balance',
  PARTIAL_BALANCE = 'partial_balance', 
  RESTLESS = 'restless'
}

// Types
export interface ZenBalanceProps {
  onGameComplete: (score: number, xpEarned: number) => void;
  onSkip: () => void;
  context?: 'routine' | 'home';
}

export interface MotionData {
  x: number;
  y: number;
}

export interface OrbPosition {
  x: number;
  y: number;
}

export interface PathPoint {
  x: number;
  y: number;
}

export interface GameState {
  showInstructions: boolean;
  isCalibrating: boolean;
  gameActive: boolean;
  timeLeft: number;
  score: number;
  centeredTime: number;
  gameComplete: boolean;
  showExitAlert: boolean;
  showIntroMessage: boolean;
  balanceCategory: BalanceCategory;
}

export interface MotionState {
  motionAvailable: boolean;
  motionPermissionGranted: boolean;
  calibratedX: number;
  calibratedY: number;
  currentTilt: MotionData;
  rawMotion: { beta: number; gamma: number };
  calibrationSamples: MotionData[];
}

export interface OrbState {
  orbPosition: OrbPosition;
  pathProgress: number;
  isCentered: boolean;
  serenityLevel: number;
  testModeActive: boolean;
  horizontalOffset: number;
  offPathTime: number; // Track time spent off path for ripple effects
}

export interface VisualEffects {
  rippleOpacity: number;
  fogOpacity: number;
  orbDimming: number;
  showCompletionSymbol: boolean;
} 