import { NavigationProp, ParamListBase } from '@react-navigation/native';

export type StretchLevel = "beginner" | "intermediate" | "advanced";
export type BodyArea = "hips" | "back" | "shoulders" | "neck" | "full body";
export type Duration = "5" | "10" | "15";

export interface Stretch {
  id: number;
  name: string;
  description: string;
  duration: number; // seconds
  tags: BodyArea[];
  level: StretchLevel;
  image: any; // image require
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
}

export type AppNavigationProp = NavigationProp<ParamListBase>; 