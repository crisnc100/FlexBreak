import { NavigationProp } from '@react-navigation/native';

export type StretchLevel = 'beginner' | 'intermediate' | 'advanced';
export type BodyArea = 'Full Body' | 'Lower Back' | 'Upper Back & Chest' | 'Neck' | 'Hips & Legs' | 'Shoulders & Arms';
export type Duration = '5' | '10' | '15';

export interface Stretch {
  id: number;
  name: string;
  description: string;
  duration: number; // seconds
  tags: BodyArea[];
  level: StretchLevel;
  image: any; // image require
  bilateral?: boolean; // Whether the stretch needs to be performed on both sides
}

export interface Tip {
  id: number;
  text: string;
}

export interface RoutineParams {
  area: BodyArea;
  duration: Duration;
  level?: StretchLevel;
  customStretches?: Stretch[]; // Optional array of custom stretches for the routine
}

export interface ProgressEntry {
  date: string;
  area: BodyArea;
  duration: Duration;
  stretchCount?: number; // Number of stretches in the routine
  hidden?: boolean; // Optional property to mark if a routine is hidden from view but still counted in stats
}

export type RootStackParamList = {
  Home: undefined;
  Routine: RoutineParams & {
    customStretches?: Stretch[];
  };
  Progress: undefined;
  Favorites: undefined;
  Testing: undefined;
};

export type AppNavigationProp = NavigationProp<RootStackParamList>; 