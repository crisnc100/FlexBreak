import { NavigationProp, ParamListBase } from '@react-navigation/native';

export type StretchLevel = "beginner" | "intermediate" | "advanced";
export type BodyArea = 
  | 'Hips & Legs'
  | 'Lower Back'
  | 'Upper Back & Chest'
  | 'Shoulders & Arms'
  | 'Neck'
  | 'Full Body';
export type Duration = "5" | "10" | "15";

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
  level: StretchLevel;
}

export interface ProgressEntry {
  date: string;
  area: BodyArea;
  duration: Duration;
  stretchCount?: number; // Number of stretches in the routine
  hidden?: boolean; // Optional property to mark if a routine is hidden from view but still counted in stats
}

export type RootStackParamList = {
  Home: { openSubscription?: boolean } | undefined;
  Routine: RoutineParams;
  Favorites: undefined;
  Progress: undefined;
  Settings: undefined;
  ProgressTesting: undefined;
};

export type AppNavigationProp = NavigationProp<RootStackParamList>; 