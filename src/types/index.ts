import { NavigationProp } from '@react-navigation/native';

export type Position = 'All' | 'Standing' | 'Sitting' | 'Lying' | 'Sitting,Standing';
export type BodyArea = 'Full Body' | 'Lower Back' | 'Upper Back & Chest' | 'Neck' | 'Hips & Legs' | 'Shoulders & Arms' | 'Dynamic Flow';
export type Duration = '5' | '10' | '15';

export interface Stretch {
  id: number | string;
  name: string;
  description: string;
  duration: number; // seconds
  tags: BodyArea[];
  position: Position;
  image: number | { uri: string; __video?: boolean } | { __video: true; uri: string }; // Support for images and MP4 videos
  bilateral?: boolean;
  premium?: boolean;
  hasDemo?: boolean;
  demoVideo?: number | { uri: string };
  demoVideoDuration?: number; // seconds
  demoAudio?: number | { uri: string }; // Path to the voice instructions audio file
}

export interface CustomRestPeriod {
  id: string;
  name: string;
  description: string;
  duration: number;
  isRest: true;
}

export interface Tip {
  id: number;
  text: string;
}

export interface RestPeriod {
  id: string;
  name: string;
  description: string;
  duration: number;
  isRest: true;
}

export interface TransitionPeriod {
  id: string;
  name: string;
  description: string;
  duration: number;
  isTransition: true;
}

export interface RoutineParams {
  area: BodyArea;
  duration: Duration;
  position: Position;
  customStretches?: (Stretch | RestPeriod)[];
  includePremiumStretches?: boolean;
  transitionDuration?: number; // Duration in seconds (0-10)
}

export interface ProgressEntry {
  date: string;
  area: BodyArea;
  duration: Duration;
  stretchCount?: number;
  hidden?: boolean;
  favorite?: boolean;
  customStretches?: { id: number | string; isRest?: boolean }[];
  position?: Position;
  savedStretches?: any[]; // Array of stretches saved with the routine
}

// Gamification Types
export interface UserProgress {
  totalXP: number;
  level: number;
  statistics: {
    totalRoutines: number;
    currentStreak: number;
    bestStreak: number;
    uniqueAreas: string[];
    totalMinutes: number;
    routinesByArea: Record<string, number>;
    lastUpdated?: string;
    processedToday?: boolean;
    lastProcessedDate?: string;
    streakState?: string;
  };
  challenges: Record<string, Challenge>;
  achievements: Record<string, Achievement>;
  rewards: Record<string, Reward>;
  lastDailyChallengeCheck?: string;
  lastUpdated: string;
  _version?: number; // Version counter to prevent race conditions
  xpHistory?: Array<{
    id: string;
    amount: number;
    source: string;
    timestamp: string;
    details?: string;
    claimed: boolean;
  }>;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  requirement: number;
  xp: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  startDate: string;
  endDate: string;
  category: string;
  gracePeriodEnds?: string;
  status?: 'active' | 'completed' | 'claimed' | 'expired';
  lastResetDate?: string;
  history?: Array<{completedDate: string; claimedDate?: string; xpEarned: number}>;
  expiryWarning?: boolean;
  timeRange?: { start: number; end: number };
  area?: string;
  areaTarget?: string;
  data?: Record<string, any>;
  dateClaimed?: string;
  dateCompleted?: string;
  failureReason?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: string;
  requirement: number;
  xp: number;
  progress: number;
  completed: boolean;
  icon: string;
  category: string;
  uiCategory?: string;
  area?: string;
  dateCompleted?: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  levelRequired: number;
  type: string;
  unlocked: boolean;
  icon: string;
}

export interface Level {
  level: number;
  xpRequired: number;
  title: string;
}

export type RootStackParamList = {
  Home: undefined;
  Routine: RoutineParams;
  Progress: undefined;
  Favorites: undefined;
  Testing: undefined;
};

export type AppNavigationProp = NavigationProp<RootStackParamList>;

export type IssueType = 'stiffness' | 'pain' | 'tiredness' | 'flexibility';

export interface SmartRoutineInput {
  rawInput: string;
  parsedArea?: BodyArea[];
  parsedIssue?: IssueType;
  parsedActivity?: string;
  parsedPosition?: Position;
}

export interface SmartRoutineConfig {
  areas: BodyArea[];
  duration: Duration;
  position: Position;
  issueType: IssueType;
  isDeskFriendly: boolean;
  postActivity?: string;
  transitionDuration?: number;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  duration: number;
  focusArea: string;
  image: { uri: string };
  stretchIds: number[];
  stretchDurations: Record<number, number>;
}