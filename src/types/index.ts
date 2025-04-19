import { NavigationProp } from '@react-navigation/native';

export type StretchLevel = 'beginner' | 'intermediate' | 'advanced';
export type BodyArea = 'Full Body' | 'Lower Back' | 'Upper Back & Chest' | 'Neck' | 'Hips & Legs' | 'Shoulders & Arms';
export type Duration = '5' | '10' | '15';

export interface Stretch {
  id: number | string;
  name: string;
  description: string;
  duration: number; // seconds
  tags: BodyArea[];
  level: StretchLevel;
  image: any;
  bilateral?: boolean;
  premium?: boolean;
  hasDemo?: boolean;
  demoVideo?: any;
  demoVideoDuration?: number; // seconds
  demoAudio?: any; // Path to the voice instructions audio file
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

export interface RoutineParams {
  area: BodyArea;
  duration: Duration;
  level?: StretchLevel;
  customStretches?: (Stretch | RestPeriod)[];
  includePremiumStretches?: boolean;
}

export interface ProgressEntry {
  date: string;
  area: BodyArea;
  duration: Duration;
  stretchCount?: number;
  hidden?: boolean;
  customStretches?: { id: number | string; isRest?: boolean }[];
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
  Routine: RoutineParams & { customStretches?: Stretch[] };
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
}

export interface SmartRoutineConfig {
  areas: BodyArea[];
  duration: Duration;
  level: StretchLevel;
  issueType: IssueType;
  isDeskFriendly: boolean;
  postActivity?: string;
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